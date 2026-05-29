import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type BuildMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { createBuildSocket } from "@/lib/websocket";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip, Mic, ArrowUp, ChevronDown, Sparkles, Zap,
  RotateCw, ExternalLink, Monitor, Tablet, Smartphone,
  Search, Copy, Check, FileCode2, Globe,
} from "lucide-react";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
    mode: search.mode === "plan" || search.mode === "fast" ? (search.mode as "plan" | "fast") : undefined,
  }),
  component: WorkspacePage,
});

type BuildStatus = "running" | "complete" | "error";
type ActiveTab = "preview" | "code";

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
        return [
          ...closeStreaming(prev),
          newMsg({ type: "text", text: token, streaming: true }),
        ];
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
      setActiveTab("preview");
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
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-background px-4">

          {/* Left: project name + status dot */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                buildStatus === "running" && "animate-pulse bg-green-400",
                buildStatus === "complete" && "bg-blue-400",
                buildStatus === "error" && "bg-red-400",
              )}
            />
            <span className="truncate text-sm font-medium text-foreground/80">
              {projectId}
            </span>
          </div>

          {/* Center: tab switcher */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-1">
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
            <TabBtn
              active={false}
              disabled
              icon={<Rocket className="h-3.5 w-3.5" />}
              label="Deploy"
              suffix={<Lock className="h-2.5 w-2.5" />}
            />
          </div>

          {/* Right: spacer keeps tabs centred */}
          <div className="flex-1" />
        </header>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">

          {/* Left: Chat panel (35%) */}
          <div className="w-[35%] shrink-0 border-r border-border">
            <ChatPanel
              messages={messages}
              isBuilding={isBuilding}
              currentAgent={currentAgent}
              className="h-full"
            />
          </div>

          {/* Right: tab content (65%) */}
          <div className="flex min-h-0 flex-1">

            {activeTab === "preview" && (
              <SandpackPreview
                files={buildStatus === "complete" ? files : {}}
                isBuilding={isBuilding}
                className="h-full w-full"
              />
            )}

            {activeTab === "code" && (
              <div className="flex min-h-0 w-full">
                {/* File tree: 40% of right panel */}
                <div className="w-[40%] shrink-0 border-r border-border">
                  <FileTree
                    files={files}
                    selectedFile={selectedFile}
                    onFileSelect={setSelectedFile}
                    newFiles={newFiles}
                    className="h-full"
                  />
                </div>
                {/* Code viewer: 60% of right panel */}
                <div className="min-h-0 flex-1">
                  <FileViewer
                    path={selectedFile}
                    content={selectedFile != null ? files[selectedFile] : undefined}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  label,
  suffix,
  disabled,
}: {
  active: boolean
  onClick?: () => void
  icon: React.ReactNode
  label: string
  suffix?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon}
      {label}
      {suffix}
    </button>
  );
}

// ── File viewer ────────────────────────────────────────────────────────────────

function FileViewer({ path, content }: { path: string | null; content?: string }) {
  if (!path || content === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-xs text-muted-foreground">
          {path ? "Loading…" : "Select a file to view its contents"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="shrink-0 border-b border-border/40 bg-background/20 px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{path}</span>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
        {content}
      </pre>
    </div>
  );
}
