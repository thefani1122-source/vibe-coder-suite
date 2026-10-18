import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PendingQuestion } from "@/components/QuestionPrompt";

/**
 * "Connect your Supabase" — the one question that gets a card of its own.
 *
 * Every other thing the builder asks is a question, and `QuestionPrompt`
 * renders those inline above the input on purpose: a modal that steals focus
 * out of a stream someone is reading is worse than the answer is worth.
 *
 * This one is not a question. It is a task, it happens once per person, the
 * build is stopped until it is done, and there is exactly one thing to press.
 * An amber paragraph in a scrolling log is the wrong shape for that — it reads
 * as another status line and gets scrolled past, which is precisely what
 * happened on 2026-10-17.
 *
 * What it deliberately does NOT do: trap the person. Declining is a visible,
 * plainly-worded button rather than a greyed-out afterthought, and the backdrop
 * is not click-to-dismiss — dismissing by accident would leave the build
 * waiting on an answer nobody knows it still wants.
 */

/** The Supabase mark, inline so the card never waits on a network request. */
function SupabaseMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 109 113" className={className} fill="none" aria-hidden="true">
      <path
        d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3L53.6 42h44c8 0 12.4 9.2 7.4 15.4l-41.3 52.9Z"
        fill="url(#sbA)"
      />
      <path
        d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3L53.6 42h44c8 0 12.4 9.2 7.4 15.4l-41.3 52.9Z"
        fill="url(#sbB)"
        fillOpacity=".2"
      />
      <path
        d="M45.3 2.1c2.9-3.7 8.7-1.7 8.8 3L54.9 71h-43.5c-8 0-12.5-9.2-7.5-15.4L45.3 2.1Z"
        fill="#3ECF8E"
      />
      <defs>
        <linearGradient id="sbA" x1="53.6" y1="55.2" x2="94" y2="71.9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
        <linearGradient id="sbB" x1="36.2" y1="30.6" x2="54.5" y2="65.1" gradientUnits="userSpaceOnUse">
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface Props {
  question: PendingQuestion;
  /** Opens the connect flow. Returns false if this page cannot run it. */
  onConnect: (action: string, toolCallId: string) => boolean;
  /** Sends a plain answer — used by the decline button. */
  onAnswer: (toolCallId: string, answer: string) => void;
  /** True while waiting for the connection to appear in the other tab. */
  pending?: boolean;
}

export function ConnectDatabaseCard({ question, onConnect, onAnswer, pending }: Props) {
  const connectOption = question.options.find((o) => o.action === "connect-supabase");
  const declineOption = question.options.find((o) => !o.action);

  const [minutesLeft, setMinutesLeft] = useState(() =>
    Math.max(0, Math.ceil((question.expiresAt - Date.now()) / 60000)),
  );
  useEffect(() => {
    const id = window.setInterval(
      () => setMinutesLeft(Math.max(0, Math.ceil((question.expiresAt - Date.now()) / 60000))),
      15000,
    );
    return () => window.clearInterval(id);
  }, [question.expiresAt]);

  if (!connectOption) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect your database"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] p-7 text-center shadow-2xl shadow-black/60">
        <div className="mx-auto mb-5 grid h-14 w-14 place-content-center rounded-xl border border-[#3ECF8E]/25 bg-[#3ECF8E]/10">
          <SupabaseMark className="h-7 w-7" />
        </div>

        {/* One line, as asked. The detail lives under the buttons, where it is
            available without being in the way of the decision. */}
        <h2 className="text-lg font-semibold text-white">Connect your Supabase to save data</h2>

        <p className="mt-2 text-sm leading-relaxed text-white/55">
          This app stores information, so it needs a database of your own. I will create its
          tables for you.
        </p>

        <button
          type="button"
          onClick={() => onConnect("connect-supabase", question.toolCallId)}
          disabled={pending === true}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3ECF8E] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#35b87d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for you to finish connecting…
            </>
          ) : (
            <>
              <SupabaseMark className="h-4 w-4" />
              Connect Supabase
            </>
          )}
        </button>

        {declineOption && (
          <button
            type="button"
            onClick={() => onAnswer(question.toolCallId, declineOption.label)}
            disabled={pending === true}
            className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-40"
          >
            {declineOption.label}
          </button>
        )}

        <p className="mt-4 text-xs leading-relaxed text-white/35">
          {pending
            ? "This continues by itself once the connection appears — you do not need to come back here."
            : declineOption?.description ??
              `Your build is paused until you choose. About ${minutesLeft} min before it decides for you.`}
        </p>
      </div>
    </div>
  );
}
