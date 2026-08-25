import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Lampcode" },
      { name: "description", content: "The terms that govern your use of Lampcode." },
    ],
  }),
});

function TermsPage() {
  return (
    <LegalPage>
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: August 25, 2026</em>
      </p>
      <p>
        These Terms of Service ("Terms") govern your access to and use of Lampcode ("Service"). By
        creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old (or the age of digital consent in your jurisdiction) to
        use the Service.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You are responsible for safeguarding your credentials.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>Notify us immediately of any unauthorized access.</li>
      </ul>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to build or distribute malware, spam, or illegal content.</li>
        <li>Reverse-engineer, scrape, or abuse the Service or our APIs.</li>
        <li>Generate content that infringes intellectual property, privacy, or other rights.</li>
        <li>Attempt to bypass rate limits, billing, or security controls.</li>
      </ul>

      <h2>4. Usage & Billing</h2>
      <ul>
        <li>
          Each plan includes a monthly usage budget, billed in real usage dollars as you build.
          Additional balance can be purchased as a one-time top-up.
        </li>
        <li>
          Free, Pro, and Max usage resets at the start of each billing period — unused balance does
          not carry over.
        </li>
        <li>
          Power plan usage rolls over: unused balance carries into the next period, capped at one
          additional month's allotment ($100).
        </li>
        <li>
          Payments are processed by one or more of the following payment processors: Stripe, Paddle.
          See our{" "}
          <Link to="/refund" className="text-primary hover:underline">
            Refund Policy
          </Link>{" "}
          for details on refunds.
        </li>
        <li>Prices may change with 30 days' notice.</li>
      </ul>

      <h2>5. Your Content</h2>
      <p>
        You retain all rights to the prompts you submit and the code generated for you. You grant
        Lampcode a limited license to host, process, and display your content solely to provide the
        Service.
      </p>

      <h2>6. AI-Generated Output</h2>
      <p>
        The Service uses artificial intelligence systems, including large language models, to
        generate code and other content based on your input. AI-generated output may contain errors
        and should be reviewed before use.
      </p>
      <ul>
        <li>
          Output may be inaccurate, incomplete, or similar to output produced for other users.
        </li>
        <li>
          You are responsible for reviewing, testing, and securing any code before deploying it.
        </li>
        <li>Do not rely on AI output for medical, legal, or financial decisions.</li>
      </ul>

      <h2>7. Third-Party Services</h2>
      <p>
        The Service may integrate with third-party providers (hosting, AI, GitHub, Vercel,
        payments). Your use of those services is subject to their own terms.
      </p>
      <p>
        If you connect a third-party account (such as GitHub or Vercel), actions that only read
        information may happen automatically; actions that would change something in your account
        always require your explicit approval before they occur.
      </p>
      <p>
        The Service may retrieve stock images from a third-party image provider for use in generated
        applications.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate accounts that
        violate these Terms, with or without notice. On termination, your access ends but these
        Terms continue where applicable (Sections 5, 9, 10, 11).
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong>,
        without warranties of any kind, express or implied, including merchantability, fitness for a
        particular purpose, and non-infringement.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Lampcode shall not be liable for indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, data, or
        goodwill. Our total liability for any claim shall not exceed the amount you paid in the 12
        months preceding the claim.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Lampcode from any claims arising out of your
        content, your use of the Service, or your violation of these Terms.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which Lampcode is established,
        without regard to conflict-of-law principles. Disputes will be resolved in the courts of
        that jurisdiction.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms. Material changes will be announced via email or in-product
        notice. Continued use after the effective date constitutes acceptance.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Email <code>legal@lampcode.app</code>.
      </p>
    </LegalPage>
  );
}
