import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildReceipt } from "../src/components/BuildReceipt";
import { receiptRequirements } from "../src/lib/build-receipt";
import { receiptFixtures } from "./build-receipt.fixtures";

describe("build receipt semantics", () => {
  test("absent audit renders nothing, even with wiring data", () => {
    expect(renderToStaticMarkup(<BuildReceipt outcome={receiptFixtures.absent} />)).toBe("");
    expect(renderToStaticMarkup(<BuildReceipt />)).toBe("");
  });
  test("joins verdicts by ID rather than array position", () => {
    expect(
      receiptRequirements(receiptFixtures.contradicted.completionAudit!).map((r) => r.status),
    ).toEqual(["proven", "contradicted", "unverified"]);
  });
  test("missing and duplicate verdicts are not passes", () => {
    const audit = receiptFixtures["all-proven"].completionAudit!;
    expect(
      receiptRequirements({ ...audit, verdicts: [] }).every((r) => r.status === "unverified"),
    ).toBe(true);
    expect(
      receiptRequirements({ ...audit, verdicts: [...audit.verdicts, ...audit.verdicts] }).every(
        (r) => r.status === "unverified",
      ),
    ).toBe(true);
  });
  test("evidence and maintainer text occur only inside closed disclosures", () => {
    for (const fixture of Object.values(receiptFixtures)) {
      const html = renderToStaticMarkup(<BuildReceipt outcome={fixture} />);
      expect(html).not.toMatch(/<details[^>]*\bopen\b/);
      const defaultView = html.replace(/<details\b[\s\S]*?<\/details>/g, "");
      expect(defaultView).not.toContain("src/habits");
      expect(defaultView).not.toContain("deleteHabit");
      expect(html).not.toContain("private-evidence-must-not-appear");
    }
  });
  test("dropped requirements remain visible despite zero unconfirmed", () => {
    const html = renderToStaticMarkup(<BuildReceipt outcome={receiptFixtures["dropped-two"]} />);
    expect(html).toContain("additional requirements were");
    expect(html).toContain("not included in these counts");
    expect(html).not.toMatch(/all good|verified!|all done/i);
  });
  test("unverified uses neither pass nor alarm icon", () => {
    const html = renderToStaticMarkup(<BuildReceipt outcome={receiptFixtures["not-confirmed"]} />);
    expect(html).toContain("Not confirmed");
    expect(html).toContain("lucide-circle-question-mark");
    expect(html).not.toContain("text-rose-400");
    expect(html).not.toContain("warning");
  });
  test("wiring is a small line in the same card", () => {
    const repaired = renderToStaticMarkup(<BuildReceipt outcome={receiptFixtures.repaired} />);
    expect(repaired).toContain("controls weren’t connected; they were fixed.");
    expect(repaired).not.toContain("still need");
    const remaining = renderToStaticMarkup(<BuildReceipt outcome={receiptFixtures.remaining} />);
    expect(remaining).toContain("controls still need");
    expect(remaining.match(/<section/g)).toHaveLength(1);
    expect(
      renderToStaticMarkup(
        <BuildReceipt
          outcome={{ ...receiptFixtures.repaired, wiring: { total: 0, repaired: 0 } }}
        />,
      ),
    ).not.toContain("controls");
  });
});
