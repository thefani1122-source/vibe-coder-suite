import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { motion, AnimatePresence } from "framer-motion";
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
  component: WorkspacePage,
});

function WorkspacePage() {
  return (
    <RequireAuth>
      <WorkspacePageInner />
    </RequireAuth>
  );
}

type StepStatus = "pending" | "running" | "done";
type Step = {
  key: string;
  label: string;
  icon: typeof Brain;
  detail?: string;
  status: StepStatus;
  progress: number;
};

const INITIAL_STEPS: Step[] = [
  { key: "plan", label: "Planning", icon: Brain, detail: "Writing project brief", status: "pending", progress: 0 },
  { key: "db", label: "Database", icon: Database, status: "pending", progress: 0 },
  { key: "fe", label: "Frontend", icon: Palette, detail: "Creating login page", status: "pending", progress: 0 },
  { key: "be", label: "Backend", icon: Settings2, status: "pending", progress: 0 },
  { key: "sec", label: "Security", icon: Shield, status: "pending", progress: 0 },
  { key: "conn", label: "Connection", icon: Link2, status: "pending", progress: 0 },
  { key: "deploy", label: "Deploy", icon: Rocket, status: "pending", progress: 0 },
];

const MOCK_FILES: Record<string, { lang: string; code: string }> = {
  "app/page.tsx": {
    lang: "tsx",
    code: `export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">Welcome to your app</h1>
    </main>
  );
}
`,
  },
  "app/layout.tsx": {
    lang: "tsx",
    code: `export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  },
  "components/Button.tsx": {
    lang: "tsx",
    code: `export function Button({ children }: { children: React.ReactNode }) {
  return <button className="rounded-md bg-primary px-4 py-2">{children}</button>;
}
`,
  },
  "lib/utils.ts": {
    lang: "ts",
    code: `export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}
`,
  },
};

const FILE_TREE = [
  {
    name: "app",
    children: [
      { name: "page.tsx", path: "app/page.tsx" },
      { name: "layout.tsx", path: "app/layout.tsx" },
    ],
  },
  {
    name: "components",
    children: [{ name: "Button.tsx", path: "components/Button.tsx" }],
  },
  {
    name: "lib",
    children: [{ name: "utils.ts", path: "lib/utils.ts" }],
  },
];

function WorkspacePageInner() {
  const { projectId } = useParams({ from: "/workspace/$projectId" });
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [building, setBuilding] = useState(true);
  const [collapsedStatus, setCollapsedStatus] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeFile, setActiveFile] = useState("app/page.tsx");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    app: true,
    components: true,
    lib: true,
  });
  const [prompt, setPrompt] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!building) return;
    let i = 0;
    timerRef.current = setInterval(() => {
      setSteps((prev) => {
        const next = [...prev];
        const idx = next.findIndex((s) => s.status !== "done");
        if (idx === -1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setBuilding(false);
          setTimeout(() => setCollapsedStatus(true), 800);
          return next;
        }
        const s = { ...next[idx] };
        if (s.status === "pending") s.status = "running";
        s.progress = Math.min(100, s.progress + 20 + Math.random() * 15);
        if (s.progress >= 100) {
          s.progress = 100;
          s.status = "done";
        }
        next[idx] = s;
        return next;
      });
      i++;
      if (i > 200 && timerRef.current) clearInterval(timerRef.current);
    }, 350);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [building]);

  const cancelBuild = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setBuilding(false);
    setCollapsedStatus(true);
  };

  const previewUrl = `https://example.com/preview/${projectId}`;
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
            {!collapsedStatus ? (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {steps.map((s) => (
                  <StepCard key={s.key} step={s} />
                ))}
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
              onClick={() => window.open(previewUrl, "_blank")}
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
                ) : (
                  <iframe
                    src="about:blank"
                    title="preview"
                    className="h-full w-full"
                    srcDoc={`<!doctype html><html><body style="margin:0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff"><div style="text-align:center"><h1>🚀 Your App</h1><p style="opacity:.6">Live preview · ${projectId}</p></div></body></html>`}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* File tree */}
              <div className="w-60 shrink-0 overflow-y-auto border-r border-border bg-card/30 p-2 text-sm">
                {FILE_TREE.map((folder) => (
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
                ))}
              </div>
              {/* Code viewer */}
              <div className="flex-1 overflow-auto">
                <div className="border-b border-border bg-card/30 px-3 py-1.5 text-xs text-muted-foreground">
                  {activeFile}
                </div>
                <SyntaxHighlighter
                  language={MOCK_FILES[activeFile].lang}
                  style={vscDarkPlus}
                  showLineNumbers
                  customStyle={{ margin: 0, background: "transparent", fontSize: 13 }}
                >
                  {MOCK_FILES[activeFile].code}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

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