import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { apiPost, ApiError } from "@/lib/api";
import { PlanInterview } from "@/components/PlanInterview";
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
  Plus,
  Sparkles,
  Image as ImageIcon,
  Link2,
  ChevronDown,
  Zap,
  ClipboardList,
  Code2,
  X,
  Figma,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ideas = [
  "A neon dashboard for a crypto wallet",
  "Pomodoro timer with lo-fi vibes",
  "Landing page for an AI music label",
  "Habit tracker with streak fireworks",
];

type Mode = "fast" | "plan" | "editor";
const MODES: { id: Mode; label: string; icon: typeof Zap; soon?: boolean; desc: string }[] = [
  { id: "fast", label: "Fast Mode", icon: Zap, desc: "Quick build for simple projects (2–5 min)" },
  { id: "plan", label: "Plan Mode", icon: ClipboardList, desc: "Full multi-agent build with verification (15–30 min)" },
  { id: "editor", label: "Editor Mode", icon: Code2, soon: true, desc: "Tweak code directly" },
];

export function PromptComposer() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("fast");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  void user;

  const submit = async () => {
    if (!value.trim() || submitting) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (mode === "plan") {
      setPlanOpen(true);
      return;
    }
    console.log("[FastMode] 1. Starting submit...");
    setSubmitting(true);
    try {
      console.log("[FastMode] 2. Creating project...");
      const projectRes = await apiPost<Record<string, unknown>>("/api/projects", {
        name: value.trim().slice(0, 50),
        mode: "fast",
      });
      console.log("[FastMode] 3. Project created:", projectRes);

      // Backend wraps response as { project: { id } }; fall back to flat shapes too
      const pid =
        ((projectRes?.project as Record<string, unknown>)?.id
        ?? projectRes?.id
        ?? projectRes?.projectId
        ?? projectRes?.project_id) as string | undefined;
      console.log("[FastMode] 4. Extracted pid:", pid);

      if (!pid) {
        throw new Error(`No project ID in server response — got: ${JSON.stringify(projectRes)}`);
      }

      console.log("[FastMode] 5. Calling /api/build/fast with:", {
        project_id: pid,
        prompt: value.trim(),
      });
      const buildRes = await apiPost<Record<string, unknown>>("/api/build/fast", {
        project_id: pid,
        prompt: value.trim(),
      });
      console.log("[FastMode] 6. Build response:", buildRes);

      // Backend may wrap as { session: { sessionId } }; fall back to flat shapes too
      const sessionId =
        ((buildRes?.session as Record<string, unknown>)?.sessionId
        ?? (buildRes?.session as Record<string, unknown>)?.session_id
        ?? buildRes?.sessionId
        ?? buildRes?.session_id) as string | undefined;
      console.log("[FastMode] 7. Navigating to workspace:", { projectId: pid, sessionId });

      navigate({
        to: "/workspace/$projectId",
        params: { projectId: pid },
        search: { sessionId },
      });
    } catch (err) {
      console.error("[FastMode] Error:", err);
      // Show the actual error — apiPost toasts HTTP errors, but our own throws
      // (e.g. missing pid) were previously swallowed silently.
      const msg = err instanceof Error ? err.message : "Failed to start build";
      // Avoid double-toasting ApiError — those already fire inside apiPost
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
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Build me a..."
          className="min-h-[120px] resize-none border-0 bg-transparent px-5 pt-5 pb-2 text-base shadow-none focus-visible:ring-0"
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
                  onClick={() => fileRef.current?.click()}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => screenshotRef.current?.click()}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Screenshot</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setUrlOpen((v) => !v)}
                  className={cn(
                    "grid h-8 w-8 place-content-center rounded-md transition hover:bg-card",
                    urlOpen ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>URL</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toast("Figma import coming soon")}
                  className="grid h-8 w-8 place-content-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                >
                  <Figma className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Figma</TooltipContent>
            </Tooltip>
            <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
            <input ref={screenshotRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
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
        {ideas.map((i) => (
          <button
            key={i}
            onClick={() => setValue(i)}
            className="rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-card hover:text-foreground"
          >
            {i}
          </button>
        ))}
      </div>
      <PlanInterview
        open={planOpen}
        initialPrompt={value}
        onClose={() => setPlanOpen(false)}
        onComplete={async () => {
          setPlanOpen(false);
          try {
            const project = await apiPost<{ id: string }>("/api/projects", {
              name: value.slice(0, 60) || "New Project",
              description: value,
            })

            const build = await apiPost<{ sessionId: string }>("/api/build/fast", {
              projectId: project.id,
              prompt: value,
              mode: "fast",
            })

            navigate({
              to: "/workspace/$projectId",
              params: { projectId: project.id },
              search: { sessionId: build.sessionId },
            })
          } catch (err) {
            toast.error("Could not start build. Please try again.")
          }
        }}
      />
    </div>
    </TooltipProvider>
  );
}