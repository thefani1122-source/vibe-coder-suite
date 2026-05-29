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
  PanelGroup as ResizablePanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip, Mic, ArrowUp, ChevronDown, Sparkles, Zap,
  RotateCw, ExternalLink, Monitor, Tablet, Smartphone,
  Search, Copy, Check, FileCode2, Globe, Code2,
} from "lucide-react";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
    mode: search.mode === "plan" || search.mode === "fast" ? (search.mode as "plan" | "fast") : undefined,
  }),
  component: WorkspacePage,
});

type BuildStatus = "running" | "complete" | "error";
type MidTab = "files" | "code";
type Device = "desktop" | "tablet" | "mobile";

function toolToAgent(tool: string): string {
  if (/file|write|create/i.test(tool)) return "frontend";
  if (/deploy|publish/i.test(tool)) return "deploy";
  if (/db|sql|database/i.test(tool)) return "db";
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
  frontend:   "Polishing UI: gradients, skeletons…",
  db:         "Wiring up the database…",
  security:   "Running security & verification…",
  deploy:     "Preparing deployment…",
  connection: "Working on it…",
};

const SUGGESTIONS = [
  "Add a dark mode toggle",
  "Make it responsive on mobile",
  "Add loading skeletons",
  "Polish the typography",
];

function WorkspacePage() {
  const { projectId } = Route.useParams();
  const { sessionId } = Route.useSearch();

  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("running");
  const [currentAgent, setCurrentAgent] = useState<string | undefined>();
  const [midTab, setMidTab] = useState<MidTab>("files");
  const [device, setDevice] = useState<Device>("desktop");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    socket.on("build:thinking", (data: { text?: string; content?: string }) => {
      setCurrentAgent("planning");
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "thinking", text: data.text ?? data.content ?? "" }),
      ]);
    });
    socket.on("build:token", (data: { text?: string; token?: string }) => {
      const token = data.text ?? data.token ?? "";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (prev.length > 0 && last.type === "text") {
          return [...prev.slice(0, -1), { ...last, text: last.text + token, streaming: true }];
        }
        return [...closeStreaming(prev), newMsg({ type: "text", text: token, streaming: true })];
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
      if (data?.files) {
        setFiles(data.files);
        setSelectedFile(prev => prev ?? Object.keys(data.files!)[0] ?? null);
      }
      setBuildStatus("complete");
      setCurrentAgent(undefined);
      setNewFiles(new Set());
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "text", text: "✅ Build complete" }),
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const isBuilding = buildStatus === "running";

  return (
    <RequireAuth>
      <div className="dark ws-root flex h-screen w-full flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-content-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="truncate text-sm font-medium text-white/90">{projectId}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isBuilding && "bg-emerald-400 animate-pulse",
                buildStatus === "complete" && "bg-blue-400",
                buildStatus === "error" && "bg-red-400",
              )} />
              {isBuilding ? "Running" : buildStatus === "complete" ? "Ready" : "Error"}
            </span>
          </div>
          <div className="ml-auto text-xs text-white/40">Lovable-style workspace</div>
        </header>

        {/* 3-panel body */}
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          {/* LEFT — Chat */}
          <ResizablePanel defaultSize={30} minSize={22}>
            <ChatColumn
              projectId={projectId}
              messages={messages}
              isBuilding={isBuilding}
              currentAgent={currentAgent}
              buildStatus={buildStatus}
            />
          </ResizablePanel>

          <PanelResizeHandle className="ws-divider w-px transition-colors hover:w-[2px]" />

          {/* MIDDLE — Code */}
          <ResizablePanel defaultSize={35} minSize={22}>
            <CodeColumn
              tab={midTab}
              setTab={setMidTab}
              files={files}
              newFiles={newFiles}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              isBuilding={isBuilding}
            />
          </ResizablePanel>

          <PanelResizeHandle className="ws-divider w-px transition-colors hover:w-[2px]" />

          {/* RIGHT — Preview */}
          <ResizablePanel defaultSize={35} minSize={22}>
            <PreviewColumn
              files={buildStatus === "complete" ? files : {}}
              isBuilding={isBuilding}
              device={device}
              setDevice={setDevice}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </RequireAuth>
  );
}

/* ─────────────────────────── LEFT: Chat column ─────────────────────────── */

