import { useEffect, useState, type ReactNode } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { AgentMarkdown } from "@/components/AgentText";
import type { BuildMessage } from "./ChatPanel";
import { type Group } from "@/lib/build-timeline";

export { groupRows } from "@/lib/build-timeline";
export type { Group };

export function ArchivedGroup({
  messages,
  renderMessage,
}: {
  messages: BuildMessage[];
  renderMessage: (message: BuildMessage) => ReactNode;
}) {
  const files = new Set(
    messages.filter((m) => m.type === "file_write").map((m) => m.path ?? m.text),
  );
  const steps = messages.filter((m) => m.type === "tool_call" || m.type === "tool_result").length;
  const failed = messages.some((m) => m.activityStatus === "failed" || m.type === "error");

  const parts: string[] = [];
  if (files.size > 0) parts.push(`${files.size} ${files.size === 1 ? "file" : "files"}`);
  if (steps > 0) parts.push(`${steps} ${steps === 1 ? "step" : "steps"}`);
  const summary = parts.length > 0 ? parts.join(" \u00B7 ") : "earlier work";

  return (
    <details className="group/old px-1">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 transition-transform group-open/old:rotate-90"
        />
        {failed
          ? `Earlier build \u2014 ${summary}, with problems`
          : `Earlier build \u2014 ${summary}`}
      </summary>
      <div className="mt-2 flex flex-col gap-3 border-l border-white/10 pl-3">
        {messages.map((message) => (
          <div key={message.id}>{renderMessage(message)}</div>
        ))}
      </div>
    </details>
  );
}

/**
 * The single live line. It names the step in progress, which is the thing the
 * three bouncing dots it replaces could never say.
 */
/**
 * How long the step running right now has been going.
 *
 * It sits on the step's own row rather than on a line of its own. A clock
 * matters most on a long step, and that is exactly the row a person is already
 * looking at — a slow step and a stuck one are identical without it.
 */
export function ElapsedTime({ since }: { since: number }) {
  const [seconds, setSeconds] = useState(() => Math.floor((Date.now() - since) / 1000));
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - since) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [since]);

  if (seconds < 3) return null;
  const text = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  return (
    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
      {text}
    </span>
  );
}

/**
 * The live line, for the one kind of activity that has no row of its own:
 * a pipeline status such as "Starting the preview…". Reasoning gets a row and
 * a running tool gets a row, and putting either here as well is what showed
 * the same sentence twice.
 */
export function ActivityLine({ activity }: { activity: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      <Loader2 aria-hidden="true" className="h-3 w-3 shrink-0 animate-spin text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {activity}
        <span className="animate-pulse">{"\u2026"}</span>
      </span>
    </div>
  );
}

/**
 * The completion summary and every agent message share one safe renderer
 * (AgentText.tsx). It reads like the agent talks — short paragraphs, dash
 * bullets, bold names, inline code — and normalizes the odd markdown table
 * or fenced block a provider still emits instead of showing raw pipes.
 * Elements are built, never injected as HTML.
 */
export function SummaryText({ text }: { text: string }) {
  return <AgentMarkdown text={text} />;
}
