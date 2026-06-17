import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowUp,
  Sparkles,
  Link2,
  ChevronDown,
  Zap,
  ClipboardList,
  Code2,
  X,
  Figma,
  Check,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Mode = "fast" | "plan" | "editor";
const MODES: { id: Mode; label: string; icon: typeof Zap; soon?: boolean; desc: string }[] = [
  { id: "fast", label: "Fast Mode", icon: Zap, desc: "Quick build for simple projects (2–5 min)" },
  { id: "plan", label: "Plan Mode", icon: ClipboardList, desc: "Full multi-agent build with verification (15–30 min)" },
  { id: "editor", label: "Editor Mode", icon: Code2, soon: true, desc: "Tweak code directly" },
];

const IDEA_PROMPTS = [
  "a counter app with dark mode",
  "a Pomodoro timer with stats",
  "a recipe finder with search",
  "a kanban board for tasks",
  "a markdown notes app",
  "a habit tracker dashboard",
  "a weather widget with charts",
  "a personal finance tracker",
];

const QUICK_IDEAS = [
  "Counter app",
  "Pomodoro timer",
  "Kanban board",
  "Markdown notes",
  "Weather widget",
  "Habit tracker",
];

export function PromptComposer() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("fast");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; file: File; url?: string }[]>([]);
  const [animatedIdea, setAnimatedIdea] = useState("");
  const [ideaIndex, setIdeaIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Animate rotating placeholder ideas (typewriter)
  useEffect(() => {
    if (value.trim()) {
      setAnimatedIdea("");
      return;
    }
    const target = IDEA_PROMPTS[ideaIndex % IDEA_PROMPTS.length];
    let i = 0;
    let cancelled = false;
    setAnimatedIdea("");
    const typer = setInterval(() => {
      if (cancelled) return;
      i++;
      setAnimatedIdea(target.slice(0, i));
      if (i >= target.length) clearInterval(typer);
    }, 55);
    const next = setTimeout(() => setIdeaIndex((x) => x + 1), 3200);
    return () => {
      cancelled = true;
      clearInterval(typer);
      clearTimeout(next);
    };
  }, [ideaIndex, value]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).slice(0, 5).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...next].slice(0, 5));
    if (next.length) toast.success(`${next.length} file${next.length > 1 ? "s" : ""} attached`);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const submit = async () => {
    if (!value.trim() || submitting) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);
    try {
      const projectRes = await apiPost<Record<string, unknown>>("/api/projects", {
        name: value.trim().slice(0, 50),
        mode,
      });

      // Backend wraps response as { project: { id } }; fall back to flat shapes too
      const pid =
        ((projectRes?.project as Record<string, unknown>)?.id
        ?? projectRes?.id
        ?? projectRes?.projectId
        ?? projectRes?.project_id) as string | undefined;

      if (!pid) {
        throw new Error(`No project ID in server response — got: ${JSON.stringify(projectRes)}`);
      }

      const buildPath = mode === "plan" ? "/api/plan/start" : "/api/build/fast";
      const buildRes = await apiPost<Record<string, unknown>>(buildPath, {
        project_id: pid,
        prompt: value.trim(),
      });

      // Backend may wrap as { session: { sessionId } }; fall back to flat shapes too
      const sessionId =
        ((buildRes?.session as Record<string, unknown>)?.sessionId
        ?? (buildRes?.session as Record<string, unknown>)?.session_id
        ?? buildRes?.sessionId
        ?? buildRes?.session_id) as string | undefined;

      setSubmitting(false);
      if (mode === "plan") {
        if (!sessionId) throw new Error("No session ID from /api/plan/start");
        navigate({
          to: "/plan/$sessionId",
          params: { sessionId },
          search: { projectId: pid },
        });
      } else {
        // Preserve the user's original prompt so the workspace can render it
        // as the first chat bubble (Lovable parity).
        if (sessionId && typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(`prompt:${sessionId}`, value.trim());
          } catch { /* ignore quota / privacy mode */ }
        }
        navigate({
          to: "/workspace/$projectId",
          params: { projectId: pid },
          search: { sessionId, mode: "fast" },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start build";
      if (!(err instanceof ApiError)) {
        toast.error(msg);
      }
      setSubmitting(false);
    }
  };

  const current = MODES.find((m) => m.id === mode)!;
  const CurrentIcon = current.icon;

  return (
    <TooltipProvider delayDuration={150}>
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          Powered by Lampcode AI
        </div>
        <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          What should we build today
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Describe an app, paste a screenshot, or drop a file — we&apos;ll vibe it into existence.
        </p>
      </div>

      <div className="group relative w-full rounded-2xl border border-border bg-card/60 shadow-2xl shadow-black/40 backdrop-blur-xl transition focus-within:border-primary/60 focus-within:shadow-[var(--shadow-glow)]">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {attachments.map((a) => (
              <div key={a.id} className="group/att relative flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-1.5 pr-2">
                {a.url ? (
                  <img src={a.url} alt={a.file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-content-center rounded bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                )}
                <div className="flex max-w-[140px] flex-col text-xs">
                  <span className="truncate font-medium">{a.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{(a.file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="ml-1 grid h-5 w-5 place-content-center rounded-full bg-background/80 text-muted-foreground opacity-0 transition group-hover/att:opacity-100 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={value ? "" : `Build me ${animatedIdea}${animatedIdea ? "|" : "a..."}`}
          className="min-h-[120px] resize-none border-0 bg-transparent px-5 pt-5 pb-2 text-base shadow-none focus-visible:ring-0"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {urlOpen && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            />
            <Button size="sm" className="h-7 rounded-md px-3 text-xs" onClick={() => { if (url) { toast.success("URL added"); setUrl(""); setUrlOpen(false); } }}>Add</Button>
            <button type="button" onClick={() => { setUrlOpen(false); setUrl(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Attach images or files</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toast("Import from URL — coming soon!")}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Import from URL</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toast("Figma import — coming soon!")}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <Figma className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Figma</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs font-medium text-foreground/90 hover:bg-card transition">
                <CurrentIcon className="h-3.5 w-3.5 text-primary" />
                {current.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {MODES.map((m, i) => {
                const Icon = m.icon;
                const selected = mode === m.id;
                return (
                  <div key={m.id}>
                    {i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      disabled={m.soon}
                      onClick={() => !m.soon && setMode(m.id)}
                      className="flex items-start gap-2 py-2.5"
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{m.label}</span>
                          {m.soon && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                              Coming Soon
                            </span>
                          )}
                          {selected && !m.soon && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            disabled={!value.trim() || submitting}
            onClick={submit}
            className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {QUICK_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => setValue(`Build me a ${idea.toLowerCase()}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-card hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 text-primary/70" />
            {idea}
          </button>
        ))}
      </div>

    </div>
    </TooltipProvider>
  );
}