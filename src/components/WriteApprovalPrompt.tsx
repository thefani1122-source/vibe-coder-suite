import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

/**
 * The approval gate for a destructive action on a connected service.
 *
 * The backend blocks the whole build on this: when the agent calls a tool the
 * classifier marked destructive — create_repository, push_files, delete_file,
 * merge_pull_request — tools.ts emits build:write_action_approval_required and
 * waits. Until 2026-10-04 the frontend listened for none of it, so every write
 * sat there and was denied on the 2-minute timeout. The capability worked and
 * was unreachable.
 *
 * Rendered pinned above the input bar rather than as a modal: the build is
 * streaming and the user is reading it, and a dialog that steals focus mid-
 * stream is worse than a block they cannot scroll past. It cannot be dismissed
 * without answering — closing it silently would just reintroduce the timeout.
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

/** "create_or_update_file" → "create or update file" — the tool names are the
 *  server's, not ours, and underscores read as machinery to a non-developer. */
function humanise(toolName: string): string {
  return toolName.replace(/_/g, " ");
}

export function WriteApprovalPrompt({ action, onDecision }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000)),
  );
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [action.expiresAt]);

  // The countdown is the backend's, not a UI flourish: when it reaches zero the
  // build has already been told "denied", so the buttons must stop pretending
  // they still do something.
  const expired = secondsLeft <= 0;

  const decide = (approved: boolean) => {
    if (answered || expired) return;
    setAnswered(true);
    onDecision(action.toolCallId, approved);
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
      className="mb-2 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4 shadow-xl shadow-black/30 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            Allow <span className="text-amber-300">{humanise(action.toolName)}</span> on your{" "}
            <span className="text-amber-300">{action.serverSlug}</span> account?
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            This changes something outside the preview and cannot be undone from here.
          </p>

          {args.length > 0 && (
            <dl className="mt-3 space-y-1 rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs">
              {args.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 font-mono text-white/40">{k}</dt>
                  <dd className="min-w-0 break-words font-mono text-white/80">
                    {typeof v === "string" ? v : JSON.stringify(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={answered || expired}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={answered || expired}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <span className="ml-auto text-xs tabular-nums text-white/40">
              {answered ? "Sending…" : expired ? "Timed out — denied" : `${secondsLeft}s to decide`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
