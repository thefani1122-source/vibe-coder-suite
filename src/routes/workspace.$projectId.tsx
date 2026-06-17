import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { Group, Panel, Separator, usePanelRef, type PanelImperativeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type BuildMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { E2BPreview } from "@/components/E2BPreview";
import { HistoryPanel } from "@/components/HistoryPanel";
import { createBuildSocket } from "@/lib/websocket";
import {
  apiGet, apiPost,
  clarifyPrompt,
  type ClarifyQuestion, type ClarifyResponse, type QuestionAnswer,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import {
  ArrowUp, ChevronDown, Lamp, Zap, Plus,
  RotateCw, Monitor, Smartphone, Tablet,
  Search, Copy, Check, Globe, Code2,
  History, PanelLeft, PanelLeftClose, PanelLeftOpen, FileText, Github, Download,
  Square, ExternalLink, Link2, Figma, X, Settings,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
    mode: search.mode === "plan" || search.mode === "fast" ? (search.mode as "plan" | "fast") : undefined,
  }),
  component: WorkspacePage,
});

type BuildStatus = "running" | "complete" | "error";
type ActiveTab  = "preview" | "code";
type Device     = "desktop" | "mobile" | "tablet";

type McpEventKind = "thinking" | "tool_call" | "tool_result" | "done";
interface McpEvent {
  id: string;
  kind: McpEventKind;
  tool?: string;
  text?: string;
  success?: boolean;
  summary?: string;
}

const DEVICE_CYCLE: Device[] = ["desktop", "mobile", "tablet"];

function toolToAgent(tool: string): string {
  if (/file|write|create/i.test(tool)) return "frontend";
  if (/deploy|publish/i.test(tool))    return "deploy";
  if (/db|sql|database/i.test(tool))   return "db";
  if (/test|security|verify/i.test(tool)) return "security";
  return "connection";
}

function newMsg(partial: Omit<BuildMessage, "id">): BuildMessage {
  return { id: crypto.randomUUID(), ...partial };
}

function closeStreaming(prev: BuildMessage[]): BuildMessage[] {
  if (!prev.length || !prev[prev.length - 1].streaming) return prev;
  return [...prev.slice(0, -1), { ...prev[prev.length - 1], streaming: false }];
}

const AGENT_LABELS: Record<string, string> = {
  planning:   "Analyzing UI patterns…",
  frontend:   "Polishing UI: gradient borders, skeletons, avatars",
  db:         "Wiring up the database…",
  security:   "Running security & verification…",
  deploy:     "Preparing deployment…",
  connection: "Working on it…",
};

