import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { Group, Panel, Separator, usePanelRef, type PanelImperativeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type BuildMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { HistoryPanel } from "@/components/HistoryPanel";
import { createBuildSocket } from "@/lib/websocket";
import { apiGet, apiPost } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import {
  ArrowUp, ChevronDown, Sparkles, Zap,
  RotateCw, Monitor, Smartphone, Tablet,
  Search, Copy, Check, Globe, Code2,
  History, PanelLeft, PanelLeftClose, FileText, Github, Download,
  Square, Plus, ExternalLink, Image as ImageIcon, Link2, Figma, X,
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
  const [activeTab,    setActiveTab]    = useState<ActiveTab>("code");
  const [device,       setDevice]       = useState<Device>("desktop");
  const [reloadKey,    setReloadKey]    = useState(0);
  const [projectName,  setProjectName]  = useState<string>("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);

  const socketRef    = useRef<Socket | null>(null);
  const completedRef = useRef(false);
  const chatPanelRef = usePanelRef();

  // Fetch project name with auth via apiGet (handles token automatically).
  // API returns { project: { name, description } }; fall back to flat shapes.
  useEffect(() => {
    apiGet<{ project?: { name?: string; description?: string }; name?: string; title?: string }>(
      `/api/projects/${projectId}`,
      { silent: true },
    )
      .then(d => {
        const name = d?.project?.name ?? d?.name ?? d?.title;
        if (name) setProjectName(name);
      })
      .catch(() => {});
  }, [projectId]);

  // 1. Restore from sessionStorage FIRST (instant, no network round-trip).
  useEffect(() => {
    if (!sessionId) return;
    try {
      const cached = sessionStorage.getItem(`build_${sessionId}`);
      if (!cached) return;
      const data = JSON.parse(cached) as {
        files?: Record<string, string>;
        messages?: BuildMessage[];
        buildStatus?: BuildStatus;
        activeTab?: ActiveTab;
      };
      if (data.files && Object.keys(data.files).length > 0) {
        setFiles(data.files);
        setMessages(data.messages ?? []);
        setBuildStatus(data.buildStatus ?? "complete");
        setActiveTab(data.activeTab ?? "preview");
      }
    } catch { /* ignore parse errors */ }
  }, [sessionId]);

  // Restore files for a completed build when navigating back from history.
  useEffect(() => {
    if (!sessionId) return;

    const token = useAuthStore.getState().session?.access_token;
    if (!token) return;

    const controller = new AbortController();

    console.log("[history] fetching files for sessionId:", sessionId);

    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/build/${sessionId}/files`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        groups?: { files?: { path?: string; content?: string; code?: string }[]; items?: { path?: string; content?: string; code?: string }[] }[];
        files?: Record<string, string>;
      } | null) => {
        console.log("[history] response:", data);
        if (!data) return;

        const filesMap: Record<string, string> = {};

        // Format 1: { groups: [{ files: [{ path, content }] }] }
        if (Array.isArray(data.groups)) {
          data.groups.forEach(g => {
            (g.files ?? g.items ?? []).forEach(f => {
              if (f.path && (f.content ?? f.code)) {
                filesMap[f.path] = (f.content ?? f.code)!;
              }
            });
          });
        }

        // Format 2: { files: { "src/App.tsx": "..." } }
        if (data.files && typeof data.files === "object") {
          Object.assign(filesMap, data.files);
        }

        console.log("[history] files set:", Object.keys(filesMap));
        if (Object.keys(filesMap).length === 0) return;
        setFiles(filesMap);
        setBuildStatus("complete");
        setActiveTab("preview");
        setMessages([newMsg({
          type: "text",
          text: `Restored: ${Object.keys(filesMap).length} files loaded from previous build.`,
        })]);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [sessionId]);

  // Stable handler registration — state setters are stable refs, so empty deps is safe.
  const registerHandlers = useCallback((socket: Socket) => {
    socket.on("build:prompt", (data: { text?: string; prompt?: string }) => {
      const t = (data.text ?? data.prompt ?? "").trim();
      if (!t) return;
      setMessages(prev =>
        prev.some(m => m.type === "text" && m.text === t)
          ? prev
          : [newMsg({ type: "text", text: t, role: "user" }), ...prev],
      );
    });

    socket.on("build:thinking", (data: { text?: string; content?: string }) => {
      completedRef.current = false; // new build stream started — allow build:complete to fire once
      setCurrentAgent("planning");
      const chunk = data.text ?? data.content ?? "";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === "thinking" && last.streaming) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, text: m.text + chunk } : m,
          );
        }
        return [
          ...closeStreaming(prev),
          newMsg({ type: "thinking", text: chunk, streaming: true }),
        ];
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

    socket.on(
      "build:file_write",
      (data: { path?: string; file?: string; content?: string; code?: string }) => {
        const path = data.path ?? data.file ?? "file";
        const code = data.content ?? data.code ?? "";
        setFiles(prev => ({ ...prev, [path]: code }));
        setNewFiles(prev => new Set([...prev, path]));
        setSelectedFile(prev => prev ?? path);
        setCurrentAgent("frontend");
        setMessages(prev => [
          ...closeStreaming(prev),
          newMsg({ type: "file_write", text: path, path }),
        ]);
      },
    );

    socket.on("build:complete", (data?: { files?: Record<string, string> }) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const completedFiles = data?.files ?? {};
      const count = Object.keys(completedFiles).length;
      if (data?.files) {
        setFiles(data.files);
        setSelectedFile(prev => prev ?? Object.keys(data.files!)[0] ?? null);
      }
      setBuildStatus("complete");
      setCurrentAgent(undefined);
      setNewFiles(new Set());
      setActiveTab("preview");
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({
          type: "text",
          text: `Here's your app! I generated ${count > 0 ? count : "your"} files. You can see the preview on the right, or click Code to explore the files.`,
        }),
      ]);
    });

    socket.on("build:error", (data?: { message?: string; error?: string }) => {
      setBuildStatus("error");
      setCurrentAgent(undefined);
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "error", text: data?.message ?? data?.error ?? "Build failed" }),
      ]);
    });
  }, []);

  // Initial socket setup
  useEffect(() => {
    completedRef.current = false;
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    const storedPrompt =
      (typeof window !== "undefined" && sessionId
        ? window.sessionStorage.getItem(`prompt:${sessionId}`)
        : null) ?? "";
    const initial: BuildMessage[] = [];
    if (storedPrompt.trim()) {
      initial.push(newMsg({ type: "text", text: storedPrompt, role: "user" }));
    }
    setMessages(initial);

    registerHandlers(socket);

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [sessionId, registerHandlers]);

  // 2. Persist build state to sessionStorage whenever files/messages/buildStatus change.
  useEffect(() => {
    if (!sessionId || Object.keys(files).length === 0) return;
    try {
      sessionStorage.setItem(`build_${sessionId}`, JSON.stringify({
        files, messages, buildStatus, activeTab,
      }));
    } catch { /* ignore quota errors */ }
  }, [files, messages, buildStatus, activeTab, sessionId]);

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

  // Follow-up build: POST new prompt, reconnect socket with fresh sessionId.
  const handleFollowUp = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setMessages(prev => [
      ...closeStreaming(prev),
      newMsg({ type: "text", text: prompt, role: "user" }),
    ]);
    setBuildStatus("running");
    setCurrentAgent(undefined);
    completedRef.current = false;

    let newSessionId: string;
    try {
      const res = await apiPost<{ sessionId?: string; session_id?: string }>("/api/build/fast", {
        prompt,
        projectId,
      });
      newSessionId = res.sessionId ?? res.session_id ?? "";
      if (!newSessionId) throw new Error("No sessionId in response");
    } catch {
      setBuildStatus("error");
      setMessages(prev => [
        ...prev,
        newMsg({ type: "error", text: "Failed to start follow-up build" }),
      ]);
      return;
    }

    socketRef.current?.disconnect();
    const newSocket = createBuildSocket(newSessionId);
    socketRef.current = newSocket;
    registerHandlers(newSocket);
  }, [projectId, registerHandlers]);

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
                projectName={projectName}
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
            </div>
          </Panel>

          <Separator className="w-[3px] bg-white/[0.08] hover:bg-white/[0.25] active:bg-blue-500/50 cursor-col-resize transition-colors" />

          {/* Right: preview / code — takes remaining space */}
          <Panel defaultSize={75} minSize={30}>
            <div className="flex min-h-0 h-full bg-[#080808]">
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
                <div key={reloadKey} className="h-full w-full bg-[#080808]">
                  <SandpackPreview
                    files={buildStatus === "complete" ? files : {}}
                    isBuilding={isBuilding}
                    externalDevice={device}
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
          </Panel>
        </Group>

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
}) {
  const navigate = useNavigate();
  void navigate;
  const isBuilding = buildStatus === "running";
  const displayName = projectName || projectId.slice(0, 8);

  const cycleDevice = () => {
    const idx = DEVICE_CYCLE.indexOf(device);
    setDevice(DEVICE_CYCLE[(idx + 1) % DEVICE_CYCLE.length]);
  };

  const DeviceIcon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;

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
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="grid h-7 w-7 place-content-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-500/20">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <button className="flex items-center gap-0.5 font-mono text-sm font-semibold text-white/90 transition hover:text-white">
          {displayName}
          <ChevronDown className="h-3 w-3 text-white/40" />
        </button>
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

      {/* ── Center: tab pills + build status ──────────────────────────── */}
      <div className="flex flex-1 items-center justify-center gap-2">

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

        {isBuilding && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Building…
          </span>
        )}
      </div>

      {/* ── Right: device cycle + actions ─────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Single cycling device button — always visible */}
        <button
          className={cn(
            "ws-iconbtn",
            activeTab === "preview" ? "text-white/70" : "text-white/30",
          )}
          title={`Device: ${device} — click to cycle`}
          onClick={cycleDevice}
        >
          <DeviceIcon className="h-3.5 w-3.5" />
        </button>

        {activeTab === "preview" && (
          <>
            <button className="ws-iconbtn" title="Reload preview" onClick={onReload}>
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              className="ws-iconbtn"
              title="Open preview in new tab"
              onClick={() => {
                const iframe = document.querySelector('iframe[title="Sandbox Preview"]') as HTMLIFrameElement | null;
                const url = iframe?.src;
                if (url && !url.includes("about:blank")) {
                  window.open(url, "_blank", "noopener,noreferrer");
                } else {
                  toast("Preview not ready yet — build first");
                }
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
  messages, isBuilding, currentAgent, onSend, projectName,
}: {
  messages: BuildMessage[];
  isBuilding: boolean;
  currentAgent?: string;
  onSend?: (prompt: string) => void;
  projectName?: string;
}) {
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !onSend) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">

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
              <button onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Attach">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => screenshotRef.current?.click()} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Screenshot">
                <ImageIcon className="h-4 w-4" />
              </button>
              <button onClick={() => toast("Import from URL — coming soon!")} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Import from URL">
                <Link2 className="h-4 w-4" />
              </button>
              <button onClick={() => toast("Figma import — coming soon!")} className="grid h-8 w-8 place-content-center rounded-md text-white/45 transition hover:bg-white/[0.05] hover:text-white/85" title="Figma">
                <Figma className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
              <input ref={screenshotRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/75">
                <Zap className="h-3 w-3 text-orange-400" />
                Fast Mode
              </span>
              {isBuilding ? (
                <button
                  className="grid h-8 w-8 place-content-center rounded-lg bg-white/[0.08] text-white/80 transition hover:bg-white/[0.13]"
                  title="Stop build"
                  onClick={() => toast("Stop not yet implemented")}
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
