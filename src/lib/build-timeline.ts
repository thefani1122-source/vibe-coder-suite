import type { BuildMessage } from "@/components/ChatPanel";

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
