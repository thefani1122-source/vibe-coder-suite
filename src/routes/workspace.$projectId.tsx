import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type BuildMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { createBuildSocket } from "@/lib/websocket";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip, Mic, ArrowUp, ChevronDown, Sparkles, Zap,
  RotateCw, Monitor, Smartphone, Maximize2,
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
type ActiveTab = "code" | "preview";
type Device = "desktop" | "mobile" | "full";
type MidTab = "files" | "code";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("code");
  const [device, setDevice] = useState<Device>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    // Seed the chat with a start message so it's never blank
    setMessages([newMsg({ type: "text", text: "⚡ Starting Fast Mode build..." })]);

    socket.on("build:thinking", (data: { text?: string; content?: string }) => {
      setCurrentAgent("planning");
      setMessages(prev => [
        ...closeStreaming(prev),
        newMsg({ type: "thinking", text: data.text ?? data.content ?? "" }),
      ]);
    });

    // Only accumulate tokens into a short, single-line status bubble.
    // Tokens that arrive during code generation are raw JSX/TS — drop them
    // rather than flooding the chat with file content.
    socket.on("build:token", (data: { text?: string; token?: string }) => {
      const text = data.text ?? data.token ?? "";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (
          last?.type === "text" &&
          !last.text.includes("\n") &&
          last.text.length < 200
        ) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, text: m.text + text } : m,
          );
        }
        return prev; // drop code tokens silently
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
        newMsg({
          type: "text",
          text: `✅ Build complete! ${count > 0 ? count : "All"} files generated.`,
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const isBuilding = buildStatus === "running";

  return (
    <RequireAuth>
      <div className="dark ws-root flex h-screen w-full flex-col overflow-hidden">

        {/* ── Top bar ────────────────────────────────────────────────── */}
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 px-4">

          {/* Left: icon + project name + status badge */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="grid h-6 w-6 shrink-0 place-content-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="truncate text-sm font-medium text-white/90">{projectId}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isBuilding          && "animate-pulse bg-emerald-400",
                buildStatus === "complete" && "bg-blue-400",
                buildStatus === "error"    && "bg-red-400",
              )} />
              {isBuilding ? "Running" : buildStatus === "complete" ? "Ready" : "Error"}
            </span>
          </div>

          {/* Center: Preview | Code tab switcher */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] p-1">
            <TabBtn
              active={activeTab === "preview"}
              onClick={() => setActiveTab("preview")}
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Preview"
            />
            <TabBtn
              active={activeTab === "code"}
              onClick={() => setActiveTab("code")}
              icon={<Code2 className="h-3.5 w-3.5" />}
              label="Code"
            />
          </div>

          {/* Right: device controls (preview tab only) + reload */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {activeTab === "preview" && (
              <>
                <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5">
                  <DeviceBtn active={device === "desktop"} onClick={() => setDevice("desktop")}>
                    <Monitor className="h-3.5 w-3.5" />
                  </DeviceBtn>
                  <DeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")}>
                    <Smartphone className="h-3.5 w-3.5" />
                  </DeviceBtn>
                  <DeviceBtn active={device === "full"} onClick={() => setDevice("full")}>
                    <Maximize2 className="h-3.5 w-3.5" />
                  </DeviceBtn>
                </div>
                <button
                  className="ws-iconbtn"
                  title="Reload preview"
                  onClick={() => setReloadKey(k => k + 1)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Body: 2-column ─────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">

          {/* Left 35%: chat — always visible */}
          <div className="w-[35%] shrink-0 border-r border-white/5">
            <ChatColumn
              projectId={projectId}
              messages={messages}
              isBuilding={isBuilding}
              currentAgent={currentAgent}
              buildStatus={buildStatus}
            />
          </div>

          {/* Right 65%: tab-switched panel */}
          <div className="flex min-h-0 flex-1">
            {activeTab === "code" && (
              <CodeColumn
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
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            isBuilding                 && "animate-pulse bg-emerald-400",
            buildStatus === "complete" && "bg-blue-400",
            buildStatus === "error"    && "bg-red-400",
          )} />
          <span className="truncate text-sm font-medium text-white/90">{projectId}</span>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40">
          {isBuilding ? "Running" : "Idle"}
        </span>
      </div>

      {/* thinking card */}
      {isBuilding && currentAgent && (
        <div className="px-4 pt-3 shrink-0">
          <ThinkingCard label={AGENT_LABELS[currentAgent] ?? "Working…"} />
        </div>
      )}

      {/* messages */}
      <div className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          isBuilding={isBuilding}
          currentAgent={currentAgent}
          className="h-full !bg-transparent"
        />
      </div>

      {/* suggestion chips */}
      <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 pt-2 shrink-0">
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
      <div className="shrink-0 p-3">
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
          <div className="truncate text-sm text-white/90 ws-thinking">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── RIGHT: Code column ────────────────────────── */

function CodeColumn({
  files, newFiles, selectedFile, setSelectedFile, isBuilding,
}: {
  files: Record<string, string>;
  newFiles: Set<string>;
  selectedFile: string | null;
  setSelectedFile: (p: string) => void;
  isBuilding: boolean;
}) {
  const [tab, setTab] = useState<MidTab>("files");
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
    <div className="ws-panel flex h-full w-full flex-col">
      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2 shrink-0">
        <TabBtn active={tab === "files"} onClick={() => setTab("files")} icon={<FileCode2 className="h-3.5 w-3.5" />} label="Files" />
        <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 className="h-3.5 w-3.5" />} label="Code" />
        <span className="ml-auto text-[10px] text-white/40">
          {Object.keys(files).length} files
        </span>
      </div>

      {/* search */}
      <div className="border-b border-white/5 px-3 py-2 shrink-0">
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
        <div className="w-full space-y-2">
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
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-1.5">
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
            : <Copy className="h-3.5 w-3.5" />
          }
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-[#08080d] font-mono text-[12px] leading-[1.55]">
        <div className="flex min-w-full">
          <div className="sticky left-0 select-none border-r border-white/5 bg-[#08080d] px-3 py-3 text-right text-white/25">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <pre className="flex-1 whitespace-pre px-4 py-3 text-white/85">{content}</pre>
        </div>
      </div>
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
      type="button"
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
      type="button"
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
