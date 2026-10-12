import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { receiptRequirements, type BuildReceiptOutcome } from "@/lib/build-receipt";

const states = {
  proven: { label: "Confirmed", Icon: CheckCircle2, color: "text-emerald-400" },
  contradicted: { label: "Needs work", Icon: XCircle, color: "text-rose-400" },
  unverified: { label: "Not confirmed", Icon: CircleHelp, color: "text-muted-foreground" },
};

/** Only the user's requirement text is shown by default; technical details
 * are opt-in. An absent audit is not an empty or successful receipt. */
export function BuildReceipt({ outcome }: { outcome?: BuildReceiptOutcome | null }) {
  const audit = outcome?.completionAudit;
  if (!audit) return null;
  const requirements = receiptRequirements(audit);
  const confirmed = requirements.filter((r) => r.status === "proven").length;
  const unconfirmed = requirements.filter((r) => r.status === "unverified").length;
  const needsWork = requirements.filter((r) => r.status === "contradicted").length;
  const dropped = audit.criteriaDropped ?? 0;
  const repaired = outcome?.wiring?.repaired ?? 0;
  const remaining = outcome?.wiring?.total ?? 0;

  return (
    <section
      aria-label="Your build receipt"
      className="min-w-0 rounded-xl border border-border bg-card/60 p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">Your build receipt</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {confirmed} confirmed · {unconfirmed} not confirmed · {needsWork}{" "}
        {needsWork === 1 ? "needs work" : "need work"}
      </p>
      {dropped > 0 && (
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground">
          {dropped} {dropped === 1 ? "additional requirement was" : "additional requirements were"}{" "}
          not assessed and {dropped === 1 ? "is" : "are"} not included in these counts.
        </p>
      )}
      {requirements.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No requirements were assessed.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {requirements.map((requirement) => {
            const { Icon, label, color } = states[requirement.status];
            return (
              <li key={requirement.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm leading-relaxed text-foreground">
                      {requirement.text}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${color}`}>{label}</p>
                    <details className="mt-2 text-xs">
                      <summary className="w-fit cursor-pointer rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        How do you know?
                      </summary>
                      <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-3 leading-relaxed text-muted-foreground">
                        {requirement.status === "proven" && requirement.evidence && (
                          <p className="whitespace-pre-wrap break-words">{requirement.evidence}</p>
                        )}
                        {requirement.note && (
                          <p className="whitespace-pre-wrap break-words">{requirement.note}</p>
                        )}
                        {!requirement.note &&
                          !(requirement.status === "proven" && requirement.evidence) && (
                            <p>
                              {requirement.status === "unverified"
                                ? "This build did not provide enough evidence to confirm this requirement."
                                : "No supporting detail was recorded for this requirement."}
                            </p>
                          )}
                      </div>
                    </details>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {unconfirmed > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Not confirmed means there isn’t enough evidence yet. It does not mean the feature is
          broken.
        </p>
      )}
      {(repaired > 0 || remaining > 0) && (
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {repaired > 0 && (
            <span>
              {repaired}{" "}
              {repaired === 1
                ? "control wasn’t connected; it was fixed."
                : "controls weren’t connected; they were fixed."}{" "}
            </span>
          )}
          {remaining > 0 && (
            <span>
              {remaining} {remaining === 1 ? "control still needs" : "controls still need"}{" "}
              attention.
            </span>
          )}
        </p>
      )}
    </section>
  );
}
