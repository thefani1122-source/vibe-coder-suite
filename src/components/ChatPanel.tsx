import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Brain,
  Wrench,
  FileCode2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"

export interface BuildMessage {
  id: string
  type: "thinking" | "text" | "tool_call" | "tool_result" | "file_write" | "error"
  text: string
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
}

function BlinkCursor() {
  return <span className="animate-pulse inline-block w-1.5 h-3.5 bg-current align-middle ml-0.5" />
}

function MessageRow({ msg, collapsed, onToggle }: {
  msg: BuildMessage
  collapsed: boolean
  onToggle: () => void
}) {
  if (msg.type === "thinking") {
    return (
      <div className="group flex flex-col gap-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Brain className="h-3 w-3 shrink-0 text-purple-400" />
          <span className="font-medium">Thinking</span>
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </button>
        {!collapsed && (
          <div className="ml-4 rounded-md border border-purple-400/20 bg-purple-400/5 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {msg.text}
          </div>
        )}
      </div>
    )
  }

  if (msg.type === "tool_call") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {msg.done
          ? <Wrench className="h-3 w-3 shrink-0 text-green-400" />
          : <Loader2 className="h-3 w-3 shrink-0 animate-spin text-yellow-400" />
        }
        <span className={cn("font-mono", msg.done ? "line-through opacity-50" : "text-yellow-300")}>
          {msg.text}
        </span>
      </div>
    )
  }

  if (msg.type === "file_write") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileCode2 className="h-3 w-3 shrink-0 text-blue-400" />
        <span className="font-mono text-blue-300 truncate">{msg.path ?? msg.text}</span>
      </div>
    )
  }

  if (msg.type === "error") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">
        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
        <span>{msg.text}</span>
      </div>
    )
  }

  // type === "text"
  return (
    <div className="text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
      {msg.text}
      {msg.streaming && <BlinkCursor />}
    </div>
  )
}

export function ChatPanel({ messages, isBuilding, currentAgent, className }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Build Log
        </span>
        {isBuilding && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground capitalize">
              {currentAgent ?? "building"}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {isBuilding ? "Starting build…" : "No messages yet"}
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageRow
            key={msg.id}
            msg={msg}
            collapsed={collapsed.has(msg.id)}
            onToggle={() => toggle(msg.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
