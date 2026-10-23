import type { BuildMessage } from "@/components/ChatPanel"
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
  path: string
  added: number
  removed: number
  diffs: FileDiff[]
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
  const byPath = new Map<string, FileEdits>()

  for (const message of messages) {
    if (message.archived) continue
    for (const diff of message.diffs ?? []) {
      const existing = byPath.get(diff.path)
      if (existing) {
        existing.added += diff.added
        existing.removed += diff.removed
        existing.diffs.push(diff)
        continue
      }
      byPath.set(diff.path, {
        path: diff.path,
        added: diff.added,
        removed: diff.removed,
        diffs: [diff],
      })
    }
  }

  return [...byPath.values()]
}
