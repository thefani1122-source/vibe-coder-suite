import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Loader2, Check, AlertCircle, XCircle } from "lucide-react"
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
}

interface ChatPanelProps {
  messages: BuildMessage[]
  isBuilding: boolean
  currentAgent?: string
  className?: string
  projectName?: string
  /** Rendered after the last message, inside the scroll area. A slot rather
   *  than a typed prop so the panel stays a dumb renderer: what currently goes
   *  here is the completion report, and it belongs at the END of the stream
   *  because it is a verdict on everything above it. */
  footer?: ReactNode
}

export function ChatPanel({ messages, isBuilding, currentAgent, className, projectName, footer }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  void currentAgent
  void projectName

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, footer])

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

        {messages.map((msg, i) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            isLast={i === messages.length - 1}
          />
        ))}

        {/* Loading dots while socket build is active */}
        {isBuilding && lastMsg && !lastMsg.streaming && (
          <div className="flex gap-1 items-center px-1 py-2">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}

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
  return (
    <p
      data-thought=""
      className="whitespace-pre-wrap break-words px-1 text-xs italic leading-relaxed text-white/45 [p[data-thought]+&]:-mt-1"
    >
      {text}{showCursor && <BlinkCursor />}
    </p>
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
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                isFailed ? "text-rose-300" : isDone ? "text-muted-foreground" : "text-primary",
              )}
            >
              {isFailed ? "Failed" : isDone ? "Done" : "Running"}
            </span>
          </div>
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
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
              {msg.text}
              {showCursor && <BlinkCursor />}
            </p>
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
