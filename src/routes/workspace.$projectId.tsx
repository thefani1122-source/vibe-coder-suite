import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type BuildMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { createBuildSocket } from "@/lib/websocket";
import {
  Mic, ArrowUp, ChevronDown, Sparkles, Zap,
  RotateCw, Monitor, Smartphone, Maximize2,
  Search, Copy, Check, Globe, Code2, ChevronLeft,
  History, PanelLeft, FileText, Settings, Github, Download,
  Square, Plus,
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
type Device     = "desktop" | "mobile" | "full";

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

const SUGGESTIONS = [
  "Add build status timeout",
  "Create debug event panel",
  "Add dark mode toggle",
  "Make it responsive",
];

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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    setMessages([newMsg({ type: "text", text: "⚡ Starting Fast Mode build..." })]);

    socket.on("build:thinking", (data: { text?: string; content?: string }) => {
      setCurrentAgent("planning");
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "thinking", text: data.text ?? data.content ?? "" }),
      ]);
    });

    // Only append tokens into a short, single-line status bubble.
    // Raw file content tokens are silently dropped.
    socket.on("build:token", (data: { text?: string; token?: string }) => {
      const text = data.text ?? data.token ?? "";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === "text" && !last.text.includes("\n") && last.text.length < 200) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: m.text + text } : m);
        }
        return prev;
      });
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
        newMsg({ type: "text", text: `✅ Build complete! ${count > 0 ? count : "All"} files generated.` }),
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

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [sessionId]);

  const isBuilding = buildStatus === "running";

  return (
    <RequireAuth>
      <div className="dark flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a]">

        <WorkspaceTopBar
          projectId={projectId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          device={device}
          setDevice={setDevice}
          buildStatus={buildStatus}
          onReload={() => setReloadKey(k => k + 1)}
          files={files}
        />

        <div className="flex min-h-0 flex-1">
          {/* Left: Chat — fixed 360 px */}
          <div className="w-[360px] shrink-0 border-r border-white/[0.06]">
            <ChatColumn
              messages={messages}
              isBuilding={isBuilding}
              currentAgent={currentAgent}
            />
          </div>

          {/* Right: tab-switched panel */}
          <div className="flex min-h-0 flex-1">
            {activeTab === "code" && (
              <CodePanel
                files={files}
                newFiles={newFiles}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isBuilding={isBuilding}
              />
            )}
            {activeTab === "preview" && (
              <div key={reloadKey} className="h-full w-full">
                <SandpackPreview
                  files={buildStatus === "complete" ? files : {}}
                  isBuilding={isBuilding}
                  externalDevice={device}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </RequireAuth>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Top Bar  (Lovable-style icon tabs + device controls + publish)            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function WorkspaceTopBar({
  projectId, activeTab, setActiveTab, device, setDevice,
  buildStatus, onReload, files,
}: {
  projectId: string;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  device: Device;
  setDevice: (d: Device) => void;
  buildStatus: BuildStatus;
  onReload: () => void;
  files: Record<string, string>;
}) {
  const isBuilding = buildStatus === "running";

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
        <button className="flex items-center gap-0.5 text-sm font-semibold text-white/90 transition hover:text-white">
          Lampcode
          <ChevronDown className="h-3 w-3 text-white/40" />
        </button>
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />
      <button className="ws-iconbtn" title="History"><History className="h-4 w-4" /></button>
      <button className="ws-iconbtn" title="Toggle panel"><PanelLeft className="h-4 w-4" /></button>

      {/* ── Center: icon tabs + device controls ──────────────────────── */}
      <div className="flex flex-1 items-center justify-center gap-2">

        {/* Tab icon group */}
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5">
          <IconTab active={activeTab === "preview"} onClick={() => setActiveTab("preview")} title="Preview">
            <Globe className="h-4 w-4" />
          </IconTab>
          <IconTab active={false} onClick={() => {}} title="Docs">
            <FileText className="h-4 w-4" />
          </IconTab>
          <IconTab active={activeTab === "code"} onClick={() => setActiveTab("code")} title="Code">
            <Code2 className="h-4 w-4" />
          </IconTab>
          <IconTab active={false} onClick={() => {}} title="Settings">
            <Settings className="h-4 w-4" />
          </IconTab>
        </div>

        {/* Device controls — preview tab only */}
        {activeTab === "preview" && (
          <>
            <div className="h-4 w-px bg-white/[0.07]" />
            <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-white/[0.03] p-0.5">
              <SmDeviceBtn active={device === "desktop"} onClick={() => setDevice("desktop")} title="Desktop">
                <Monitor className="h-3.5 w-3.5" />
              </SmDeviceBtn>
              <span className="px-0.5 text-[10px] text-white/20">/</span>
              <SmDeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")} title="Mobile">
                <Smartphone className="h-3.5 w-3.5" />
              </SmDeviceBtn>
              <SmDeviceBtn active={device === "full"} onClick={() => setDevice("full")} title="Fullscreen">
                <Maximize2 className="h-3.5 w-3.5" />
              </SmDeviceBtn>
            </div>
            <button className="ws-iconbtn" title="Reload preview" onClick={onReload}>
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Build status pulse (running only) */}
        {isBuilding && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Building…
          </span>
        )}
      </div>

      {/* ── Right: actions ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5">
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
/*  Left: Chat Column                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ChatColumn({
  messages, isBuilding, currentAgent,
}: {
  messages: BuildMessage[];
  isBuilding: boolean;
  currentAgent?: string;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          isBuilding={isBuilding}
          currentAgent={currentAgent}
          className="h-full !bg-transparent"
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

      {/* Suggestion chips — horizontal scroll */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => setDraft(s)}
            className="shrink-0 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-white/55 transition hover:border-white/[0.14] hover:text-white/80"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-white/[0.07] p-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
          <button
            className="shrink-0 grid h-6 w-6 place-content-center rounded-md text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
            title="Attach"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            className="shrink-0 flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/50 transition hover:bg-white/[0.06]"
            onClick={() => toast("Visual editing coming soon")}
          >
            <Sparkles className="h-3 w-3" />
            Visual edits
          </button>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                toast("Follow-up queued (not yet connected)");
                setDraft("");
              }
            }}
            placeholder={isBuilding ? "Queue follow-up…" : "Ask a follow-up…"}
            className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/30 outline-none"
          />
          <div className="flex shrink-0 items-center gap-1">
            <button className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/[0.07]">
              <Zap className="h-3 w-3 text-orange-400" />
              Build
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </button>
            <button className="ws-iconbtn" title="Voice input">
              <Mic className="h-3.5 w-3.5" />
            </button>
            {isBuilding ? (
              <button
                className="grid h-7 w-7 place-content-center rounded-lg bg-white/[0.08] text-white/80 transition hover:bg-white/[0.13]"
                title="Stop build"
                onClick={() => toast("Stop not yet implemented")}
              >
                <Square className="h-3 w-3" />
              </button>
            ) : (
              <button
                disabled={!draft.trim()}
                onClick={() => { if (draft.trim()) { toast("Follow-up sent"); setDraft(""); } }}
                className="grid h-7 w-7 place-content-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md transition hover:opacity-90 disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Right: Code Panel                                                          */
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
  const [showCode, setShowCode] = useState(false);
  const [query,    setQuery]    = useState("");

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return Object.fromEntries(Object.entries(files).filter(([p]) => p.toLowerCase().includes(q)));
  }, [files, query]);

  const code = selectedFile ? files[selectedFile] : undefined;

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    setShowCode(true);
  };

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
    <div className="flex h-full w-full flex-col bg-[#0d0d0d]">

      {/* Header: search bar or back-to-files link */}
      <div className="shrink-0 border-b border-white/[0.06] p-2">
        {showCode && selectedFile ? (
          <button
            onClick={() => setShowCode(false)}
            className="flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white/80"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Files
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search code"
              className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/35 outline-none"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {showCode && selectedFile && code !== undefined ? (
          <CodeViewer path={selectedFile} content={code} building={isBuilding} />
        ) : Object.keys(files).length === 0 ? (
          <EmptyCodeSkeleton building={isBuilding} />
        ) : (
          <FileTree
            files={filteredFiles}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            newFiles={newFiles}
            className="h-full"
          />
        )}
      </div>

      {/* Download codebase button — file tree view only */}
      {!showCode && (
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 active:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" />
            Download codebase
          </button>
        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Code Viewer                                                                */
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
/*  Shared primitives                                                          */
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
          ? "bg-white/[0.08] text-white"
          : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}

function SmDeviceBtn({
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
        "grid h-7 w-7 place-content-center rounded transition",
        active ? "bg-white/[0.10] text-white" : "text-white/45 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
