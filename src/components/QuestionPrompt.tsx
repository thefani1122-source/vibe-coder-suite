import { useEffect, useState } from "react";
import { HelpCircle, Send } from "lucide-react";

/**
 * The agent asking the person a question, mid-build.
 *
 * Same mechanism as WriteApprovalPrompt — the backend blocks on it and nothing
 * moves until this is answered — so it is rendered the same way: pinned above
 * the input, not a modal that steals focus out of a stream the user is reading.
 *
 * The recommended option is the whole reason the options exist. Somebody who
 * does not write code cannot choose between two technical phrasings on merit,
 * but they can agree with a recommendation that says WHY. So the recommended
 * option is visually first-class and its description carries the reasoning.
 */

export interface AgentQuestionOption {
  label: string;
  description?: string;
  recommended?: boolean;
  /** Some answers are not words — "connect your Supabase" is a thing to DO, and
   *  sending the string "Connect Supabase" back to a build that is waiting for
   *  a database would be a lie. An option carrying an action runs it instead of
   *  answering, and the answer is sent once the action actually succeeds.
   *  Unknown actions fall through to the normal answer, so a newer backend
   *  cannot break an older page. */
  action?: string;
}

export interface PendingQuestion {
  toolCallId: string;
  question: string;
  options: AgentQuestionOption[];
  /** Epoch ms after which the backend stops waiting and proceeds on its own. */
  expiresAt: number;
}

interface Props {
  question: PendingQuestion;
  onAnswer: (toolCallId: string, answer: string) => void;
  /** Runs an option's action. Returns false when it is not one this page
   *  knows, which falls back to answering with the label — an unrecognised
   *  action must never leave the button doing nothing at all. */
  onAction?: (action: string, toolCallId: string) => boolean;
  /** Set while an action is running, so the prompt can say what it is waiting
   *  for instead of looking frozen. */
  actionPending?: boolean;
}

export function QuestionPrompt({ question, onAnswer, onAction, actionPending }: Props) {
  const [draft, setDraft] = useState("");
  const [answered, setAnswered] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(() =>
    Math.max(0, Math.ceil((question.expiresAt - Date.now()) / 60000)),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setMinutesLeft(Math.max(0, Math.ceil((question.expiresAt - Date.now()) / 60000)));
    }, 15000);
    return () => window.clearInterval(id);
  }, [question.expiresAt]);

  const expired = minutesLeft <= 0;
  const send = (answer: string) => {
    const text = answer.trim();
    if (!text || answered || expired) return;
    setAnswered(true);
    onAnswer(question.toolCallId, text);
  };

  /** An option with an action DOES the thing; answering is what the action
   *  reports when it has actually worked. Falling back to `send` keeps an
   *  unknown action from producing a dead button. */
  const choose = (opt: AgentQuestionOption) => {
    if (answered || expired) return;
    if (opt.action && onAction?.(opt.action, question.toolCallId)) return;
    send(opt.label);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="The builder has a question"
      className="mb-2 rounded-2xl border border-amber-500/35 bg-amber-500/[0.06] p-4 shadow-xl shadow-black/30 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{question.question}</p>
          <p className="mt-0.5 text-xs text-white/50">
            {expired
              ? "Taking too long — the builder has carried on with its own choice."
              : actionPending
                ? "Waiting for you to finish connecting in the other tab — this carries on by itself once you do."
                : `The build is paused until you answer. About ${minutesLeft} min before it decides for you.`}
          </p>

          {question.options.length > 0 && (
            <div className="mt-3 space-y-2">
              {question.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => choose(opt)}
                  disabled={answered || expired || actionPending === true}
                  className={`w-full rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    opt.recommended
                      ? "border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/15"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                    {opt.recommended && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Recommended
                      </span>
                    )}
                  </span>
                  {opt.description && (
                    <span className="mt-1 block text-xs leading-relaxed text-white/55">
                      {opt.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Always available, even with options: the right answer is sometimes
              none of them, and forcing a choice would put words in their mouth. */}
          <div className="mt-3 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              disabled={answered || expired}
              placeholder={
                question.options.length > 0 ? "Or answer in your own words…" : "Type your answer…"
              }
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => send(draft)}
              disabled={answered || expired || draft.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
