import { useEffect, useState, type ReactNode } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
 * The model writes its closing summary in Markdown, because models do. It was
 * being printed raw, so a user read "**Features implemented:**" asterisks and
 * all, with every bullet run together in one block.
 *
 * This is not a Markdown implementation and should not become one. It covers
 * what these summaries actually contain — bold runs, dash bullets, blank-line
 * paragraphs — and anything else is shown as the plain text it already is.
 * Elements are built, never injected as HTML, so a summary cannot carry markup
 * into the page.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-white/95">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={`${keyPrefix}-${i}`}>{part}</span>
      ),
    );
}

export function SummaryText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-1 flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="select-none text-white/30">
              •
            </span>
            <span className="min-w-0 flex-1">{renderInline(item, `b-${blocks.length}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet?.[1]) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (!line) continue;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className={cn("break-words", heading && "font-semibold text-white/95")}
      >
        {renderInline(heading?.[1] ?? line, `p-${blocks.length}`)}
      </p>,
    );
  }
  flushBullets();

  return <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/80">{blocks}</div>;
}
