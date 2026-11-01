import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Check, AlertCircle, XCircle, ChevronRight, Sparkles } from "lucide-react";
import { DiffView, type FileDiff } from "./DiffView";
import { latestThoughtLine } from "@/lib/build-timeline";
import { splitReasoningParagraphs } from "@/lib/build-activity";
import { groupRows, ArchivedGroup, ActivityLine, ElapsedTime, SummaryText } from "./BuildTimeline";
export interface BuildMessage {
  id: string;
  type: "thinking" | "text" | "tool_call" | "tool_result" | "file_write" | "assistant" | "error";
  text: string;
  /** "user" → right-aligned bubble; anything else (default) → left-aligned agent output */
  role?: "user" | "agent";
  tool?: string;
  path?: string;
  done?: boolean;
  activityStatus?: "running" | "done" | "failed";
  details?: string;
  streaming?: boolean;
  files?: string[];
  hint?: string;
  /** Belongs to a build that has already finished. Set when a follow-up build
   *  starts, so a replay for the NEW session cannot clear it, and so a
   *  finished build can be folded away instead of deleted. */
  archived?: boolean;
  /** "+12 −3" for a step that changed files. */
  delta?: string;
  /** What the step actually changed, computed by the backend from the files
   *  before and after it ran. */
  diffs?: FileDiff[];
  /** Diffs existed but were too large to keep; the counts are still right. */
  diffsDropped?: boolean;
  /** The model's own id for the tool call this row represents. A result
   *  settles the row with the SAME id; matching on the tool name alone picked
   *  whichever row ran last, which is the wrong one as soon as one tool is
   *  called twice. */
  toolCallId?: string;
  /** When this step began, for the clock on a running row. */
  startedAt?: number;
  /** Total elapsed time in ms once step/thinking finishes. */
  durationMs?: number;
}

interface ChatPanelProps {
  messages: BuildMessage[];
  isBuilding: boolean;
  /** The one thing happening right now, in present tense ("Editing
   *  src/App.tsx"). Replaces three bouncing dots that said only that
   *  something, somewhere, was happening. */
  activity?: string | null;
  currentAgent?: string;
  className?: string;
  projectName?: string;
  /** Rendered after the last message, inside the scroll area. A slot rather
   *  than a typed prop so the panel stays a dumb renderer: what currently goes
   *  here is the completion report, and it belongs at the END of the stream
   *  because it is a verdict on everything above it. */
  footer?: ReactNode;
}

export function ChatPanel({
  messages,
  isBuilding,
  activity,
  currentAgent,
  className,
  projectName,
  footer,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  void currentAgent;
  void projectName;

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, footer, activity]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const lastMsg = messages[messages.length - 1];
  const showDots = isBuilding && messages.length === 0;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
      >
        {messages.length === 0 && !isBuilding && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-3xl">⚡</span>
            <p className="text-sm text-muted-foreground">Start a build to see agent output</p>
          </div>
        )}

        {showDots && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="skeleton-shimmer h-3 w-28" />
                <div className="skeleton-shimmer h-16 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {groupRows(messages).map((group) => {
          if (group.kind === "archived") {
            return (
              <ArchivedGroup
                key={group.key}
                messages={group.messages}
                renderMessage={(message) => <MessageRow msg={message} isLast={false} />}
              />
            );
          }

          return (
            <MessageRow
              key={group.message.id}
              msg={group.message}
              isLast={group.message.id === lastMsg?.id}
            />
          );
        })}

        {isBuilding && activity?.trim() && <ActivityLine activity={activity.trim()} />}

        {footer}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/**
 * The builder's reasoning, shown the way a terminal shows it: while the
 * thought streams, ONE dim line that names it and a live preview of the
 * sentence being written right now; when it settles, the line reads
 * "Thought for Ns" and the full text hides behind it.
 *
 * This row has been three things before. A violet card with an uppercase
 * THOUGHTS header; then one card per paragraph, a stack of boxes; then a box
 * with a mono scroll pane inside a scrolling transcript, which hid the text.
 * What the transcript actually wants is the least chrome possible: a plain
 * line, and readable prose when it is opened. The expanded view is therefore
 * normal paragraphs — NOT mono, NOT clamped — and follows the stream to the
 * bottom while it is open, the way the transcript itself does.
 */
