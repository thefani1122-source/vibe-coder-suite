import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Loader2, Check, AlertCircle, Lamp } from "lucide-react"

export interface BuildMessage {
  id: string
  type: "thinking" | "text" | "tool_call" | "tool_result" | "file_write" | "error"
  text: string
  /** "user" → right-aligned bubble; anything else (default) → left-aligned agent output */
  role?: "user" | "agent"
  tool?: string
  path?: string
  done?: boolean
  streaming?: boolean
}

interface ChatPanelProps {
  messages: BuildMessage[]
  isBuilding: boolean
  currentAgent?: string
  className?: string
  projectName?: string
}

export function ChatPanel({ messages, isBuilding, currentAgent, className, projectName }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  void currentAgent
  void projectName

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  const lastMsg = messages[messages.length - 1]
  const showDots = isBuilding && messages.length > 0 && !lastMsg?.streaming

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b shrink-0">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
          <Lamp className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Lampcode</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">vibe coder</span>
        </div>
        <div className={cn(
          "ml-auto h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          isBuilding ? "bg-green-400 animate-pulse" : "bg-white/20",
        )} />
      </div>

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

        {messages.length === 0 && isBuilding && (
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

        {showDots && (
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

        <div ref={bottomRef} />
      </div>
    </div>
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
    case "thinking": {
      const text = msg.text || ""
      // Hide if empty or contains code
      if (!text.trim()) return null
      if (
        text.includes("```") ||
        text.includes("import ") ||
        text.includes("export ") ||
        text.includes("style={{") ||
        text.trim().startsWith("<")
      ) return null

      return (
        <div key={msg.id} style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "8px 12px",
          margin: "2px 0",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "#a78bfa",
              animation: "pulse 1.5s infinite",
            }} />
            <span style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>Thinking</span>
          </div>
          <p style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            fontStyle: "italic",
            margin: 0,
            lineHeight: 1.5,
          }}>{text}{showCursor && <BlinkCursor />}</p>
        </div>
      )
    }

    case "text": {
      // User prompt → right-aligned bubble. Agent text → plain left-aligned text.
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
      const isDone = msg.done === true
      const label = msg.tool ?? msg.text
      return (
        <div className={cn(
          "flex items-center gap-2.5 rounded-lg border px-3 py-2",
          isDone
            ? "border-border/40 bg-muted/10"
            : "border-primary/20 bg-primary/5",
        )}>
          {isDone
            ? <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
            : <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          }
          <span className={cn(
            "truncate font-mono text-xs",
            isDone ? "text-muted-foreground" : "text-foreground/90",
          )}>
            {isDone ? label : `${label}...`}
          </span>
        </div>
      )
    }

    case "file_write":
      return (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          <span className="shrink-0">📄</span>
          <span className="truncate">{msg.path ?? msg.text}</span>
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
