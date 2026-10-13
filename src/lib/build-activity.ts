export type ToolActivityStatus = "running" | "done" | "failed";

export interface ToolActivityDescription {
  label: string;
  tool?: string;
  details?: string;
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
      label = count === undefined ? "Writing the files" : `Writing ${count} files`;
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
    default:
      label = readableUnknownName(name);
  }

  return {
    label,
    ...(name ? { tool: name } : {}),
    ...(rawArgs ? { details: rawArgs } : {}),
  };
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
