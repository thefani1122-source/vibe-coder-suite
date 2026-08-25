import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({
    meta: [
      { title: "Documentation — Lampcode" },
      {
        name: "description",
        content:
          "Lampcode documentation: getting started, workspace guide, usage & billing, security, and tips.",
      },
    ],
  }),
});

function DocsPage() {
  return (
    <LegalPage>
      <h1>Documentation</h1>
      <p>Everything you need to build, ship, and scale apps with Lampcode.</p>

      <h2>Getting Started</h2>
      <p>
        Lampcode is an AI vibe coder that turns natural-language prompts into production-ready apps.
        To start, go to the Dashboard, write what you want to build, and pick a mode:
      </p>
      <ul>
        <li>
          <strong>Fast Mode</strong> — quick single-shot generation. Great for landing pages and
          prototypes.
        </li>
        <li>
          <strong>Editor Mode</strong> (coming soon) — surgical edits to an existing project.
        </li>
      </ul>

      <h3>Your first app in 60 seconds</h3>
      <ol>
        <li>
          Click <strong>New App</strong> in the sidebar.
        </li>
        <li>Describe your idea in the prompt box.</li>
        <li>Optionally attach a screenshot, paste a URL, or import from Figma.</li>
        <li>
          Hit <strong>Send</strong> and watch the agent work in the workspace.
        </li>
      </ol>

      <h2>Workspace Guide</h2>
      <p>The workspace has two panels:</p>
      <ul>
        <li>
          <strong>Left panel</strong> — agent activity during build, then a persistent prompt box
          for changes.
        </li>
        <li>
          <strong>Right panel</strong> — switch between <strong>Preview</strong> (live iframe with
          desktop/tablet/mobile toggle) and <strong>Code</strong> (read-only file tree +
          syntax-highlighted viewer).
        </li>
      </ul>
      <p>
        Use <strong>Open in new tab</strong> for a full-screen preview, and the{" "}
        <strong>Publish</strong> menu to deploy to Vercel or push to GitHub.
      </p>

      <h2>Usage & Billing</h2>
      <p>
        Lampcode bills real usage, not a fixed price list. Every build, fix round, or deploy costs
        whatever it actually took the AI to do the work — there's no flat per-action price, so a
        quick fix costs less than a full build. Each plan includes a monthly usage budget (see{" "}
        <a href="/pricing">Pricing</a>); the Power plan rolls over up to $100 of unused balance into
        the next period, while Free, Pro, and Max reset each period. Run out mid-project? Top up
        anytime from the Pricing page.
      </p>

      <h2>Security</h2>
      <ul>
        <li>Every project gets isolated storage and per-user RLS by default.</li>
        <li>Secrets are stored encrypted and never exposed to the client bundle.</li>
        <li>
          Enable <strong>Two-Factor Authentication</strong> in Settings → Security.
        </li>
        <li>
          Review every login and key action in your <strong>Audit Log</strong>.
        </li>
      </ul>

      <h2>Tips & Tricks</h2>
      <ul>
        <li>
          Attach a <strong>screenshot</strong> for pixel-faithful designs.
        </li>
        <li>
          Paste a <strong>URL</strong> to clone a reference site's layout.
        </li>
        <li>
          Keep prompts <strong>specific</strong> — colors, fonts, sections, and behaviors.
        </li>
        <li>Iterate in small steps — one change per send beats a 20-item wishlist.</li>
      </ul>
    </LegalPage>
  );
}
