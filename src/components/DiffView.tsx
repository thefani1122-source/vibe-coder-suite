import { cn } from "@/lib/utils";

/** One contiguous changed region, with context either side. Mirrors the
 *  backend's FileDiff in src/agents/file-diff.ts — the shape is a contract, so
 *  if one side changes the other has to. */
export interface DiffHunk {
  oldStart: number;
  newStart: number;
  lines: Array<{ sign: " " | "+" | "-"; text: string }>;
}

export interface FileDiff {
  path: string;
  added: number;
  removed: number;
  hunks: DiffHunk[];
  /** Hunks were cut short; added/removed are still exact. */
  truncated?: boolean;
}

/**
 * What an edit changed, the way every tool a developer already trusts shows
 * it: the changed lines, a few lines of context, nothing else.
 *
 * Read-only on purpose. Cursor offers accept/reject per hunk because it edits
 * YOUR repository and needs your consent before touching it. Lampcode owns the
 * sandbox it writes to, so the same control here would be a button that asks
 * permission for something that already happened — complexity bought with no
 * meaning behind it.
 */
export function DiffView({ diff }: { diff: FileDiff }) {
  const delta = [diff.added > 0 ? `+${diff.added}` : "", diff.removed > 0 ? `−${diff.removed}` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-2 min-w-0 overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
          {diff.path}
        </span>
        {delta && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{delta}</span>
        )}
      </div>

      <div className="max-h-64 overflow-auto">
        {diff.hunks.map((hunk, hi) => (
          <div key={`${hunk.oldStart}-${hi}`}>
            {hi > 0 && <div className="border-t border-border/30 bg-muted/20 py-1" />}
            {hunk.lines.map((line, li) => (
              <div
                key={li}
                className={cn(
                  "flex gap-2 px-2.5 font-mono text-[10px] leading-[1.6]",
                  line.sign === "+" && "bg-emerald-500/10 text-emerald-300",
                  line.sign === "-" && "bg-rose-500/10 text-rose-300",
                  line.sign === " " && "text-muted-foreground/70",
                )}
              >
                <span aria-hidden="true" className="w-2 shrink-0 select-none opacity-60">
                  {line.sign === " " ? "" : line.sign}
                </span>
                {/* Leading whitespace is meaningful in code, so it is preserved
                    rather than collapsed, and a long line wraps instead of
                    pushing a horizontal scrollbar under every diff. */}
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                  {line.text || " "}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {diff.truncated && (
        <p className="border-t border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          This change was too large to show in full. The counts above are exact.
        </p>
      )}
    </div>
  );
}
