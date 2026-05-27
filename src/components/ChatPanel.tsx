import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface AgentMessage {
  id: string
  agent: string
  content: string
  timestamp: number
}

interface ChatPanelProps {
  messages: AgentMessage[]
  isBuilding: boolean
  currentAgent?: string
  className?: string
}

const AGENT_META: Record<string, { label: string; color: string; icon: string }> = {
  planning:   { label: "Planning Agent",    color: "text-violet-400", icon: "🧠" },
  frontend:   { label: "Frontend Agent",    color: "text-blue-400",   icon: "🎨" },
  backend:    { label: "Backend Agent",     color: "text-green-400",  icon: "⚙️" },
  db:         { label: "Database Agent",    color: "text-yellow-400", icon: "🗄️" },
  security:   { label: "Security Verifier", color: "text-red-400",    icon: "🔒" },
  connection: { label: "Connection Check",  color: "text-orange-400", icon: "🔗" },
  fix:        { label: "Fix Agent",         color: "text-pink-400",   icon: "🔧" },
  deploy:     { label: "Deploy Agent",      color: "text-cyan-400",   icon: "🚀" },
}

export function ChatPanel({ messages, isBuilding, currentAgent, className }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

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

  type Group = { agent: string; text: string; timestamp: number }
  const groups = messages.reduce<Group[]>((acc, msg) => {
    const last = acc[acc.length - 1]
    if (last && last.agent === msg.agent) {
      last.text += msg.content
    } else {
      acc.push({ agent: msg.agent, text: msg.content, timestamp: msg.timestamp })
    }
    return acc
  }, [])

  const activeMeta = currentAgent ? AGENT_META[currentAgent] : undefined

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b shrink-0">
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          isBuilding ? "bg-green-400 animate-pulse" : "bg-muted-foreground/30"
        )} />
        <span className="text-sm font-medium">
          {isBuilding
            ? activeMeta
              ? `${activeMeta.icon} ${activeMeta.label}`
              : "Building..."
            : messages.length > 0 ? "Build Complete" : "Ready"}
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-3xl">⚡</span>
            <p className="text-sm text-muted-foreground">
              {isBuilding ? "Agents warming up..." : "Start a build to see agent output"}
            </p>
          </div>
        )}

        {groups.map((group, i) => {
          const meta = AGENT_META[group.agent]
          return (
            <div key={i} className="flex flex-col gap-1">
              <span className={cn(
                "text-xs font-semibold flex items-center gap-1",
                meta?.color ?? "text-muted-foreground"
              )}>
                {meta?.icon} {meta?.label ?? group.agent}
              </span>
              <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/90">
                  {group.text}
                </pre>
              </div>
            </div>
          )
        })}

        {isBuilding && (
          <div className="flex flex-col gap-1">
            <span className={cn(
              "text-xs font-semibold flex items-center gap-1",
              activeMeta?.color ?? "text-muted-foreground"
            )}>
              {activeMeta ? `${activeMeta.icon} ${activeMeta.label}` : "Agent"}
            </span>
            <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3 w-fit">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