function ChatColumn({
  projectId, messages, isBuilding, currentAgent, buildStatus,
}: {
  projectId: string;
  messages: BuildMessage[];
  isBuilding: boolean;
  currentAgent?: string;
  buildStatus: BuildStatus;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="ws-panel flex h-full flex-col">
      {/* header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full",
            isBuilding && "bg-emerald-400 animate-pulse",
            buildStatus === "complete" && "bg-blue-400",
            buildStatus === "error" && "bg-red-400",
          )} />
          <span className="text-sm font-medium text-white/90 truncate">{projectId}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">
          {isBuilding ? "Running" : "Idle"}
        </span>
      </div>

      {/* messages + thinking card */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isBuilding && currentAgent && (
          <div className="px-4 pt-3">
            <ThinkingCard label={AGENT_LABELS[currentAgent] ?? "Working…"} />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ChatPanel
            messages={messages}
            isBuilding={isBuilding}
            currentAgent={currentAgent}
            className="h-full !bg-transparent"
          />
        </div>
      </div>

      {/* suggested chips */}
      <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 pt-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => setDraft(s)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70 transition hover:border-violet-400/40 hover:bg-white/[0.06] hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>

      {/* composer */}
      <div className="p-3">
        <div className="gradient-border-card p-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the agent to change something…"
            className="min-h-[64px] resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/30 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-0.5">
              <button className="ws-iconbtn" title="Attach"><Paperclip className="h-3.5 w-3.5" /></button>
              <button className="ws-iconbtn" title="Voice"><Mic className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/80 hover:bg-white/[0.08] transition">
                <Zap className="h-3 w-3 text-violet-300" />
                Build
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              <button
                disabled={!draft.trim()}
                className="inline-grid h-7 w-7 place-content-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md transition hover:opacity-95 disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingCard({ label }: { label: string }) {
  return (
    <div className="gradient-border-card ws-sheen relative overflow-hidden p-3">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-7 w-7 place-content-center rounded-md bg-violet-500/15">
          <Sparkles className="h-3.5 w-3.5 text-violet-300 ws-thinking" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Agent</div>
          <div className="text-sm text-white/90 truncate ws-thinking">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── MIDDLE: Code column ───────────────────────── */

function CodeColumn({
  tab, setTab, files, newFiles, selectedFile, setSelectedFile, isBuilding,
}: {
  tab: MidTab;
  setTab: (t: MidTab) => void;
  files: Record<string, string>;
  newFiles: Set<string>;
  selectedFile: string | null;
  setSelectedFile: (p: string) => void;
  isBuilding: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return Object.fromEntries(
      Object.entries(files).filter(([p]) => p.toLowerCase().includes(q)),
    );
  }, [files, query]);

  const code = selectedFile ? files[selectedFile] : undefined;

  return (
    <div className="ws-panel flex h-full flex-col">
      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2">
        <TabBtn active={tab === "files"} onClick={() => setTab("files")} icon={<FileCode2 className="h-3.5 w-3.5" />} label="Files" />
        <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 className="h-3.5 w-3.5" />} label="Code" />
        <span className="ml-auto text-[10px] text-white/40">
          {Object.keys(files).length} files
        </span>
      </div>

      {/* search */}
      <div className="border-b border-white/5 px-3 py-2">
        <div className="ws-urlbar flex items-center gap-2 rounded-md px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="w-full bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
          />
        </div>
      </div>

      {/* body */}
      <div key={tab} className="ws-fade-slide flex-1 min-h-0">
        {tab === "files" ? (
          Object.keys(files).length === 0 ? (
            <EmptyCodeSkeleton building={isBuilding} />
          ) : (
            <FileTree
              files={filtered}
              selectedFile={selectedFile}
              onFileSelect={(p) => { setSelectedFile(p); setTab("code"); }}
              newFiles={newFiles}
              className="h-full"
            />
          )
        ) : (
          <CodeViewer path={selectedFile} content={code} building={isBuilding} />
        )}
      </div>
    </div>
  );
}

function EmptyCodeSkeleton({ building }: { building: boolean }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-5" style={{ width: `${50 + ((i * 13) % 45)}%` }} />
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
  path: string | null;
  content?: string;
  building: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!path || content === undefined) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <div className="space-y-2 w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-4" style={{ width: `${40 + ((i * 17) % 50)}%` }} />
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
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
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
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-[#08080d] font-mono text-[12px] leading-[1.55]">
        <div className="flex min-w-full">
          <div className="sticky left-0 select-none border-r border-white/5 bg-[#08080d] px-3 py-3 text-right text-white/25">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="flex-1 whitespace-pre px-4 py-3 text-white/85">{content}</pre>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── RIGHT: Preview column ─────────────────────── */

const DEVICE_W: Record<Device, number | string> = {
  desktop: "100%",
  tablet:  768,
  mobile:  390,
};

function PreviewColumn({
  files, isBuilding, device, setDevice,
}: {
  files: Record<string, string>;
  isBuilding: boolean;
  device: Device;
  setDevice: (d: Device) => void;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const hasFiles = Object.keys(files).length > 0;
  return (
    <div className="ws-panel flex h-full flex-col">
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <button className="ws-iconbtn" title="Reload" onClick={() => setReloadKey(k => k + 1)}>
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <div className="ws-urlbar flex flex-1 items-center gap-2 rounded-md px-2.5 py-1">
          <Globe className="h-3 w-3 text-white/40" />
          <span className="truncate font-mono text-[11px] text-white/60">
            localhost:3000
          </span>
        </div>
        <button className="ws-iconbtn" title="Open in new tab"><ExternalLink className="h-3.5 w-3.5" /></button>
        <div className="ml-1 flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5">
          <DeviceBtn active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor className="h-3.5 w-3.5" /></DeviceBtn>
          <DeviceBtn active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet className="h-3.5 w-3.5" /></DeviceBtn>
          <DeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone className="h-3.5 w-3.5" /></DeviceBtn>
        </div>
      </div>

      {/* preview area */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#06060a] p-4">
        <div
          key={`${device}-${reloadKey}`}
          className="ws-fade-slide mx-auto h-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl"
          style={{ width: DEVICE_W[device], maxWidth: "100%" }}
        >
          {hasFiles ? (
            <SandpackPreview files={files} isBuilding={false} className="h-full !rounded-none" />
          ) : (
            <PreviewSkeleton building={isBuilding} />
          )}
        </div>
      </div>

      {/* thumbnails */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/5 p-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="gradient-border-card aspect-video overflow-hidden">
            <div className="h-full w-full skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSkeleton({ building }: { building: boolean }) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="skeleton-shimmer h-8 w-1/3" />
      <div className="skeleton-shimmer flex-1 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton-shimmer h-16" />
        <div className="skeleton-shimmer h-16" />
        <div className="skeleton-shimmer h-16" />
      </div>
      <p className="text-center text-[11px] text-white/40">
        {building ? "Building preview…" : "No preview yet"}
      </p>
    </div>
  );
}

/* ─────────────────────────── shared bits ───────────────────────────────── */

function TabBtn({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-white/[0.06] text-white"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DeviceBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "grid h-6 w-6 place-content-center rounded transition",
        active ? "bg-white/[0.10] text-white" : "text-white/50 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}