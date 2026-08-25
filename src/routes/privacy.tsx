import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Lampcode" },
      { name: "description", content: "How Lampcode collects, uses, and protects your data." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalPage>
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: August 25, 2026</em>
      </p>
      <p>
        This Privacy Policy describes how Lampcode ("we", "us", "our") collects, uses, and shares
        information when you use our website, dashboard, and AI app-building services (the
        "Service").
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account information</h3>
      <p>Name, email address, and authentication identifiers when you sign up or sign in.</p>
      <h3>Usage data</h3>
      <p>Prompts, generated code, project metadata, usage balances, and interaction logs.</p>
      <h3>Technical data</h3>
      <p>
        IP address, browser, device, OS, referrer, and timestamps collected via cookies and server
        logs.
      </p>
      <h3>Payment data</h3>
      <p>
        Processed by Paddle, our payment processor. We never store full card numbers on our servers.
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Operate, maintain, and improve the Service.</li>
        <li>Generate apps and responses from your prompts.</li>
        <li>Authenticate users and prevent fraud or abuse.</li>
        <li>Send transactional emails (receipts, security alerts, product updates).</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2>3. Sharing & Disclosure</h2>
      <p>We share information only with:</p>
      <ul>
        <li>
          <strong>Subprocessors</strong> — hosting, AI inference, analytics, and payment providers
          under data-processing agreements.
        </li>
        <li>
          <strong>Legal authorities</strong> — when required by valid legal process.
        </li>
        <li>
          <strong>Successors</strong> — in a merger, acquisition, or asset sale, with notice to you.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information.
      </p>

      <h2>4. AI Processing & Training</h2>
      <p>
        The Service uses artificial intelligence systems, including large language models, to
        generate code and other content based on your input. AI-generated output may contain errors
        and should be reviewed before use. Your prompts and related data may be processed by
        third-party AI service providers to generate output.
      </p>
      <p>
        By default, your prompts and generated code are <strong>not</strong> used to train
        foundation models. You can opt in to share anonymized prompts to improve Lampcode in
        Settings → Privacy.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        Account data is retained while your account is active. Project data is retained for 30 days
        after deletion in case of accidental loss. You can request immediate deletion at any time.
      </p>

      <h2>6. Your Rights</h2>
      <p>Depending on your jurisdiction (GDPR, CCPA, etc.), you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete your personal data.</li>
        <li>Export your data in a portable format.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Withdraw consent at any time.</li>
      </ul>
      <p>
        Email <code>privacy@lampcode.app</code> to exercise these rights.
      </p>

      <h2>7. Security</h2>
      <p>
        We use TLS in transit, encryption at rest, role-based access controls, and routine security
        audits. No system is perfectly secure — please report vulnerabilities to{" "}
        <code>security@lampcode.app</code>.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly collect their
        data.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        Your data may be processed in countries other than your own, under appropriate safeguards.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We will post any changes here and update the "Last updated" date. Material changes will be
        notified via email.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions? Email <code>privacy@lampcode.app</code>.
      </p>
    </LegalPage>
  );
}
