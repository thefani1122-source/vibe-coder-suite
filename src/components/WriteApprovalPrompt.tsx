import { useEffect, useState } from "react";
import { AlertTriangle, Check, X, ChevronDown, ChevronUp } from "lucide-react";

/**
 * The approval gate for a destructive action on a connected service.
 *
 * Pinned above the input bar so the user cannot miss it while the build waits.
 * Kept compact and non-disruptive: large payloads (like raw SQL migrations or
 * full file contents) are collapsed behind a disclosure toggle by default
 * so the card never blows up or covers the workspace.
 */

export interface PendingWriteAction {
  toolCallId: string;
  serverSlug: string;
  toolName: string;
  toolInput: unknown;
  /** Epoch ms when the backend stops waiting and denies on its own. */
  expiresAt: number;
}

interface Props {
  action: PendingWriteAction;
  onDecision: (toolCallId: string, approved: boolean) => void;
}

/** "create_or_update_file" → "create or update file" */
function humanise(toolName: string): string {
  return toolName.replace(/_/g, " ");
}

export function WriteApprovalPrompt({ action, onDecision }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000)),
  );
  const [answered, setAnswered] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [action.expiresAt]);

  const expired = secondsLeft <= 0;

  const decide = (approved: boolean) => {
    if (answered || expired) return;
    setAnswered(true);
    onDecision(action.toolCallId, approved);
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const args =
    action.toolInput && typeof action.toolInput === "object"
      ? Object.entries(action.toolInput as Record<string, unknown>)
      : [];

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`Approval required: ${humanise(action.toolName)} on ${action.serverSlug}`}
      className="mb-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.05] p-3 shadow-lg shadow-black/30 backdrop-blur-xl"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white sm:text-sm">
            Allow <span className="font-semibold text-amber-300">{humanise(action.toolName)}</span> on your{" "}
            <span className="font-semibold text-amber-300">{action.serverSlug}</span> account?
          </p>
          <p className="mt-0.5 text-[11px] text-white/50">
            This changes something outside the preview and cannot be undone from here.
          </p>

          {args.length > 0 && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-white/[0.06] bg-black/40 p-2.5 text-xs">
              {args.map(([k, v]) => {
                const str = typeof v === "string" ? v : JSON.stringify(v, null, 2);
                const isLong = str.length > 90 || str.includes("\n");
                const isExpanded = !!expandedKeys[k];
                const lines = str.split("\n");

                return (
                  <div key={k} className="text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 font-mono text-white/40">{k}:</span>
                      {!isLong ? (
                        <span className="min-w-0 truncate font-mono text-white/80">{str}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExpand(k)}
                          className="inline-flex items-center gap-1 font-mono text-amber-400/90 hover:text-amber-300 hover:underline"
                        >
                          <span>{isExpanded ? "Hide" : "View"} ({lines.length} lines, {str.length} chars)</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                    {isLong && isExpanded && (
                      <pre className="mt-1.5 max-h-32 overflow-y-auto rounded border border-white/10 bg-black/60 p-2 font-mono text-[10.5px] leading-relaxed text-white/75 whitespace-pre-wrap select-all">
                        {str}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={answered || expired}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={answered || expired}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
            <span className="ml-auto text-[11px] tabular-nums text-white/40">
              {answered ? "Sending…" : expired ? "Timed out — denied" : `${secondsLeft}s to decide`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
