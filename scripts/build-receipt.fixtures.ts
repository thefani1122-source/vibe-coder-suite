import type { BuildReceiptOutcome, RequirementStatus } from "../src/lib/build-receipt";

function outcome(statuses: RequirementStatus[], dropped = 0): BuildReceiptOutcome {
  return {
    completionAudit: {
      criteria: statuses.map((_, i) => ({
        id: `R${i + 1}`,
        text: [
          "Track my daily habits",
          "Keep my progress after I reload",
          "Delete a habit I no longer need",
        ][i],
        kind: "behaviour",
      })),
      // Reversed deliberately: presentation must join on ID, not position.
      verdicts: statuses
        .map((status, i) => ({
          id: `R${i + 1}`,
          status,
          evidence:
            status === "proven"
              ? `src/habits.tsx — requirement ${i + 1}`
              : "private-evidence-must-not-appear",
          note: `Maintainer note: deleteHabit implementation R${i + 1}`,
        }))
        .reverse(),
      proven: statuses.filter((s) => s === "proven").length,
      contradicted: statuses.filter((s) => s === "contradicted").length,
      unverified: statuses.filter((s) => s === "unverified").length,
      criteriaDropped: dropped,
    },
  };
}

export const receiptFixtures: Record<string, BuildReceiptOutcome> = {
  "all-proven": outcome(["proven", "proven", "proven"]),
  "not-confirmed": outcome(["proven", "unverified", "unverified"]),
  contradicted: outcome(["proven", "contradicted", "unverified"]),
  "dropped-two": outcome(["proven", "proven", "proven"], 2),
  absent: { wiring: { repaired: 3, total: 4 } },
  repaired: { ...outcome(["proven", "proven", "proven"]), wiring: { repaired: 3, total: 0 } },
  remaining: {
    ...outcome(["proven", "unverified", "unverified"]),
    wiring: { repaired: 0, total: 4 },
  },
};
