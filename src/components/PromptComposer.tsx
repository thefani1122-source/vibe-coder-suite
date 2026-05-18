import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { id: "fast", label: "Fast Mode", icon: Zap, desc: "Ship a working app instantly" },
  { id: "plan", label: "Planning Mode", icon: ClipboardList, soon: true, desc: "Plan before building" },
  { id: "editor", label: "Editor Mode", icon: Code2, soon: true, desc: "Tweak code directly" },
];

export function PromptComposer() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("fast");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "vibe coder";

  const current = MODES.find((m) => m.id === mode)!;
  const CurrentIcon = current.icon;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          Powered by Lampcode AI
        </div>
        <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          What should we build today, {firstName}?
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

        {mode === "fast" && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
            <button
              type="button"
              onClick={() => screenshotRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Screenshot
            </button>
            <button
              type="button"
              onClick={() => setUrlOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                urlOpen
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              <Link2 className="h-3.5 w-3.5" /> URL
            </button>
            <button
              type="button"
              onClick={() => toast("Figma import coming soon")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Figma className="h-3.5 w-3.5" /> Figma
            </button>
            <input ref={screenshotRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
          </div>
        )}

        {mode === "fast" && urlOpen && (
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) toast.success(`Attached ${f.name}`); }} />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.72_0.20_35)] p-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-white/10 transition">
                  <CurrentIcon className="h-3.5 w-3.5" />
                  {current.label}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <DropdownMenuItem
                      key={m.id}
                      disabled={m.soon}
                      onClick={() => !m.soon && setMode(m.id)}
                      className="flex items-start gap-2 py-2"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {m.label}
                          {m.soon && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                              Soon
                            </span>
                          )}
                          {mode === m.id && !m.soon && (
                            <span className="ml-auto text-[10px] text-primary">●</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              disabled={!value.trim()}
              className="h-8 w-8 rounded-lg bg-background/20 text-primary-foreground hover:bg-background/30 disabled:opacity-40"
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
    </div>
  );
}