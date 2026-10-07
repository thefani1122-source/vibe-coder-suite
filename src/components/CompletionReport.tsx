import { useState } from "react";
import { CheckCircle2, CircleHelp, ChevronDown, XCircle } from "lucide-react";

/**
 * What the build can actually prove it did.
 *
 * Every other signal in this product comes from the builder checking its own
 * work, and that is a closed loop: a requirement the agent never understood
 * produces no code AND no test, so nothing fails and it reports success. This
 * card is the one place the user sees the difference between
 *
 *   verified    — there is code, and the audit says where
 *   not done    — the code does the opposite
 *   unverified  — NOTHING in the build covers it
 *
 * So the headline is deliberately not a tick when anything is unverified. A
 * green "Build complete" over an unproven requirement is the behaviour this
 * exists to stop, and softening the wording here would put it straight back.
 */

export interface CriterionVerdict {
  id: string;
  status: "proven" | "contradicted" | "unverified";
  evidence: string;
  note: string;
}

export interface CompletionAuditPayload {
  criteria: Array<{ id: string; text: string; kind: string }>;
  verdicts: CriterionVerdict[];
  proven: number;
  contradicted: number;
  unverified: number;
}

export function CompletionReport({ audit }: { audit: CompletionAuditPayload }) {
  const total = audit.criteria.length;
  // Collapsed when everything is verified — a clean result is one line of
  // reassurance, not a checklist to scroll. Open when something needs reading.
  const [open, setOpen] = useState(audit.unverified > 0 || audit.contradicted > 0);

  if (total === 0) return null;

  const clean = audit.unverified === 0 && audit.contradicted === 0;
  const byId = new Map(audit.criteria.map((c) => [c.id, c.text]));
  const needsAttention = audit.verdicts.filter((v) => v.status !== "proven");

  return (
    <div
      className={`my-2 rounded-2xl border p-4 ${
        clean
          ? "border-emerald-500/30 bg-emerald-500/[0.05]"
          : "border-amber-500/35 bg-amber-500/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        {clean ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            {clean
              ? `All ${total} thing(s) you asked for are verified`
              : `${audit.proven} of ${total} verified · ${audit.unverified} unverified${
                  audit.contradicted > 0 ? ` · ${audit.contradicted} not done` : ""
                }`}
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            {clean
              ? "Checked against your own words, by a pass that did not write the code."
              : "Unverified does not mean broken — it means nothing in this build proves it works."}
          </p>
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {/* Only what needs attention when something does. A full list would
              bury the two lines the user has to act on under the ten they do not. */}
          {(needsAttention.length > 0 ? needsAttention : audit.verdicts).map((v) => (
            <li key={v.id} className="flex items-start gap-2 rounded-xl bg-black/20 p-2.5">
              {v.status === "proven" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : v.status === "contradicted" ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-white/85">
                  {byId.get(v.id) ?? v.id}
                </p>
                {v.note && <p className="mt-0.5 text-[11px] text-white/45">{v.note}</p>}
                {v.status === "proven" && v.evidence && (
                  <p className="mt-0.5 font-mono text-[11px] text-emerald-300/70">{v.evidence}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