function ThinkingRow({ msg }: { msg: BuildMessage }) {
  const isStreaming = msg.streaming === true;
  const startedAt = msg.startedAt ?? Date.now();
  const [elapsed, setElapsed] = useState(() => Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
  const [isOpen, setIsOpen] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setElapsed(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming, startedAt]);

  // While open, follow the stream to the latest paragraph. The transcript's
  // own follow-the-bottom effect keeps the collapsed view pinned; the expanded
  // view needs its own.
  useEffect(() => {
    if (isStreaming && isOpen && textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [msg.text, isStreaming, isOpen]);

  const finalSec = msg.durationMs
    ? Math.max(1, Math.round(msg.durationMs / 1000))
    : elapsed;

  const formatTime = (sec: number) => {
    if (sec >= 60) {
      const mins = Math.floor(sec / 60);
      const rem = sec % 60;
      return `${mins}m ${rem}s`;
    }
    return `${sec}s`;
  };

  const label = isStreaming ? "Thinking" : `Thought for ${formatTime(finalSec)}`;

  // The sentence being written right now. latestThoughtLine declines
  // headings, code and JSON fragments rather than showing them as glitches,
  // and returns null while the text is too thin to read — the row simply
  // shows the label alone for that beat.
  const preview = latestThoughtLine(msg.text ?? "");

  const paragraphs = splitReasoningParagraphs(msg.text ?? "");

  return (
    <div className="my-1 text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left select-none text-muted-foreground hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {isStreaming ? (
          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
        ) : (
          <Sparkles className="h-3 w-3 text-white/35 shrink-0" />
        )}
        <span className="font-mono text-[11px] text-white/60 shrink-0">{label}</span>
        {isStreaming && (
          <span className="font-mono text-[10px] tabular-nums text-white/35 shrink-0">
            {formatTime(elapsed)}
          </span>
        )}
        {isStreaming && !isOpen && preview && (
          <span className="min-w-0 flex-1 truncate text-[12px] italic text-white/40">
            {preview}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-white/40">
          {isOpen ? "Hide" : "Show"}
          <ChevronRight
            aria-hidden="true"
            className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-90")}
          />
        </span>
      </button>

      {isOpen && (
        <div
          ref={textRef}
          className="mt-0.5 ml-[22px] flex max-h-72 flex-col gap-2 overflow-y-auto border-l border-white/8 pl-3 py-1 text-[13px] leading-relaxed text-white/55 select-text scrollbar-thin scrollbar-thumb-white/10"
        >
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, i) => (
              <p key={i} className="whitespace-pre-wrap break-words">
                {paragraph}
                {isStreaming && i === paragraphs.length - 1 && <BlinkCursor />}
              </p>
            ))
          ) : (
            <p className="italic text-white/30">
              Thinking…
              {isStreaming && <BlinkCursor />}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MessageRow({ msg, isLast }: { msg: BuildMessage; isLast: boolean }) {
  const showCursor = isLast && msg.streaming === true;

  switch (msg.type) {
    case "thinking":
      return <ThinkingRow msg={msg} />;

    case "text": {
      if (msg.role === "user") {
        return (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl bg-white/[0.08] px-4 py-2.5">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                {msg.text}
              </p>
            </div>
          </div>
        );
      }
      return (
        <div className="px-1">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
            {msg.text}
            {showCursor && <BlinkCursor />}
          </p>
        </div>
      );
    }

    case "tool_call":
    case "tool_result": {
      const status = msg.activityStatus ?? (msg.done ? "done" : "running");
      const isDone = status === "done";
      const isFailed = status === "failed";
      // `text` is the human label from describeToolActivity ("Writing 4 files");
      // `tool` is the raw identifier, kept only so build:tool_result can match
      // this row to the call that produced it. Preferring `tool` here — which is
      // what this line used to do — put `check_page` and `write_files` back in
      // front of the user and silently defeated the whole label map. The raw
      // name is the last resort, never the first choice.
      const label = msg.text?.trim() || msg.tool || "Working on a step";
      const diffs = msg.diffs ?? [];
      return (
        <div
          className={cn(
            "min-w-0 rounded-lg border px-3 py-2",
            isFailed
              ? "border-rose-500/35 bg-rose-500/10"
              : isDone
                ? "border-border/40 bg-muted/10"
                : "border-primary/20 bg-primary/5",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {isFailed ? (
              <XCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            ) : isDone ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Loader2
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
              />
            )}
            <span
              aria-label={`${label}: ${status}`}
              className={cn(
                "min-w-0 flex-1 break-words text-xs leading-relaxed",
                isFailed
                  ? "font-medium text-rose-300"
                  : isDone
                    ? "text-muted-foreground"
                    : "text-foreground/90",
              )}
            >
              {label}
            </span>
            {msg.delta && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {msg.delta}
              </span>
            )}
            {status === "running" && msg.startedAt && <ElapsedTime since={msg.startedAt} />}
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                isFailed ? "text-rose-300" : isDone ? "text-muted-foreground" : "text-primary",
              )}
            >
              {isFailed ? "Failed" : isDone ? "Done" : "Running"}
            </span>
          </div>

          {diffs.length > 0 && (
            <details className="group/diff mt-2">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronRight
                  aria-hidden="true"
                  className="h-3 w-3 transition-transform group-open/diff:rotate-90"
                />
                {diffs.length === 1 ? "View change" : `View ${diffs.length} changes`}
              </summary>
              {diffs.map((diff) => (
                <DiffView key={diff.path} diff={diff} />
              ))}
            </details>
          )}

          {/* Said out loud rather than silently showing nothing: a step that
              changed files but has no diff to show is a limit of the display,
              not a step that did nothing. */}
          {diffs.length === 0 && msg.diffsDropped && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              This change was too large to keep a line-by-line view of.
            </p>
          )}
          {msg.details && (
            <details className="mt-2 border-t border-border/40 pt-2 text-xs">
              <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Show details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                {msg.details}
              </pre>
            </details>
          )}
        </div>
      );
    }

    case "file_write":
      return (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          <span className="shrink-0">📄</span>
          <span className="truncate">{msg.path ?? msg.text}</span>
        </div>
      );

    case "assistant":
      return (
        <div className="flex items-start gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-[10px] font-bold text-orange-400 mt-0.5">
            L
          </div>
          <div className="min-w-0 flex-1">
            <SummaryText text={msg.text} />
            {showCursor && <BlinkCursor />}
            {msg.files && msg.files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.files.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    📄 {f}
                  </span>
                ))}
              </div>
            )}
            {msg.hint && (
              <p className="mt-2 text-xs text-white/30 border-t border-white/5 pt-2">
                💡 {msg.hint}
              </p>
            )}
          </div>
        </div>
      );

    case "error":
      return (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="break-words text-xs leading-relaxed text-destructive">{msg.text}</p>
        </div>
      );

    default:
      return null;
  }
}

function BlinkCursor() {
  return (
    <span className="ml-px inline-block h-[0.85em] w-px animate-pulse align-text-bottom bg-current" />
  );
}
