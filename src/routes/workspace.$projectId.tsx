import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";
import { ChatPanel, type AgentMessage } from "@/components/ChatPanel";
import { FileTree } from "@/components/FileTree";
import { SandpackPreview } from "@/components/SandpackPreview";
import { createBuildSocket } from "@/lib/websocket";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
  }),
  component: WorkspacePage,
});

type BuildStatus = "running" | "complete" | "error";

function toolToAgent(tool: string): string {
  if (/file|write|create/i.test(tool)) return "frontend";
  if (/deploy|publish/i.test(tool)) return "deploy";
  if (/db|sql|database/i.test(tool)) return "db";
  if (/test|security|verify/i.test(tool)) return "security";
  return "connection";
}

function WorkspacePage() {
  const { projectId } = Route.useParams();
  const { sessionId } = Route.useSearch();

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("running");
  const [currentAgent, setCurrentAgent] = useState<string | undefined>();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    const push = (agent: string, content: string): void =>
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), agent, content, timestamp: Date.now() },
      ]);

    socket.on("build:thinking", (data: { text?: string; content?: string }) => {
      setCurrentAgent("planning");
      push("planning", data.text ?? data.content ?? "");
    });

    socket.on("build:token", (data: { text?: string; token?: string }) => {
      const token = data.text ?? data.token ?? "";
      setMessages(prev => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, content: last.content + token }];
      });
    });

    socket.on("build:tool_call", (data: { tool?: string; name?: string }) => {
      const tool = data.tool ?? data.name ?? "tool";
      const agent = toolToAgent(tool);
      setCurrentAgent(agent);
      push(agent, `▶ ${tool}`);
    });

    socket.on("build:tool_result", () => {
      setMessages(prev => {
        const ri = [...prev]
          .reverse()
          .findIndex(m => m.content.startsWith("▶ ") && !m.content.endsWith(" ✓"));
        if (ri === -1) return prev;
        const idx = prev.length - 1 - ri;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: updated[idx].content + " ✓" };
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
        push("frontend", `📄 ${path}`);
      },
    );

    socket.on("build:complete", (data?: { files?: Record<string, string> }) => {
      if (data?.files) {
        setFiles(data.files);
        setSelectedFile(prev => prev ?? Object.keys(data.files!)[0] ?? null);
      }
      setBuildStatus("complete");
      setCurrentAgent(undefined);
      push("deploy", "✅ Build complete");
    });

    socket.on("build:error", (data?: { message?: string; error?: string }) => {
      setBuildStatus("error");
      setCurrentAgent(undefined);
      push("fix", `❌ ${data?.message ?? data?.error ?? "Build failed"}`);
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
        {/* Status bar */}
        <header className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <span className="font-mono text-xs text-muted-foreground">
            Project {projectId}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                buildStatus === "running" && "animate-pulse bg-green-400",
                buildStatus === "complete" && "bg-blue-400",
                buildStatus === "error" && "bg-red-400",
              )}
            />
            <span className="text-xs capitalize text-muted-foreground">{buildStatus}</span>
          </div>
        </header>

        {/* Three-panel row */}
        <div className="flex min-h-0 flex-1">
          {/* Left 30%: Chat */}
          <div className="w-[30%] shrink-0 border-r border-border">
            <ChatPanel
              messages={messages}
              isBuilding={isBuilding}
              currentAgent={currentAgent}
              className="h-full"
            />
          </div>

          {/* Middle 35%: File tree + code viewer */}
          <div className="flex w-[35%] shrink-0 flex-col border-r border-border">
            <div className="h-2/5 border-b border-border">
              <FileTree
                files={files}
                selectedFile={selectedFile ?? undefined}
                onSelectFile={setSelectedFile}
                newFiles={newFiles}
                className="h-full"
              />
            </div>
            <div className="min-h-0 flex-1">
              <FileViewer
                path={selectedFile}
                content={selectedFile != null ? files[selectedFile] : undefined}
              />
            </div>
          </div>

          {/* Right 35%: Live preview */}
          <div className="flex-1">
            <SandpackPreview
              files={buildStatus === "complete" ? files : {}}
              isBuilding={isBuilding}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function FileViewer({ path, content }: { path: string | null; content?: string }) {
  if (!path || content === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-xs text-muted-foreground">Select a file to view its contents</p>
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
