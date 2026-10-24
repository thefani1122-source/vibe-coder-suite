export type ToolActivityStatus = "running" | "done" | "failed";

export interface ToolActivityDescription {
  label: string;
  tool?: string;
  details?: string;
}

/** Convert backend pipeline updates into concise progress text for the live row. */
export function describePipelineActivity(status?: string): string {
  const text = status?.trim() ?? "";
  if (!text) return "Working on your build";

  if (/^(analyzing your prompt|understanding your request)/i.test(text)) {
    return "Understanding your request";
  }
  if (/^building:/i.test(text) || /^starting new build/i.test(text)) {
    return "Getting your build ready";
  }
  if (/^calling (the )?ai model/i.test(text)) return "Planning the next step";
  if (/^writing files/i.test(text) || /^writing src\//i.test(text)) {
    return "Writing your app files";
  }
  if (/^editing existing project/i.test(text)) return "Updating your project";
  if (/^(finalizing|preparing|starting).*preview/i.test(text)) {
    return "Checking your app and preparing the preview";
  }
  if (/^(checking|running tests|reviewing)/i.test(text)) return text;

  // Unknown backend labels may be internal or provider-specific. Keep the
  // user-facing progress useful without echoing opaque implementation text.
  return "Working on your build";
}

const fileLabel = (verb: "Editing" | "Reading", args?: Record<string, unknown>) => {
  const path = args?.path;
  return typeof path === "string" && path.trim() ? `${verb} ${path.trim()}` : `${verb} a file`;
};

function parseArgs(raw?: string): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Streamed arguments may be incomplete; a readable label still works without them.
  }
  return undefined;
}

function readableUnknownName(name: string): string {
  const words = name
    .replace(/_tool$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_-]+/)
    .filter(Boolean);
  if (words.length === 0 || words.join(" ").toLowerCase() === "tool") return "Working on a step";
  const sentence = words.join(" ").toLowerCase();
  return sentence[0]!.toUpperCase() + sentence.slice(1);
}

export function describeToolActivity(toolName?: string, rawArgs?: string): ToolActivityDescription {
  const args = parseArgs(rawArgs);
  const name = toolName?.trim() || "";
  let label: string;

  switch (name) {
    case "write_files": {
      const files = args?.files;
      const count = Array.isArray(files)
        ? files.length
        : files && typeof files === "object"
          ? Object.keys(files).length
          : undefined;
      // Singular matters: a one-file write is the most common shape of all on an
      // edit, so "Writing 1 files" would be the line the user sees most often.
      // Third time this slip has been caught in this product — the completion
      // audit's "One thing things I've left" and the Contract's "1 more
      // requirements" were the other two.
      label =
        count === undefined
          ? "Writing the files"
          : count === 1
            ? "Writing 1 file"
            : `Writing ${count} files`;
      break;
    }
    case "edit_file":
      label = fileLabel("Editing", args);
      break;
    case "read_file":
    case "read_project_file":
      label = fileLabel("Reading", args);
      break;
    case "list_files":
      label = "Looking through the project";
      break;
    case "check_page":
      label = "Checking the app actually loads";
      break;
    case "check_types":
      label = "Checking for code errors";
      break;
    case "run_tests":
      label = "Running the tests";
      break;
    case "read_logs":
      label = "Reading the server logs";
      break;
    case "find_dead_code":
      label = "Looking for leftover code";
      break;
    case "find_wiring_gaps":
      label = "Checking the buttons and links actually work";
      break;
    case "review_code":
      label = "Reviewing the code";
      break;
    case "fetch_reference":
      label = "Looking at the page you linked";
      break;
    case "deploy_app":
      label = "Putting the app live on your Vercel";
      break;
    case "load_skill":
      label = "Loading extra instructions";
      break;
    case "request_write_action":
      label = "Asking your permission";
      break;
    case "ask_user":
      label = "Asking you a question";
      break;
    default:
      label = readableUnknownName(name);
  }

  const details = describeToolDetails(name, args);

  return {
    label,
    ...(name ? { tool: name } : {}),
    ...(details ? { details } : {}),
  };
}

/**
 * What "Show details" is allowed to say.
 *
 * This used to be `rawArgs` — the tool call's arguments, as JSON, verbatim. For
 * `ask_user` that meant the whole question payload, which is what the user saw
 * in production on 2026-10-14: an "Asking you a question" row whose details
 * were `{"question":"What type of B2B SaaS…","options":[{"label":…`. For
 * `write_files` it was worse and nobody had looked: the arguments to that call
 * ARE the file contents, so every generated file was being pasted into the
 * transcript as an escaped JSON string.
 *
 * So nothing is shown by default. A tool opts in only where there is something
 * a non-coder would actually want, and it is written as prose. The raw
 * arguments are developer output; they belong in the server log, which has
 * them.
 */
function describeToolDetails(name: string, args?: Record<string, unknown>): string | undefined {
  if (!args) return undefined;

  switch (name) {
    case "write_files": {
      // The one case worth showing: WHICH files, never their contents.
      const files = args["files"];
      const paths = Array.isArray(files)
        ? files.map((f) =>
            f && typeof f === "object" ? (f as Record<string, unknown>)["path"] : f,
          )
        : files && typeof files === "object"
          ? Object.keys(files)
          : [];
      const named = paths.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
      return named.length > 0 ? named.map((p) => p.trim()).join("\n") : undefined;
    }
    case "fetch_reference": {
      const url = args["url"];
      return typeof url === "string" && url.trim() ? url.trim() : undefined;
    }
    default:
      // Every other tool's label already carries everything it has to say.
      return undefined;
  }
}

const MAX_REASONING_PARAGRAPH_CHARS = 1_400;

function splitLongParagraph(paragraph: string): string[] {
  const pieces: string[] = [];
  let remaining = paragraph.trim();
  while (remaining.length > MAX_REASONING_PARAGRAPH_CHARS) {
    let splitAt = remaining.lastIndexOf(" ", MAX_REASONING_PARAGRAPH_CHARS);
    if (splitAt < MAX_REASONING_PARAGRAPH_CHARS * 0.6) splitAt = MAX_REASONING_PARAGRAPH_CHARS;
    pieces.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}

/** Blank lines begin a new readable paragraph; long paragraphs are bounded too. */
export function splitReasoningParagraphs(text: string): string[] {
  return text.split(/\r?\n[ \t]*\r?\n+/).flatMap(splitLongParagraph);
}
