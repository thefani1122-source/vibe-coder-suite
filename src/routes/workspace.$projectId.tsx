import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { createBuildSocket, WS_URL } from "@/lib/websocket";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Brain,
  Database,
  Palette,
  Settings2,
  Shield,
  Link2,
  Rocket,
  CheckCircle2,
  Loader2,
  Clock,
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  Paperclip,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  ChevronDown,
  Code2,
  Eye,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Github,
  X,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  return (
    <RequireAuth>
      <WorkspacePageInner />
    </RequireAuth>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "running" | "done";
type Step = {
  key: string;
  label: string;
  icon: typeof Brain;
  detail?: string;
  status: StepStatus;
  progress: number;
};

type BuildFile = { lang: string; code: string };
type FileMap = Record<string, BuildFile>;
type TreeFolder = { name: string; children: { name: string; path: string }[] };

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_STEPS: Step[] = [
  { key: "plan",   label: "Planning",   icon: Brain,     detail: "Writing project brief",   status: "pending", progress: 0 },
  { key: "db",     label: "Database",   icon: Database,  status: "pending", progress: 0 },
  { key: "fe",     label: "Frontend",   icon: Palette,   detail: "Creating login page",     status: "pending", progress: 0 },
  { key: "be",     label: "Backend",    icon: Settings2, status: "pending", progress: 0 },
  { key: "sec",    label: "Security",   icon: Shield,    status: "pending", progress: 0 },
  { key: "conn",   label: "Connection", icon: Link2,     status: "pending", progress: 0 },
  { key: "deploy", label: "Deploy",     icon: Rocket,    status: "pending", progress: 0 },
];

const EXT_LANG: Record<string, string> = {
  tsx: "tsx", ts: "typescript", jsx: "jsx", js: "javascript",
  css: "css", scss: "scss", json: "json", md: "markdown",
  html: "html", py: "python", sql: "sql", sh: "bash",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function langForPath(path: string): string {
  const ext = path.split(".").pop() ?? "";
  return EXT_LANG[ext] ?? "text";
}

function deriveFileTree(files: FileMap): TreeFolder[] {
  const folders: Record<string, TreeFolder> = {};
  const order: string[] = [];
  Object.keys(files).forEach((path) => {
    const parts = path.split("/");
    if (parts.length < 2) return;
    const folder = parts[0];
    if (!folders[folder]) {
      folders[folder] = { name: folder, children: [] };
      order.push(folder);
    }
    folders[folder].children.push({ name: parts.slice(1).join("/"), path });
  });
  return order.map((f) => folders[f]);
}

// ─── Main component ───────────────────────────────────────────────────────────

function WorkspacePageInner() {
  const { projectId } = useParams({ from: "/workspace/$projectId" });
  const { sessionId } = Route.useSearch();

  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [building, setBuilding] = useState(!!sessionId);
  const [hasReceivedEvents, setHasReceivedEvents] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [collapsedStatus, setCollapsedStatus] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeFile, setActiveFile] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<FileMap>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof createBuildSocket> | null>(null);

  useEffect(() => {
    console.log("[WS] Backend URL:", WS_URL || "(empty — check VITE_BACKEND_URL)", "| sessionId:", sessionId);

    // Per-session socket: connects to /build namespace with sessionId in handshake query
    // so the backend can join the room immediately without waiting for a join event.
    const socket = createBuildSocket(sessionId);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WS] Connected — socket.id:", socket.id);
      // Also emit join event as fallback for backends that use event-based room join
      socket.emit("workspace:join", { projectId, sessionId });
      socket.emit("build:join", { projectId, sessionId });
    });

    socket.on("connect_error", (err) => {
      console.log("[WS] connect_error:", err.message, err);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
    });

    // Normalize progress data to a step update
    const applyAgentUpdate = (data: Record<string, unknown>) => {
      setHasReceivedEvents(true);
      const agentKey = (data.agent ?? data.name ?? data.step ?? "") as string;
      const status = (data.status ?? (data.done ? "done" : data.running ? "running" : undefined)) as StepStatus | undefined;
      const progress = (data.progress ?? data.percent ?? 0) as number;
      const detail = (data.detail ?? data.message ?? data.msg ?? undefined) as string | undefined;

      if (agentKey) {
        setSteps((prev) =>
          prev.map((s) =>
            s.key === agentKey
              ? { ...s, ...(status ? { status } : {}), progress, ...(detail ? { detail } : {}) }
              : s
          )
        );
      }
    };

    // Listen for all known agent progress event name variants
    const onAgentProgress = (data: unknown) => {
      console.log("[WS] agent_progress:", data);
      applyAgentUpdate(data as Record<string, unknown>);
    };
    const onAgentUpdate = (data: unknown) => {
      console.log("[WS] agent:update:", data);
      applyAgentUpdate(data as Record<string, unknown>);
    };
    const onProgress = (data: unknown) => {
      console.log("[WS] progress:", data);
      // Generic progress — just mark events as received so waiting state clears
      setHasReceivedEvents(true);
    };

    socket.on("agent_progress", onAgentProgress);
    socket.on("agent:update", onAgentUpdate);
    socket.on("progress", onProgress);

    // Normalize build complete (both naming conventions)
    const applyBuildComplete = (data: Record<string, unknown>) => {
      const files = (data.files ?? {}) as FileMap;
      const url = (data.previewUrl ?? data.preview_url ?? data.url ?? null) as string | null;
      setFiles(files);
      setPreviewUrl(url);
      setBuilding(false);

      const paths = Object.keys(files);
      const topFolders = [...new Set(
        paths.filter((p) => p.includes("/")).map((p) => p.split("/")[0])
      )];
      setOpenFolders(Object.fromEntries(topFolders.map((f) => [f, true])));
      if (paths.length > 0) setActiveFile(paths[0]);

      setTimeout(() => setCollapsedStatus(true), 800);
    };

    const onBuildComplete = (data: unknown) => {
      console.log("[WS] build:complete:", data);
      applyBuildComplete(data as Record<string, unknown>);
    };
    const onBuildDone = (data: unknown) => {
      console.log("[WS] build_complete:", data);
      applyBuildComplete(data as Record<string, unknown>);
    };

    socket.on("build:complete", onBuildComplete);
    socket.on("build_complete", onBuildDone);

    // Normalize build error
    const applyBuildError = (data: Record<string, unknown>) => {
      const msg = (data.message ?? data.error ?? data.msg ?? "Unknown error") as string;
      setBuildError(msg);
      toast.error(`Build failed: ${msg}`);
      setBuilding(false);
    };

    const onBuildError = (data: unknown) => {
      console.log("[WS] build:error:", data);
      applyBuildError(data as Record<string, unknown>);
    };
    const onBuildErrorAlt = (data: unknown) => {
      console.log("[WS] build_error:", data);
      applyBuildError(data as Record<string, unknown>);
    };

    socket.on("build:error", onBuildError);
    socket.on("build_error", onBuildErrorAlt);

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("agent_progress", onAgentProgress);
      socket.off("agent:update", onAgentUpdate);
      socket.off("progress", onProgress);
      socket.off("build:complete", onBuildComplete);
      socket.off("build_complete", onBuildDone);
      socket.off("build:error", onBuildError);
      socket.off("build_error", onBuildErrorAlt);
      socket.disconnect();
    };
  }, [projectId, sessionId]);

  const cancelBuild = () => {
    socketRef.current?.emit("build:cancel", { projectId, sessionId });
    socketRef.current?.emit("build_cancel", { projectId, sessionId });
    setBuilding(false);
    setCollapsedStatus(true);
  };

  const fileTree = deriveFileTree(files);
  const hasFiles = Object.keys(files).length > 0;
  const deviceWidths: Record<typeof device, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "390px",
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* LEFT PANEL */}
      <aside className="flex h-full w-[40%] min-w-[400px] flex-col border-r border-border bg-card/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Lampcode AI</span>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">{projectId}</span>
        </div>

        {/* Activity area */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {buildError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Build failed</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{buildError}</p>
                </div>
              </motion.div>
            ) : !collapsedStatus ? (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {building && !hasReceivedEvents ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    Waiting for agent to start...
                  </div>
                ) : (
                  steps.map((s) => <StepCard key={s.key} step={s} />)
                )}
                {building && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={cancelBuild}
                  >
                    <X className="h-3.5 w-3.5" /> Cancel Build
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">Build complete</span>
                <button
                  onClick={() => setCollapsedStatus(false)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Details
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Prompt box — always visible */}
        <div className="border-t border-border p-3">
          <div className="rounded-xl border border-border bg-card">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Lampcode to make changes..."
              className="min-h-[80px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1">
                <IconBtn title="Screenshot"><ImageIcon className="h-4 w-4" /></IconBtn>
                <IconBtn title="URL"><LinkIcon className="h-4 w-4" /></IconBtn>
                <IconBtn title="Attach"><Paperclip className="h-4 w-4" /></IconBtn>
              </div>
              <Button size="sm" className="h-8">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <section className="flex h-full flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setTab("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                tab === "preview" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
              {tab === "preview" && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
            <button
              onClick={() => setTab("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                tab === "code" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code2 className="h-3.5 w-3.5" /> Code
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {tab === "preview" && (
              <div className="flex rounded-lg border border-border bg-card p-0.5">
                {([
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const).map(([d, Icon]) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={cn(
                      "rounded-md p-1.5 transition",
                      device === d ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    title={d}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!previewUrl}
              onClick={() => previewUrl && window.open(previewUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8">
                  <Github className="h-3.5 w-3.5" /> Publish
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Rocket className="h-4 w-4" /> Deploy to Vercel
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Github className="h-4 w-4" /> Push to GitHub
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-muted/20">
          {tab === "preview" ? (
            <div className="flex h-full items-center justify-center p-4">
              <div
                className="h-full overflow-hidden rounded-lg border border-border bg-background shadow-xl transition-all"
                style={{ width: deviceWidths[device], maxWidth: "100%" }}
              >
                {building ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    Building your app...
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title="preview"
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Eye className="h-6 w-6 opacity-30" />
                    Preview will appear when the build completes
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* File tree */}
              <div className="w-60 shrink-0 overflow-y-auto border-r border-border bg-card/30 p-2 text-sm">
                {!hasFiles ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {building ? "Generating files…" : "No files yet"}
                  </div>
                ) : (
                  fileTree.map((folder) => (
                    <div key={folder.name}>
                      <button
                        onClick={() =>
                          setOpenFolders((p) => ({ ...p, [folder.name]: !p[folder.name] }))
                        }
                        className="flex w-full items-center gap-1 rounded px-2 py-1 hover:bg-accent"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform",
                            openFolders[folder.name] && "rotate-90",
                          )}
                        />
                        {openFolders[folder.name] ? (
                          <FolderOpen className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>{folder.name}</span>
                      </button>
                      {openFolders[folder.name] && (
                        <div className="ml-4">
                          {folder.children.map((f) => (
                            <button
                              key={f.path}
                              onClick={() => setActiveFile(f.path)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-accent",
                                activeFile === f.path && "bg-accent text-foreground",
                              )}
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Code viewer */}
              <div className="flex-1 overflow-auto">
                {!activeFile || !files[activeFile] ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {building ? "Generating code…" : "Select a file to view its code"}
                  </div>
                ) : (
                  <>
                    <div className="border-b border-border bg-card/30 px-3 py-1.5 text-xs text-muted-foreground">
                      {activeFile}
                    </div>
                    <SyntaxHighlighter
                      language={files[activeFile].lang ?? langForPath(activeFile)}
                      style={vscDarkPlus}
                      showLineNumbers
                      customStyle={{ margin: 0, background: "transparent", fontSize: 13 }}
                    >
                      {files[activeFile].code}
                    </SyntaxHighlighter>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        step.status === "running" && "border-primary/40",
        step.status === "done" && "border-emerald-500/30",
        step.status === "pending" && "border-border opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded",
            step.status === "done" && "bg-emerald-500/15 text-emerald-500",
            step.status === "running" && "bg-primary/15 text-primary",
            step.status === "pending" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium">{step.label}</span>
        <div className="ml-auto">
          {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {step.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      {step.detail && step.status !== "pending" && (
        <p className="mt-1.5 pl-8 text-xs text-muted-foreground">{step.detail}</p>
      )}
      {step.status === "running" && (
        <Progress value={step.progress} className="mt-2 h-1" />
      )}
    </motion.div>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
