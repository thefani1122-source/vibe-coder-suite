import type { BuildMessage } from "@/components/ChatPanel";
import type { FileDiff } from "@/components/DiffView";

/**
 * Consecutive messages that should be read as one thing, folded into one.
 *
 * Two runs get folded, for the same underlying reason — a transcript that
 * shows everything at full size shows nothing, because the part worth reading
 * is buried in the part that is not.
 *
 *  - REASONING. The model's own words, which are written for itself and arrive
 *    by the paragraph. Note the shape of the fold: ONE disclosure per run, not
 *    one per paragraph. Wrapping each paragraph in its own container has been
 *    tried here before and produced a stack of boxes that was worse than the
 *    single box it replaced (see ThoughtParagraph).
 *  - A FINISHED BUILD. Its steps are history the moment the next prompt is
 *    sent. The user's own messages are deliberately NOT folded away: they are
 *    what makes the conversation readable as a conversation.
 */
export type Group =
  | { kind: "single"; key: string; message: BuildMessage }
  | { kind: "reasoning"; key: string; messages: BuildMessage[] }
  | { kind: "archived"; key: string; messages: BuildMessage[] };

export function groupRows(messages: BuildMessage[]): Group[] {
  const groups: Group[] = [];

  for (const message of messages) {
    const foldable =
      message.archived && message.role !== "user"
        ? "archived"
        : !message.archived && message.type === "thinking"
          ? "reasoning"
          : null;

    const last = groups[groups.length - 1];
    if (foldable && last && last.kind === foldable) {
      last.messages.push(message);
      continue;
    }
    if (foldable) {
      groups.push({ kind: foldable, key: message.id, messages: [message] });
      continue;
    }
    groups.push({ kind: "single", key: message.id, message });
  }

  return groups;
}

/** Every file this build changed, with the changes that produced it. */
export interface FileEdits {
  path: string;
  added: number;
  removed: number;
  diffs: FileDiff[];
}

/**
 * The build's changes, gathered per file.
 *
 * Derived from the messages rather than accumulated into state of its own.
 * The diffs are already on the rows that reported them, the rows are already
 * saved and replayed, and a second copy would be one more thing to keep in
 * step — which is exactly how the preview URL went missing.
 *
 * Archived rows are left out on purpose: this answers "what did THIS build
 * change", and a finished build's edits are history the moment the next
 * prompt is sent.
 */
export function collectEdits(messages: BuildMessage[]): FileEdits[] {
  const byPath = new Map<string, FileEdits>();

  for (const message of messages) {
    if (message.archived) continue;
    for (const diff of message.diffs ?? []) {
      const existing = byPath.get(diff.path);
      if (existing) {
        existing.added += diff.added;
        existing.removed += diff.removed;
        existing.diffs.push(diff);
        continue;
      }
      byPath.set(diff.path, {
        path: diff.path,
        added: diff.added,
        removed: diff.removed,
        diffs: [diff],
      });
    }
  }

  return [...byPath.values()];
}

/**
 * One line of what the agent is currently thinking about.
 *
 * The live line used to read "Thinking", which says only that something is
 * happening — the same nothing the three bouncing dots said. The model's own
 * reasoning is the only thing that knows what it is working on, so the line is
 * taken from there: the FIRST sentence of the paragraph being written, which
 * stays still long enough to read while the rest of the paragraph streams in
 * under it.
 *
 * Returns null when there is nothing worth showing, and the caller keeps
 * whatever it had. Reasoning also contains headings, code, JSON and bare
 * fragments, none of which read as a status line, so those are declined rather
 * than truncated into nonsense.
 */
export function activityFromReasoning(paragraph: string): string | null {
  const firstLine = paragraph
    .split("\n")
    .map((line) => line.trim())
    // A heading or list marker introduces the thought rather than being it.
    .map((line) => line.replace(/^#{1,6}\s*/, "").replace(/^[-*+]\s+/, ""))
    .find((line) => line.length > 0);
  if (!firstLine) return null;

  // Anything that is plainly not prose: a fenced block, an object, a path on
  // its own. Showing a fragment of one reads as a glitch.
  if (/^[`{[\]}]/.test(firstLine)) return null;
  if (firstLine.includes("```")) return null;

  const sentence = (/^(.*?[.!?])(\s|$)/.exec(firstLine)?.[1] ?? firstLine).trim();
  // Markdown emphasis is noise on a single status line.
  const clean = sentence.replace(/\*\*/g, "").replace(/`/g, "").trim();

  // Too short to carry meaning ("Okay.", "Right"), or so long it is a
  // paragraph pretending to be a line.
  if (clean.length < 12) return null;
  if (clean.length > 90) return `${clean.slice(0, 87).trimEnd()}…`;
  return clean;
}
