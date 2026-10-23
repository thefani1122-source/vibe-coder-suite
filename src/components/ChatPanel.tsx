import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Loader2, Check, AlertCircle, XCircle, ChevronRight } from "lucide-react"
import { DiffView, type FileDiff } from "./DiffView"
import { activityFromReasoning } from "@/lib/build-timeline"
import {
  groupRows,
  ArchivedGroup,
  ActivityLine,
  SummaryText,
} from "./BuildTimeline"
export interface BuildMessage {
  id: string
  type: "thinking" | "text" | "tool_call" | "tool_result" | "file_write" | "assistant" | "error"
  text: string
  /** "user" → right-aligned bubble; anything else (default) → left-aligned agent output */
  role?: "user" | "agent"
  tool?: string
  path?: string
  done?: boolean
  activityStatus?: "running" | "done" | "failed"
  details?: string
  streaming?: boolean
  files?: string[]
  hint?: string
  /** Belongs to a build that has already finished. Set when a follow-up build
   *  starts, so a replay for the NEW session cannot clear it, and so a
   *  finished build can be folded away instead of deleted. */
  archived?: boolean
  /** "+12 −3" for a step that changed files. */
  delta?: string
  /** What the step actually changed, computed by the backend from the files
   *  before and after it ran. */
  diffs?: FileDiff[]
  /** Diffs existed but were too large to keep; the counts are still right. */
  diffsDropped?: boolean
}

interface ChatPanelProps {
  messages: BuildMessage[]
  isBuilding: boolean
  /** The one thing happening right now, in present tense ("Editing
   *  src/App.tsx"). Replaces three bouncing dots that said only that
   *  something, somewhere, was happening. */
  activity?: string | null
  currentAgent?: string
  className?: string
  projectName?: string
  /** Rendered after the last message, inside the scroll area. A slot rather
   *  than a typed prop so the panel stays a dumb renderer: what currently goes
   *  here is the completion report, and it belongs at the END of the stream
   *  because it is a verdict on everything above it. */
  footer?: ReactNode
}

export function ChatPanel({ messages, isBuilding, activity, currentAgent, className, projectName, footer }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  void currentAgent
  void projectName

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, footer, activity])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  const lastMsg = messages[messages.length - 1]
  const showDots = isBuilding && messages.length === 0

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
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="skeleton-shimmer h-3 w-28" />
                <div className="skeleton-shimmer h-16 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {groupRows(messages).map(group => {
          if (group.kind === "archived") {
            return (
              <ArchivedGroup
                key={group.key}
                messages={group.messages}
                renderMessage={message => <MessageRow msg={message} isLast={false} />}
              />
            )
          }

          return (
            <MessageRow
              key={group.message.id}
              msg={group.message}
              isLast={group.message.id === lastMsg?.id}
            />
          )
        })}

        {isBuilding && <ActivityLine activity={activity} />}

        {footer}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/**
 * One paragraph of the builder's reasoning, as flowing text.
 *
 * This was a card: a violet-tinted box with a 💡, an uppercase THOUGHTS
 * header, a chevron, and the text clamped inside a 200px scroll pane. Two
 * things were wrong with it, and the second only appeared after the first
 * attempt at a fix.
 *
 * The box itself was the complaint — reasoning arrived all at once inside a
 * container the user could not comfortably read, which is the opposite of
 * watching someone think. Then the stream was split into one message per
 * paragraph to make it readable, and because each message rendered its own
 * card, a long stretch of reasoning became a STACK of violet boxes, each with
 * its own header and its own scrollbar. Strictly worse than the one box.
 *
 * So the chrome goes. Thinking is dim italic prose in the transcript, with
 * nothing around it, the way a terminal shows it — the split now does what it
 * was meant to do, because consecutive paragraphs simply read as paragraphs.
 * No clamp either: the transcript already scrolls, and a scroll pane inside a
 * scrolling transcript is what hid the text in the first place.
 */
function ThoughtParagraph({ msg, isLast }: { msg: BuildMessage; isLast: boolean }) {
  const showCursor = isLast && msg.streaming === true
  const text = msg.text?.trim() ?? ""
  if (!text) return null

  // The transcript puts gap-3 between every message, which is right between a
  // thought and a tool row and too loose between two paragraphs of the SAME
  // thought — at that distance one train of reasoning reads as several
  // unrelated remarks. A thought that directly follows another closes up to
  // ordinary paragraph spacing; the first one after anything else keeps the
  // full gap.
  // ONE LINE, kept in the transcript, with the rest behind a chevron.
  //
  // This is the shape the whole panel was missing. Two earlier attempts both
  // failed at the same point: the first put the reasoning in a box, which was
  // unreadable, and the second hid ALL of it behind a single fold, which
  // removed the running commentary entirely and left only tool rows and a
  // status line that vanished. What a person reads as "the agent telling me
  // what it is doing" is one short line per thought, sitting between the
  // actions, and that is what this renders.
  //
  // It is a line, not a card: no border, no header, no scroll pane. That
  // distinction is what went wrong the first time and it is worth keeping in
  // mind before anyone adds chrome here.
  const line = activityFromReasoning(text) ?? text
  const hasMore = text.length > line.length + 8

  if (!hasMore) {
    return (
      <p data-thought="" className="break-words px-1 text-xs leading-relaxed text-white/55">
        {line}{showCursor && <BlinkCursor />}
      </p>
    )
  }

  return (
    <details data-thought="" className="group/thought px-1">
      <summary className="flex cursor-pointer list-none items-start gap-1 text-xs leading-relaxed text-white/55 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          aria-hidden="true"
          className="mt-[3px] h-3 w-3 shrink-0 text-white/30 transition-transform group-open/thought:rotate-90"
        />
        <span className="min-w-0 flex-1 break-words">
          {line}{showCursor && <BlinkCursor />}
        </span>
      </summary>
      <p className="mt-1 whitespace-pre-wrap break-words pl-4 text-xs italic leading-relaxed text-white/40">
        {text}
      </p>
    </details>
  )
}

function MessageRow({
  msg,
  isLast,
}: {
  msg: BuildMessage
  isLast: boolean
}) {
  const showCursor = isLast && msg.streaming === true

  switch (msg.type) {
    case "thinking":
      return <ThoughtParagraph msg={msg} isLast={isLast} />

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
        )
      }
      return (
        <div className="px-1">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
            {msg.text}
            {showCursor && <BlinkCursor />}
          </p>
        </div>
      )
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
              {diffs.map(diff => (
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
      )

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
                {msg.files.map(f => (
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
      )

    case "error":
      return (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="break-words text-xs leading-relaxed text-destructive">{msg.text}</p>
        </div>
      )

    default:
      return null
  }
}

function BlinkCursor() {
  return (
    <span className="ml-px inline-block h-[0.85em] w-px animate-pulse align-text-bottom bg-current" />
  )
}