// Pipeline status messages emitted by the backend — never real AI thinking.
// FALLBACK ONLY: classifies a build:thinking event when the backend hasn't
// sent the `internal` boolean flag yet (see the build:thinking handler below,
// which prefers `data.internal` and only falls back to these patterns when
// that field is absent).
//
// FRAGILE: These patterns must stay in sync with stream-handler.ts on the backend.
// TODO(backend): Always send `internal: true` on pipeline/status messages and
// `internal: false` on real AI thinking — once every event carries the flag,
// this regex list can be deleted entirely.
const HARDCODED_PATTERNS: RegExp[] = [
  /^Building:/i,
  /^Starting new build/i,
  /^Calling AI model/i,
  /^Analyzing your prompt and planning the build/i,
  /^Finalizing and preparing preview/i,
  /^Writing files\.\.\./i,
  /^Writing src\/.+\(\d+ lines/i,
  /^Editing existing project/i,
];

// Paths that indicate a fullstack build requiring the E2B sandbox preview instead of Sandpack.
const BACKEND_PATH_RE = [/^src\/server\//, /^src\/db\//, /^src\/lib\/api\./];
function hasBackendFiles(files: Record<string, string>): boolean {
  return Object.keys(files).some(p => BACKEND_PATH_RE.some(r => r.test(p)));
}

// Heuristic truncation check — flags code files that don't end with a closing
// brace or JSX tag, a strong signal the AI was cut off mid-file (e.g. token limit).
const CODE_FILE_RE = /\.(tsx?|jsx?|css|json)$/;
function looksTruncated(path: string, content: string): boolean {
  if (!CODE_FILE_RE.test(path)) return false;
  const trimmed = content.trimEnd();
  return trimmed.length > 0 && !/[}>]$/.test(trimmed);
}


// ── Business context ─────────────────────────────────────────────────────────

type BusinessContext = {
  appDescription?: string;
  userType?: string;
  isMultiTenant?: boolean;
  hasPaidFeatures?: boolean;
  industry?: string;
};

function hasFilledContext(bc: BusinessContext): boolean {
  return !!(bc.appDescription || bc.userType || bc.industry ||
    bc.isMultiTenant !== undefined || bc.hasPaidFeatures !== undefined);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Page                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function WorkspacePage() {
  const { projectId } = Route.useParams();
  const { sessionId }  = Route.useSearch();

  const [messages,     setMessages]     = useState<BuildMessage[]>([]);
  const [files,        setFiles]        = useState<Record<string, string>>({});
  const [newFiles,     setNewFiles]     = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [buildStatus,  setBuildStatus]  = useState<BuildStatus>("running");
  const [currentAgent, setCurrentAgent] = useState<string | undefined>();
  const [activeTab,    setActiveTab]    = useState<ActiveTab>("preview");
  const [device,       setDevice]       = useState<Device>("desktop");
  const [reloadKey,    setReloadKey]    = useState(0);
  const [projectName,  setProjectName]  = useState<string>("");
  const [chatCollapsed,  setChatCollapsed]  = useState(false);
  const [showHistory,    setShowHistory]    = useState(false);
  const [activityStatus, setActivityStatus] = useState<string | null>(null);
  const [isFullstack, setIsFullstack] = useState(false);

  // E2B preview state — the backend creates the E2B sandbox and emits the
  // public preview URL via Socket.IO. The iframe loads it directly: no Service
  // Workers, no COEP headers, no cross-origin isolation required.
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState<string | null>(null);

  const [mcpEvents,   setMcpEvents]   = useState<McpEvent[]>([]);
  const [isMcpActive, setIsMcpActive] = useState(false);

  const [clarifyQuestions,     setClarifyQuestions]     = useState<ClarifyQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionAnswers,      setQuestionAnswers]       = useState<QuestionAnswer[]>([]);
  const [showClarifyModal,     setShowClarifyModal]     = useState(false);
  const [isClarifying,         setIsClarifying]         = useState(false);
  const [selectedOptions,      setSelectedOptions]      = useState<Set<string>>(new Set());
  const [customText,           setCustomText]           = useState("");

  const [businessContext,   setBusinessContext]   = useState<BusinessContext>({});
  const [showContextPanel,  setShowContextPanel]  = useState(false);

  const socketRef          = useRef<Socket | null>(null);
  const completedRef       = useRef(false);
  const filesRef           = useRef<Record<string, string>>({});
  const currentSessionIdRef = useRef<string | undefined>(sessionId);
  const chatPanelRef        = usePanelRef();
  const pendingPromptRef    = useRef<string>("");
  const rebuildFnRef        = useRef<(() => void) | null>(null);

  // Fetch project name with auth via apiGet (handles token automatically).
  // API returns { project: { name, description } }; fall back to flat shapes.
  useEffect(() => {
    apiGet<{ project?: { name?: string; description?: string; businessContext?: BusinessContext }; name?: string; title?: string }>(
      `/api/projects/${projectId}`,
      { silent: true },
    )
      .then(d => {
        const name = d?.project?.name ?? d?.name ?? d?.title;
        if (name) setProjectName(name);
        const bc = d?.project?.businessContext;
        if (bc && typeof bc === "object") setBusinessContext(bc);
      })
      .catch(() => {});
  }, [projectId]);

  // F3: Show a toast when the build socket fails to connect at all.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      console.error("[Workspace] Socket connection failed:", detail.message);
      toast.error("Build server connection failed. Check your connection and try again.");
    };
    window.addEventListener("socket:connection_failed", handler);
    return () => window.removeEventListener("socket:connection_failed", handler);
  }, []);

  // F5: Emit cancel-build to the backend and wait for build:cancelled confirmation.
  const handleStopBuild = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      toast.error("No active build connection to stop");
      return;
    }
    socket.emit("cancel-build", { sessionId: currentSessionIdRef.current });
    toast("Stopping build…");
  }, []);

  const registerHandlers = useCallback((socket: Socket) => {
    socket.on("build:prompt", (data: { text?: string; prompt?: string }) => {
      const t = (data.text ?? data.prompt ?? "").trim();
      if (!t) return;
      setMessages(prev =>
        prev.some(m => m.role === "user")
          ? prev
          : [newMsg({ type: "text", text: t, role: "user" }), ...prev],
      );
    });

    socket.on("build:thinking", (data: { text?: string; content?: string; internal?: boolean }) => {
      completedRef.current = false;
      setCurrentAgent("planning");
      const chunk = data.text ?? data.content ?? "";
      if (!chunk.trim()) return;

      // Route system/pipeline messages to activityStatus; real AI thinking goes to chat.
      // Prefer the explicit `internal` flag from the backend; only fall back to
      // pattern-matching when the backend hasn't sent the flag yet.
      const isInternal = typeof data.internal === "boolean"
        ? data.internal
        : HARDCODED_PATTERNS.some(p => p.test(chunk.trim()));
      if (isInternal) {
        setActivityStatus(chunk.trim());
        return;
      }

      // Clear any lingering status chip when real thinking arrives.
      setActivityStatus(null);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === "thinking" && last.streaming) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, text: m.text + chunk } : m,
          );
        }
        return [...closeStreaming(prev), newMsg({ type: "thinking", text: chunk, streaming: true })];
      });
    });

    socket.on("build:token", (data: { text?: string; token?: string }) => {
      const text = data.text ?? data.token ?? "";
      if (!text) return;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === "thinking" && last.streaming) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, text: m.text + text } : m,
          );
        }
        return [...prev, newMsg({ type: "thinking", text, streaming: true })];
      });
      setCurrentAgent(a => a ?? "planning");
    });

    socket.on("build:tool_call", (data: { tool?: string; name?: string }) => {
      const tool = data.tool ?? data.name ?? "tool";
      setCurrentAgent(toolToAgent(tool));
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "tool_call", text: tool, tool, done: false }),
      ]);
    });

    socket.on("build:tool_result", () => {
      setMessages(prev => {
        const ri = [...prev].reverse().findIndex(m => m.type === "tool_call" && !m.done);
        if (ri === -1) return prev;
        const idx = prev.length - 1 - ri;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], done: true };
        return updated;
      });
    });

    socket.on("build:file_writing", (data: { filename?: string; path?: string }) => {
      const filename = data.filename ?? data.path ?? ""
      if (!filename) return
      setMessages(prev => {
        const withoutPrev = prev.filter(m => !(m.type === "file_writing" && m.path === filename))
        return [...withoutPrev, newMsg({ type: "file_writing", text: filename, path: filename })]
      })
    })

    socket.on("build:file_done", (data: { filename?: string; path?: string }) => {
      const filename = data.filename ?? data.path ?? ""
      if (!filename) return
      setMessages(prev => prev.filter(m => !(m.type === "file_writing" && m.path === filename)))
    })

    socket.on(
      "build:file_write",
      (data: { path?: string; file?: string; content?: string; code?: string }) => {
        const path = data.path ?? data.file ?? "file";
        const code = data.content ?? data.code ?? "";
        const isUpdate = !!filesRef.current[path];
        console.log(`[FRONTEND] ${isUpdate ? "Updating" : "Adding"} file:`, path);
        filesRef.current = { ...filesRef.current, [path]: code };
        setFiles(prev => ({ ...prev, [path]: code }));
        setNewFiles(prev => new Set([...prev, path]));
        setSelectedFile(prev => prev ?? path);
        setCurrentAgent("frontend");
        // Only add a chat pill for the first write of each path — prevents duplicate pills
        // when the backend emits the same file more than once.
        setMessages(prev => {
          if (prev.some(m => m.type === "file_write" && m.path === path)) return prev;
          return [...closeStreaming(prev), newMsg({ type: "file_write", text: path, path })];
        });
      },
    );

    socket.on("build:complete", (data?: { files?: Record<string, string>; summary?: string; totalFiles?: number }) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setActivityStatus(null);

      // Merge build:complete files into what file_write events already accumulated.
      // Never overwrite — file_write events may have newer content for the same path.
      let mergedFiles = { ...filesRef.current };
      let addedCount = 0;
      if (data?.files) {
        for (const [path, content] of Object.entries(data.files)) {
          if (!mergedFiles[path]) {
            mergedFiles[path] = content;
            addedCount++;
          }
        }
      }
      console.log(
        "[FRONTEND] build:complete received:",
        Object.keys(data?.files ?? {}),
        "| existing:", Object.keys(filesRef.current).length,
        "| new additions:", addedCount,
      );
      filesRef.current = mergedFiles;
      setFiles(mergedFiles);
      setSelectedFile(prev => prev ?? Object.keys(mergedFiles)[0] ?? null);

      const count = Object.keys(mergedFiles).length;
      const summaryText = data?.summary ||
        `Built your app with ${count > 0 ? count : "your"} files. Preview is live on the right — click Code to explore.`
      setBuildStatus("complete");
      setCurrentAgent(undefined);
      setNewFiles(new Set());
      setActiveTab("preview");
      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== "file_writing")
        return [
          ...closeStreaming(filtered),
          newMsg({
            type: "assistant",
            text: summaryText,
            files: Object.keys(mergedFiles).slice(0, 8),
          }),
        ]
      });
      // Detect fullstack builds from file paths — fallback if build:backend_ready wasn't fired.
      if (hasBackendFiles(mergedFiles)) setIsFullstack(true);

    });

    socket.on("build:warning", ({ message, truncated }: { message: string; truncated?: boolean }) => {
      if (truncated) {
        toast.warning("⚠️ Output was too long — click Rebuild to try again", {
          duration: 10000,
          action: {
            label: "Rebuild",
            onClick: () => rebuildFnRef.current?.(),
          },
        });
      } else {
        toast.warning(message, { duration: 6000 });
      }
      console.warn("[Build Warning]", message);
    });

    socket.on("build:error", (data?: { message?: string; error?: string }) => {
      setActivityStatus(null);
      setBuildStatus("error");
      setCurrentAgent(undefined);
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "error", text: data?.message ?? data?.error ?? "Build failed" }),
      ]);
    });

    socket.on("build:backend_ready", () => {
      console.log("[FRONTEND] build:backend_ready received — switching to E2B preview");
      setIsFullstack(true);
      setActiveTab("preview");
    });

    // E2B sandbox preview — the backend emits the public URL once the sandbox
    // dev server is live. The iframe loads it directly, no SW required.
    socket.on("build:preview_url", ({ url }: { url: string }) => {
      console.log("[Preview] E2B URL received:", url);
      setPreviewError(null);
      setPreviewUrl(url);
      setPreviewLoading(false);
    });

    socket.on("build:preview_loading", () => {
      console.log("[Preview] E2B sandbox starting…");
      setPreviewError(null);
      setPreviewLoading(true);
      setPreviewUrl(null);
    });

    socket.on("build:preview_error", ({ message }: { message: string }) => {
      console.error("[Preview] E2B sandbox error:", message);
      setPreviewLoading(false);
      setPreviewError(message);
    });

    socket.on("build:cancelled", () => {
      setActivityStatus(null);
      setBuildStatus("error");
      setCurrentAgent(undefined);
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "text", text: "Build stopped." }),
      ]);
      toast.success("Build stopped");
    });

    socket.on("mcp:thinking", (data: { text?: string }) => {
      setIsMcpActive(true);
      const text = data.text ?? "";
      if (!text) return;
      setMcpEvents(prev => [...prev, { id: crypto.randomUUID(), kind: "thinking", text }]);
    });

    socket.on("mcp:tool_call", (data: { tool?: string; server?: string }) => {
      const tool = [data.tool, data.server].filter(Boolean).join(" @ ");
      setMcpEvents(prev => [...prev, { id: crypto.randomUUID(), kind: "tool_call", tool }]);
    });

    socket.on("mcp:tool_result", (data: { success?: boolean }) => {
      setMcpEvents(prev => {
        const lastCallIdx = prev.map((e, i) => (e.kind === "tool_call" && e.success === undefined ? i : -1)).filter(i => i !== -1).at(-1);
        if (lastCallIdx === undefined) return prev;
        const updated = [...prev];
        updated[lastCallIdx] = { ...updated[lastCallIdx], kind: "tool_result", success: data.success ?? true };
        return updated;
      });
    });

    socket.on("mcp:done", (data: { summary?: string }) => {
      setIsMcpActive(false);
      setMcpEvents(prev => [...prev, { id: crypto.randomUUID(), kind: "done", summary: data.summary ?? "" }]);
    });
  }, []);

  // 1. Restore from sessionStorage THEN connect socket in one effect so they
  //    never race. If cache exists, skip the "blank slate" setMessages(initial).
  useEffect(() => {
    completedRef.current = false;

    let hadCache = false;
    if (sessionId) {
      try {
        const raw = sessionStorage.getItem(`build_${sessionId}`);
        if (raw) {
          const data = JSON.parse(raw) as {
            files?: Record<string, string>;
            messages?: BuildMessage[];
            buildStatus?: BuildStatus;
            activeTab?: ActiveTab;
            previewUrl?: string | null;
          };
          if (data.files && Object.keys(data.files).length > 0) {
            setFiles(data.files);
            // Strip any hardcoded system messages that leaked into previous snapshots.
            const clean = (data.messages ?? []).filter(
              m => !(m.type === "thinking" && HARDCODED_PATTERNS.some(p => p.test(m.text.trim()))),
            );
            setMessages(clean);
            setBuildStatus(data.buildStatus ?? "complete");
            setActiveTab(data.activeTab ?? "preview");
            // Restore fullstack detection + E2B preview URL — without this, reloading
            // a fullstack session silently downgrades to the Sandpack preview.
            if (hasBackendFiles(data.files)) setIsFullstack(true);
            if (data.previewUrl) setPreviewUrl(data.previewUrl);
            hadCache = true;
          }
        }
      } catch { /* ignore */ }
    }

    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    // Only reset to the original prompt when there is no cached state.
    // If we already loaded messages from cache, leave them untouched.
    if (!hadCache) {
      const storedPrompt =
        sessionId ? (window.sessionStorage.getItem(`prompt:${sessionId}`) ?? "") : "";
      const initial: BuildMessage[] = [];
      if (storedPrompt.trim()) {
        initial.push(newMsg({ type: "text", text: storedPrompt, role: "user" }));
      }
      setMessages(initial);
    }

    registerHandlers(socket);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [sessionId, registerHandlers]);

  // Fetch files from the API only when sessionStorage has no data for this session
  // (e.g. navigating to a historical session on a fresh page load).
  // Never called when cache already hydrated messages above.
  useEffect(() => {
    if (!sessionId) return;

    // Skip if sessionStorage already has a usable snapshot for this session.
    try {
      const raw = sessionStorage.getItem(`build_${sessionId}`);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.files && Object.keys(data.files).length > 0) return;
      }
    } catch { /* ignore */ }

    const token = useAuthStore.getState().session?.access_token;
    if (!token) return;

    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/build/${sessionId}/files`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        groups?: { files?: { path?: string; content?: string; code?: string }[]; items?: { path?: string; content?: string; code?: string }[] }[];
        files?: Record<string, string>;
      } | null) => {
        if (!data) return;

        const filesMap: Record<string, string> = {};

        if (Array.isArray(data.groups)) {
          data.groups.forEach(g => {
            (g.files ?? g.items ?? []).forEach(f => {
              if (f.path && (f.content ?? f.code)) {
                filesMap[f.path] = (f.content ?? f.code)!;
              }
            });
          });
        }

        if (data.files && typeof data.files === "object") {
          Object.assign(filesMap, data.files);
        }

        if (Object.keys(filesMap).length === 0) return;
        setFiles(filesMap);
        setBuildStatus("complete");
        setActiveTab("preview");
        // Same fullstack detection as the live build:complete handler — otherwise
        // historical fullstack sessions render Sandpack instead of E2B.
        if (hasBackendFiles(filesMap)) setIsFullstack(true);
        // Use functional updater — never overwrite messages that already exist
        // (e.g. live build messages). Only set the restore note when chat is empty.
        setMessages(prev =>
          prev.length > 0
            ? prev
            : [newMsg({
                type: "text",
                text: `Restored: ${Object.keys(filesMap).length} files loaded from previous build.`,
              })],
        );
      })
      .catch(() => {});

    return () => controller.abort();
  }, [sessionId]);

  // 2. Persist build state to sessionStorage whenever files/messages/buildStatus change.
  useEffect(() => {
    if (!sessionId || Object.keys(files).length === 0) return;
    try {
      sessionStorage.setItem(`build_${sessionId}`, JSON.stringify({
        files, messages, buildStatus, activeTab, previewUrl,
      }));
    } catch { /* ignore quota errors */ }
  }, [files, messages, buildStatus, activeTab, previewUrl, sessionId]);

  // 3. Reconnect the socket when the user returns to this tab mid-build.
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        buildStatus === "running" &&
        socketRef.current?.disconnected
      ) {
        socketRef.current.connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [buildStatus]);

  // Actual build dispatch — accepts enriched prompt + question/answer context.
  const executeBuild = useCallback(async (
    prompt: string,
    answers: QuestionAnswer[],
    questions: ClarifyQuestion[],
  ) => {
    const answerContext = answers.length > 0
      ? "\n\n---\nUser Clarifications:\n" +
        answers
          .map(a => {
            const q = questions.find(cq => cq.id === a.questionId);
            const selected = a.selected.join(", ");
            const custom = a.custom ? ` (custom: ${a.custom})` : "";
            return `- ${q?.question ?? a.questionId}: ${selected}${custom}`;
          })
          .join("\n")
      : "";

    const enrichedPrompt = prompt + answerContext;

    setMessages(prev => [
      ...closeStreaming(prev),
      newMsg({ type: "text", text: prompt, role: "user" }),
      newMsg({ type: "thinking", text: "Planning the build...", streaming: true }),
    ]);
    setBuildStatus("running");
    setCurrentAgent(undefined);
    completedRef.current = false;
    filesRef.current = {};
    setIsFullstack(false);
    setPreviewUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);

    let newSessionId: string;
    try {
      const res = await apiPost<{ sessionId?: string; session_id?: string }>("/api/build/fast", {
        prompt: enrichedPrompt,
        projectId,
      });
      newSessionId = res.sessionId ?? res.session_id ?? "";
      if (!newSessionId) throw new Error("No sessionId in response");
    } catch {
      setBuildStatus("error");
      setMessages(prev => [
        ...prev,
        newMsg({ type: "error", text: "Failed to start build" }),
      ]);
      return;
    }

    currentSessionIdRef.current = newSessionId;
    socketRef.current?.disconnect();
    const newSocket = createBuildSocket(newSessionId);
    socketRef.current = newSocket;
    registerHandlers(newSocket);
  }, [projectId, registerHandlers]);

  // Entry point from ChatColumn — runs clarification check first.
  const handleFollowUp = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    pendingPromptRef.current = prompt;

    setIsClarifying(true);
    let result: ClarifyResponse = { needsClarification: false, questions: [] };
    try {
      result = await clarifyPrompt(prompt, projectId);
    } catch {
      // network failure → skip clarify, build directly
    } finally {
      setIsClarifying(false);
    }

    if (result.needsClarification && result.questions.length > 0) {
      setClarifyQuestions(result.questions);
      setCurrentQuestionIndex(0);
      setQuestionAnswers([]);
      setSelectedOptions(new Set());
      setCustomText("");
      setShowClarifyModal(true);
    } else {
      await executeBuild(prompt, [], []);
    }
  }, [projectId, executeBuild]);

  // Keep rebuildFnRef current so the truncation toast Rebuild button always
  // re-sends the last prompt through the normal follow-up flow.
  rebuildFnRef.current = () => {
    const prompt = pendingPromptRef.current;
    if (prompt) void handleFollowUp(prompt);
  };

  // Advance through clarify questions; on last → close modal and start build.
  const handleNextQuestion = useCallback(() => {
    const q = clarifyQuestions[currentQuestionIndex];
    if (!q) return;

    const answer: QuestionAnswer = {
      questionId: q.id,
      selected: Array.from(selectedOptions),
      custom: customText.trim() || undefined,
    };
    const newAnswers = [...questionAnswers, answer];
    setQuestionAnswers(newAnswers);

    if (currentQuestionIndex < clarifyQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptions(new Set());
      setCustomText("");
    } else {
      setShowClarifyModal(false);
      void executeBuild(pendingPromptRef.current, newAnswers, clarifyQuestions);
    }
  }, [clarifyQuestions, currentQuestionIndex, selectedOptions, customText, questionAnswers, executeBuild]);

  const handleSkipAllQuestions = useCallback(() => {
    setShowClarifyModal(false);
    void executeBuild(pendingPromptRef.current, [], []);
  }, [executeBuild]);

  const handleToggleOption = useCallback((option: string) => {
    const q = clarifyQuestions[currentQuestionIndex];
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (q?.allowMultiple) {
        if (next.has(option)) next.delete(option);
        else next.add(option);
      } else {
        next.clear();
        next.add(option);
      }
      return next;
    });
  }, [clarifyQuestions, currentQuestionIndex]);

  const toggleChat = useCallback(() => {
    if (chatPanelRef.current?.isCollapsed()) {
      chatPanelRef.current.expand();
      setChatCollapsed(false);
    } else {
      chatPanelRef.current?.collapse();
      setChatCollapsed(true);
    }
  }, [chatPanelRef]);

  const isBuilding = buildStatus === "running";

  return (
    <RequireAuth>
      <div className="dark flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a]">

        <WorkspaceTopBar
          projectId={projectId}
          projectName={projectName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          device={device}
          setDevice={setDevice}
          buildStatus={buildStatus}
          onReload={() => setReloadKey(k => k + 1)}
          files={files}
          chatCollapsed={chatCollapsed}
          onToggleChat={toggleChat}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(v => !v)}
          businessContext={businessContext}
          showContextPanel={showContextPanel}
          onToggleContextPanel={() => setShowContextPanel(v => !v)}
          previewUrl={previewUrl}
        />

        <Group
          orientation="horizontal"
          className="flex-1 min-h-0"
          style={{ overflow: "hidden" }}
        >
          {/* Left: Chat panel — resizable, collapsible */}
          <Panel
            panelRef={chatPanelRef}
            defaultSize={25}
            minSize={15}
            collapsible={true}
            collapsedSize={0}
            onResize={(size) => setChatCollapsed(size.asPercentage < 1)}
          >
            <div className="relative h-full border-r border-white/[0.06] bg-[#0d0d12]">
              <ChatColumn
                messages={messages}
                isBuilding={isBuilding}
                currentAgent={currentAgent}
                onSend={handleFollowUp}
                onStop={handleStopBuild}
                projectName={projectName}
                activityStatus={activityStatus}
                isClarifying={isClarifying}
                chatCollapsed={chatCollapsed}
                onCollapse={toggleChat}
              />
              {showHistory && (
                <div className="absolute inset-0 z-10 flex flex-col bg-[#0d0d12]">
                  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
                    <span className="text-sm font-medium text-white/80">History</span>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="grid h-6 w-6 place-content-center rounded text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <HistoryPanel
                      projectId={projectId}
                      onSelect={() => setShowHistory(false)}
                    />
                  </div>
                </div>
              )}
              {/* ClarifyModal — slides up from above the prompt input */}
              {showClarifyModal && clarifyQuestions.length > 0 && (
                <div className="absolute bottom-[80px] left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-200">
                  <ClarifyModal
                    questions={clarifyQuestions}
                    currentIndex={currentQuestionIndex}
                    selectedOptions={selectedOptions}
                    customText={customText}
                    onToggleOption={handleToggleOption}
                    onCustomChange={setCustomText}
                    onNext={handleNextQuestion}
                    onSkip={handleSkipAllQuestions}
                  />
                </div>
              )}
            </div>
          </Panel>

          <Separator className="w-[3px] bg-white/[0.08] hover:bg-white/[0.25] active:bg-blue-500/50 cursor-col-resize transition-colors" />

          {/* Right: preview / code — takes remaining space */}
          <Panel defaultSize={75} minSize={30}>
            <div className="relative flex min-h-0 h-full bg-[#080808]">
              {/* Floating reopen button when chat is collapsed */}
              {chatCollapsed && (
                <button
                  onClick={toggleChat}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-all"
                  title="Show chat"
                >
                  <PanelLeftOpen size={15} />
                </button>
              )}

              {/* MCP Action Panel — overlay in bottom-right, shown only during/after MCP execution */}
              {(isMcpActive || mcpEvents.length > 0) && (
                <McpActionPanel
                  events={mcpEvents}
                  active={isMcpActive}
                  onClear={() => { setMcpEvents([]); setIsMcpActive(false); }}
                />
              )}
              {activeTab === "code" && (
                <div className="h-full w-full bg-[#080808]" style={{ padding: 24 }}>
                  <div style={{
                    width: "100%", height: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    overflow: "hidden",
                    display: "flex", flexDirection: "column",
                  }}>
                    <CodePanel
                      files={files}
                      newFiles={newFiles}
                      selectedFile={selectedFile}
                      setSelectedFile={setSelectedFile}
                      isBuilding={isBuilding}
                    />
                  </div>
                </div>
              )}
              {activeTab === "preview" && (
                <div key={reloadKey} className="flex h-full w-full items-start justify-center overflow-hidden bg-[#080808] transition-all duration-300">
                  <div className={`h-full transition-all duration-300 ${
                    device === "desktop" ? "w-full" :
                    device === "tablet"  ? "w-[768px] border-x border-white/10" :
                                          "w-[375px] border-x border-white/10"
                  }`}>
                    {isFullstack ? (
                      <div className="relative h-full w-full">
                        <E2BPreview
                          url={previewUrl}
                          loading={previewLoading}
                          error={previewError}
                          isFullstack={isFullstack}
                          files={files}
                          device={device}
                        />
                        {/* Overlay to hide E2B sandbox toolbar at top of iframe */}
                        {previewUrl && (
                          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-10 bg-[#080808]" />
                        )}
                      </div>
                    ) : (
                      <SandpackPreview
                        files={buildStatus === "complete" ? files : {}}
                        isBuilding={isBuilding}
                        externalDevice={device}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </Group>

      {showContextPanel && (
        <BusinessContextPanel
          projectId={projectId}
          initial={businessContext}
          onClose={() => setShowContextPanel(false)}
          onSaved={setBusinessContext}
        />
      )}
      </div>
    </RequireAuth>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Top Bar                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function WorkspaceTopBar({
  projectId, projectName, activeTab, setActiveTab, device, setDevice,
  buildStatus, onReload, files, chatCollapsed, onToggleChat,
  showHistory, onToggleHistory,
  businessContext, showContextPanel, onToggleContextPanel,
  previewUrl,
}: {
  projectId: string;
  projectName: string;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  device: Device;
  setDevice: (d: Device) => void;
  buildStatus: BuildStatus;
  onReload: () => void;
  files: Record<string, string>;
  chatCollapsed: boolean;
  onToggleChat: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  businessContext: BusinessContext;
  showContextPanel: boolean;
  onToggleContextPanel: () => void;
  previewUrl: string | null;
}) {
  const navigate = useNavigate();
  void navigate;
  const isBuilding = buildStatus === "running";
  const rawName = projectName || projectId.slice(0, 8);
  const words = rawName.split(/\s+/).filter(Boolean);
  const displayName = words.length > 4 ? words.slice(0, 4).join(" ") + "…" : rawName;

  const handleDownload = () => {
    const entries = Object.entries(files);
    if (entries.length === 0) { toast("No files to download yet"); return; }
    const blob = new Blob(
      [entries.map(([p, c]) => `// === ${p} ===\n${c}`).join("\n\n")],
      { type: "text/plain" },
    );
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${projectId.slice(0, 12)}-code.txt`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Codebase downloaded");
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0f0f0f] px-3">

      {/* ── Left: brand + nav ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
          <Lamp className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-bold tracking-tight text-white">Lampcode</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">vibe coder</span>
        </div>
        <div className="mx-1 h-4 w-px bg-white/[0.08]" />
        <button className="flex items-center gap-0.5 text-sm font-semibold text-white/90 transition hover:text-white max-w-[180px]">
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-white/40" />
        </button>
        <button
          onClick={onToggleContextPanel}
          className={cn(
            "grid h-6 w-6 place-content-center rounded-md transition",
            showContextPanel
              ? "text-orange-400"
              : "text-white/30 hover:bg-white/[0.05] hover:text-white/70",
          )}
          title="AI project context"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        {hasFilledContext(businessContext) && !showContextPanel && (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            🧠 AI context set
          </span>
        )}
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

      {/* History panel toggle */}
      <button
        onClick={onToggleHistory}
        className={cn(
          "p-1.5 rounded transition-colors hover:bg-white/5",
          showHistory ? "text-orange-400" : "text-white/40 hover:text-white/70",
        )}
        title="Build history"
      >
        <History size={14} />
      </button>

      {/* Collapse/expand chat panel */}
      <button
        onClick={onToggleChat}
        className="ws-iconbtn"
        title={chatCollapsed ? "Show chat" : "Hide chat"}
      >
        {chatCollapsed
          ? <PanelLeft className="h-4 w-4" />
          : <PanelLeftClose className="h-4 w-4" />
        }
      </button>

      {/* ── Center: tab pills + device toggle + build status ─────────── */}
      <div className="flex flex-1 items-center justify-center gap-3">

        <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
          <IconTab active={activeTab === "preview"} onClick={() => setActiveTab("preview")} title="Preview">
            <Globe className="h-4 w-4" />
          </IconTab>
          <IconTab active={false} onClick={() => {}} title="Docs">
            <FileText className="h-4 w-4" />
          </IconTab>
          <IconTab active={activeTab === "code"} onClick={() => setActiveTab("code")} title="Code">
            <Code2 className="h-4 w-4" />
          </IconTab>
        </div>

        {/* Device toggle — only shown in preview tab */}
        {activeTab === "preview" && (
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            {([
              { mode: "desktop" as Device, icon: Monitor,    label: "Desktop" },
              { mode: "tablet"  as Device, icon: Tablet,     label: "Tablet"  },
              { mode: "mobile"  as Device, icon: Smartphone, label: "Mobile"  },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                title={label}
                className={`p-1.5 rounded-md transition-all ${
                  device === mode
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        )}

        {isBuilding && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Building…
          </span>
        )}
      </div>

      {/* ── Right: actions ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5">
        {activeTab === "preview" && (
          <>
            <button className="ws-iconbtn" title="Reload preview" onClick={onReload}>
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                "ws-iconbtn",
                !previewUrl && "cursor-not-allowed opacity-40",
              )}
              title={previewUrl ? "Open preview in new tab" : "Preview not ready yet"}
              disabled={!previewUrl}
              onClick={() => {
                if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
          </>
        )}

        <button className="ws-iconbtn" title="GitHub" onClick={() => toast("GitHub integration coming soon")}>
          <Github className="h-4 w-4" />
        </button>
        <button className="ws-iconbtn" title="Download codebase" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
        <button
          className="inline-flex items-center rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
          onClick={() => toast("Share link coming soon")}
        >
          Share
        </button>
        <button
          className="inline-flex items-center rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400 active:bg-orange-600"
          onClick={() => toast("Deploy to Vercel coming soon")}
        >
          Publish
        </button>
      </div>

    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Left: Chat Column                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ChatColumn({
  messages, isBuilding, currentAgent, onSend, onStop, projectName, activityStatus, isClarifying,
  chatCollapsed, onCollapse,
}: {
  messages: BuildMessage[];
  isBuilding: boolean;
  currentAgent?: string;
  onSend?: (prompt: string) => void;
  onStop?: () => void;
  projectName?: string;
  activityStatus?: string | null;
  isClarifying?: boolean;
  chatCollapsed?: boolean;
  onCollapse?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !onSend) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">

      {/* Chat header with collapse button */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">Chat</span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            title={chatCollapsed ? "Show chat" : "Hide chat"}
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          isBuilding={isBuilding}
          currentAgent={currentAgent}
          className="h-full !bg-transparent"
          projectName={projectName}
        />
      </div>

      {/* Working… inline status block */}
      {isBuilding && currentAgent && (
        <div className="shrink-0 border-t border-white/[0.05] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">Working...</p>
              <p className="mt-0.5 text-[11px] leading-tight text-white/40">
                {AGENT_LABELS[currentAgent] ?? "Working on it…"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity status chip — shows backend pipeline progress, never AI thinking */}
      {activityStatus && (
        <div className="shrink-0 px-4 pb-1">
          <span className="text-[11px] italic text-white/30">{activityStatus}</span>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 p-3">
        <div className="group relative w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] shadow-xl shadow-black/40 backdrop-blur-xl transition focus-within:border-orange-500/50">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Lampcode…"
            rows={3}
            className="block w-full resize-none rounded-2xl border-0 bg-transparent px-4 pt-3.5 pb-2 text-sm text-white/90 placeholder:text-white/35 outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85"
                title="Attach image or file"
              >
                <Plus className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                multiple
                accept="image/*,.pdf,.txt,.md,.json,.csv"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) toast.success(`Attached ${f.name}`);
                }}
              />
              <button onClick={() => toast("Import from URL — coming soon!")} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Import from URL">
                <Link2 className="h-4 w-4" />
              </button>
              <button onClick={() => toast("Figma import — coming soon!")} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Figma">
                <Figma className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/75">
                <Zap className="h-3 w-3 text-orange-400" />
                Fast Mode
              </span>
              {isClarifying ? (
                <button
                  disabled
                  className="flex h-8 cursor-wait items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 text-xs text-orange-300/70"
                >
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  Analyzing...
                </button>
              ) : isBuilding ? (
                <button
                  className="grid h-8 w-8 place-content-center rounded-lg bg-white/[0.08] text-white/80 transition hover:bg-white/[0.13] active:bg-red-500/20"
                  title="Stop build"
                  onClick={onStop}
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  disabled={!draft.trim()}
                  onClick={handleSend}
                  className="grid h-8 w-8 place-content-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md transition hover:opacity-90 disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Right: Code Panel                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CodePanel({
  files, newFiles, selectedFile, setSelectedFile, isBuilding,
}: {
  files: Record<string, string>;
  newFiles: Set<string>;
  selectedFile: string | null;
  setSelectedFile: (p: string) => void;
  isBuilding: boolean;
}) {
  const [query, setQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return Object.fromEntries(Object.entries(files).filter(([p]) => p.toLowerCase().includes(q)));
  }, [files, query]);

  const code = selectedFile ? files[selectedFile] : undefined;

  const handleDownload = () => {
    const entries = Object.entries(files);
    if (entries.length === 0) { toast("No files to download yet"); return; }
    const blob = new Blob(
      [entries.map(([p, c]) => `// === ${p} ===\n${c}`).join("\n\n")],
      { type: "text/plain" },
    );
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "codebase.txt",
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Codebase downloaded");
  };

  return (
    <div className="flex h-full w-full bg-[#080808]">

      {/* Left: file tree column */}
      <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b0b]">
        <div className="shrink-0 border-b border-white/[0.06] p-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search code"
              className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/35 outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {Object.keys(files).length === 0 ? (
            <EmptyCodeSkeleton building={isBuilding} />
          ) : (
            <FileTree
              files={filteredFiles}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              newFiles={newFiles}
              className="h-full"
            />
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] p-2">
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 active:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" />
            Download codebase
          </button>
        </div>
      </div>

      {/* Right: code viewer */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {selectedFile && code !== undefined ? (
          <CodeViewer path={selectedFile} content={code} building={isBuilding} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Code2 className="h-6 w-6 text-white/20" />
            <p className="text-xs text-white/40">
              {Object.keys(files).length === 0
                ? (isBuilding ? "Waiting for files…" : "No files yet")
                : "Select a file to view its code"}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Code Viewer                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function EmptyCodeSkeleton({ building }: { building: boolean }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer h-5 rounded-md"
          style={{ width: `${50 + ((i * 13) % 45)}%` }}
        />
      ))}
      <p className="pt-3 text-center text-[11px] text-white/40">
        {building ? "Waiting for build…" : "No files yet"}
      </p>
    </div>
  );
}

function CodeViewer({
  path, content, building,
}: {
  path: string;
  content?: string;
  building: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (content === undefined) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <div className="w-full space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-4 rounded-md" style={{ width: `${40 + ((i * 17) % 50)}%` }} />
          ))}
        </div>
        <p className="pt-3 text-[11px] text-white/40">
          {building ? "Waiting for build…" : "Select a file to view"}
        </p>
      </div>
    );
  }

  const lines = content.split("\n");
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-white/60">{path}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="ws-iconbtn !h-7 !w-7"
          title="Copy"
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-emerald-400" />
            : <Copy  className="h-3.5 w-3.5" />
          }
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-[#08080d] font-mono text-[12px] leading-[1.55]">
        <div className="flex min-w-full">
          <div className="sticky left-0 select-none border-r border-white/[0.05] bg-[#08080d] px-3 py-3 text-right text-white/20">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <pre className="flex-1 whitespace-pre px-4 py-3 text-white/85">{content}</pre>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Shared primitives                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function IconTab({
  active, onClick, title, children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-content-center rounded-md transition",
        active
          ? "bg-white/10 text-white"
          : "text-white/35 hover:bg-white/[0.05] hover:text-white/70",
      )}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MCP Action Panel                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Clarify Modal                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ClarifyModal({
  questions,
  currentIndex,
  selectedOptions,
  customText,
  onToggleOption,
  onCustomChange,
  onNext,
  onSkip,
}: {
  questions: ClarifyQuestion[];
  currentIndex: number;
  selectedOptions: Set<string>;
  customText: string;
  onToggleOption: (option: string) => void;
  onCustomChange: (value: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const question = questions[currentIndex];
  if (!question) return null;
  const total = questions.length;
  const canProceed = selectedOptions.size > 0 || customText.trim().length > 0;

  return (
    <div className="w-full rounded-xl border border-white/20 bg-[#1a1a2e] p-5 shadow-2xl max-h-[70vh] overflow-y-auto">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-orange-400">
              Before I start building...
            </p>
            <h2 className="text-lg font-semibold text-white">
              {question.heading}
            </h2>
          </div>
          <button
            onClick={onSkip}
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            Skip all
          </button>
        </div>

        {/* Reason banner */}
        <div className="mb-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-white/60">
            💡 {question.reason}
          </p>
        </div>

        {/* Question */}
        <p className="mb-4 font-medium text-white">
          {question.question}
        </p>

        {/* Options */}
        <div className="mb-4 space-y-2">
          {question.options.map(option => {
            const isSelected = selectedOptions.has(option);
            return (
              <button
                key={option}
                onClick={() => onToggleOption(option)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  isSelected
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white",
                )}
              >
                <span className={cn(
                  "mr-3 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                  isSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-white/30",
                )}>
                  {isSelected ? "✓" : ""}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Custom input */}
        {question.allowCustom && (
          <input
            type="text"
            placeholder="Or type a custom answer..."
            value={customText}
            onChange={e => onCustomChange(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-orange-500/50 focus:outline-none"
          />
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentIndex
                    ? "w-6 bg-orange-500"
                    : i < currentIndex
                    ? "w-1.5 bg-orange-500/50"
                    : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              {currentIndex + 1} of {total}
            </span>
            <button
              onClick={onNext}
              disabled={!canProceed}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition-all",
                canProceed
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "cursor-not-allowed bg-white/10 text-white/30",
              )}
            >
              {currentIndex === total - 1 ? "Start Building →" : "Next →"}
            </button>
          </div>
        </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Business Context Panel                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ContextToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex flex-1 items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-white/60 transition hover:bg-white/[0.06]"
    >
      <span>{label}</span>
      <span className={cn(
        "relative ml-2 h-4 w-7 shrink-0 rounded-full transition-colors",
        value ? "bg-orange-500" : "bg-white/20",
      )}>
        <span className={cn(
          "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform",
          value ? "translate-x-3.5" : "translate-x-0.5",
        )} />
      </span>
    </button>
  );
}

function BusinessContextPanel({
  projectId, initial, onClose, onSaved,
}: {
  projectId: string;
  initial: BusinessContext;
  onClose: () => void;
  onSaved: (ctx: BusinessContext) => void;
}) {
  const [ctx, setCtx] = useState<BusinessContext>(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = (patch: Partial<BusinessContext>) => {
    const next = { ...ctx, ...patch };
    setCtx(next);
    onSaved(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await apiPost(`/api/projects/${projectId}/business-context`, next);
        toast.success("✓ Context saved", { duration: 1500 });
      } catch {
        // api() already shows error toast
      }
    }, 1000);
  };

  const selectClass = "w-full rounded-lg border border-white/[0.08] bg-[#0f0f16] px-3 py-2 text-xs text-white/80 focus:border-orange-500/40 focus:outline-none";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed left-3 top-14 z-50 w-[300px] rounded-xl border border-white/[0.10] bg-[#0d0d14] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">AI Project Context</p>
          <button onClick={onClose} className="text-white/30 transition hover:text-white/70">
            <X size={13} />
          </button>
        </div>

        <div className="space-y-3">
          {/* App description */}
          <div>
            <label className="mb-1 block text-[11px] text-white/50">What does your app do?</label>
            <textarea
              rows={2}
              value={ctx.appDescription ?? ""}
              onChange={e => handleChange({ appDescription: e.target.value || undefined })}
              placeholder="e.g. A project management tool for remote teams"
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-orange-500/40 focus:outline-none"
            />
          </div>

          {/* User type */}
          <div>
            <label className="mb-1 block text-[11px] text-white/50">Who are your users?</label>
            <select
              value={ctx.userType ?? ""}
              onChange={e => handleChange({ userType: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Select...</option>
              <option value="Consumers">Consumers</option>
              <option value="Businesses">Businesses</option>
              <option value="Internal Team">Internal Team</option>
              <option value="Marketplace">Marketplace</option>
            </select>
          </div>

          {/* Industry */}
          <div>
            <label className="mb-1 block text-[11px] text-white/50">Industry?</label>
            <select
              value={ctx.industry ?? ""}
              onChange={e => handleChange({ industry: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Select...</option>
              <option value="SaaS">SaaS</option>
              <option value="Ecommerce">Ecommerce</option>
              <option value="Fintech">Fintech</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex gap-2">
            <ContextToggle
              label="Multi-tenant?"
              value={ctx.isMultiTenant ?? false}
              onChange={v => handleChange({ isMultiTenant: v })}
            />
            <ContextToggle
              label="Paid features?"
              value={ctx.hasPaidFeatures ?? false}
              onChange={v => handleChange({ hasPaidFeatures: v })}
            />
          </div>
        </div>

        <p className="mt-3 text-[10px] text-white/25">
          Saved automatically · helps AI build the right thing
        </p>
      </div>
    </>
  );
}

function McpActionPanel({
  events, active, onClear,
}: {
  events: McpEvent[];
  active: boolean;
  onClear: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="absolute bottom-4 right-4 z-30 flex w-80 flex-col rounded-xl border border-white/[0.10] bg-[#0d0d14]/95 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          🔧 AI Actions
          {active && (
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
          )}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-white/30 hover:text-white/60 transition"
        >
          Clear
        </button>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex max-h-64 flex-col gap-1.5 overflow-y-auto p-2">
        {events.map(ev => {
          if (ev.kind === "thinking") {
            return (
              <div key={ev.id} className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/50">
                💭 {ev.text}
              </div>
            );
          }
          if (ev.kind === "tool_call" || ev.kind === "tool_result") {
            const isDone = ev.kind === "tool_result";
            return (
              <div
                key={ev.id}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px]",
                  isDone
                    ? ev.success
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                    : "bg-orange-500/10 text-orange-300",
                )}
              >
                {isDone ? (ev.success ? "✅" : "❌") : "⚡"}{" "}
                <span className="font-medium">{ev.tool}</span>
              </div>
            );
          }
          if (ev.kind === "done") {
            return (
              <div key={ev.id} className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
                ✅ {ev.summary ? ev.summary.slice(0, 120) + (ev.summary.length > 120 ? "…" : "") : "Done"}
              </div>
            );
          }
          return null;
        })}
        {active && events.length === 0 && (
          <div className="py-2 text-center text-[11px] text-white/30">Waiting for AI actions…</div>
        )}
      </div>
    </div>
  );
}
