import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — Lampcode" },
      {
        name: "description",
        content: "Lampcode's refund policy for plan purchases and usage top-ups.",
      },
    ],
  }),
});

function RefundPage() {
  return (
    <LegalPage>
      <h1>Refund Policy</h1>
      <p>
        <em>Last updated: August 25, 2026</em>
      </p>
      <p>
        This Refund Policy covers plan subscriptions and usage top-up purchases made through
        Lampcode ("Service"). It supplements our{" "}
        <Link to="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </p>

      <h2>1. General Policy</h2>
      <p>
        All purchases are final. Refunds are issued at our discretion for unused usage balance, and
        only when requested within 7 days of the original purchase.
      </p>

      <h2>2. How to Request a Refund</h2>
      <p>
        Email <code>billing@lampcode.app</code> with your account email and the purchase you'd like
        refunded. We'll review your request and respond within a few business days.
      </p>

      <h2>3. Payment Processor</h2>
      <p>
        Payments are processed by Paddle. Approved refunds are issued back to your original payment
        method through Paddle and may take several business days to appear, depending on your bank
        or card issuer.
      </p>

      <h2>4. Changes</h2>
      <p>
        We may update this policy. Material changes will be announced the same way as changes to our
        Terms of Service.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about a refund? Email <code>billing@lampcode.app</code>.
      </p>
    </LegalPage>
  );
}
