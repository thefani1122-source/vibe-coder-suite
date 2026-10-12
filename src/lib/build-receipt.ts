export type RequirementStatus = "proven" | "contradicted" | "unverified";

export interface BuildReceiptOutcome {
  completionAudit?: {
    criteria: { id: string; text: string; kind: "visual" | "behaviour" | "data" | "logic" }[];
    verdicts: { id: string; status: RequirementStatus; evidence: string; note: string }[];
    proven: number;
    contradicted: number;
    unverified: number;
    criteriaDropped?: number;
  };
  wiring?: { total: number; repaired?: number };
}

/** Missing or duplicate verdicts cannot confirm a requirement. Join by ID,
 * never array order: extraction and assessment may return different orders. */
export function receiptRequirements(audit: NonNullable<BuildReceiptOutcome["completionAudit"]>) {
  return audit.criteria.map((criterion) => {
    const matches = audit.verdicts.filter((v) => v.id === criterion.id);
    const verdict = matches.length === 1 ? matches[0] : undefined;
    const status: RequirementStatus =
      verdict?.status === "proven" || verdict?.status === "contradicted"
        ? verdict.status
        : "unverified";
    return { ...criterion, status, evidence: verdict?.evidence ?? "", note: verdict?.note ?? "" };
  });
}
