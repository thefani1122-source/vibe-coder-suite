import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, ArrowUp, Image, Globe, Github, Sparkles } from "lucide-react";

const ideas = [
  "A neon dashboard for a crypto wallet",
  "Pomodoro timer with lo-fi vibes",
  "Landing page for an AI music label",
  "Habit tracker with streak fireworks",
];

export function PromptComposer() {
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          Powered by Lampcode AI
        </div>
        <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          What should we build today?
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
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" /> Upload
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="icon"
            disabled={!value.trim()}
            className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
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