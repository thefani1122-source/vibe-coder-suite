/**
 * Does "Show details" still leak raw tool arguments?
 *
 * The two shapes seen in production, plus the one that was never looked at.
 */
import { describePipelineActivity, describeToolActivity } from "../src/lib/build-activity";

let failures = 0;
function check(name: string, got: unknown, want: unknown): void {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    console.log(`PASS ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
}

// Pipeline events are user-facing progress, not provider-specific status text.
check(
  "planning status is clear",
  describePipelineActivity("Analyzing your prompt and planning the build..."),
  "Understanding your request",
);
check(
  "legacy model label is made useful",
  describePipelineActivity("Calling AI model..."),
  "Planning the next step",
);
check(
  "writing status is clear",
  describePipelineActivity("Writing src/App.tsx (82 lines"),
  "Writing your app files",
);
check(
  "preview status names the outcome",
  describePipelineActivity("Finalizing and preparing preview..."),
  "Checking your app and preparing the preview",
);
check(
  "unknown status does not leak internals",
  describePipelineActivity("provider-secret-internal-state"),
  "Working on your build",
);

// The exact payload from the user's screenshot.
const askArgs = JSON.stringify({
  question: "What type of B2B SaaS would you like me to build?",
  options: [
    { label: "CRM & Sales Pipeline", description: "Track leads and deals" },
    { label: "Project Management", description: "Tasks, boards, timelines" },
  ],
});
const ask = describeToolActivity("ask_user", askArgs);
check("ask_user label is human", ask.label, "Asking you a question");
check("ask_user shows no details", ask.details, undefined);

// The one nobody had looked at: the arguments ARE the file contents.
const writeArgs = JSON.stringify({
  files: [
    { path: "src/App.tsx", content: "export default function App() { return <div>hi</div> }" },
    { path: "src/lib/api.ts", content: "export const API_BASE = ''" },
  ],
});
const write = describeToolActivity("write_files", writeArgs);
check("write_files label", write.label, "Writing 2 files");
check("write_files shows paths only", write.details, "src/App.tsx\nsrc/lib/api.ts");
check("write_files leaks no file content", (write.details ?? "").includes("export default"), false);

// Singular, the most common shape, pinned a third time.
check(
  "one file is singular",
  describeToolActivity("write_files", JSON.stringify({ files: [{ path: "a.ts", content: "x" }] }))
    .label,
  "Writing 1 file",
);

// A url is worth showing.
check(
  "fetch_reference shows the url",
  describeToolActivity("fetch_reference", JSON.stringify({ url: "https://stripe.com/pricing" }))
    .details,
  "https://stripe.com/pricing",
);

// Everything else: label only, whatever the args were.
for (const tool of ["check_page", "edit_file", "read_file", "run_tests", "review_code"]) {
  check(
    `${tool} shows no details`,
    describeToolActivity(tool, JSON.stringify({ path: "src/App.tsx", secret: "ABSK-nope" }))
      .details,
    undefined,
  );
}

// An unknown tool must not fall back to dumping JSON either.
const unknown = describeToolActivity("search_docs", JSON.stringify({ anything: "at all" }));
check("unknown tool label", unknown.label, "Search docs");
check("unknown tool shows no details", unknown.details, undefined);

console.log(failures === 0 ? "\nAll details cases passed." : `\n${failures} case(s) failed.`);
if (failures > 0) process.exit(1);
