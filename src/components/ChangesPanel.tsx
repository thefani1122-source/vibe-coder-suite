import { FileDiff as FileDiffIcon } from "lucide-react";
import { DiffView } from "./DiffView";
import type { FileEdits } from "@/lib/build-timeline";

/**
 * Every file this build changed, in one place.
 *
 * The per-step diffs in the chat answer "what did that step just do". This
 * answers the other question — "what has changed in total" — which is the one
 * you ask before trusting a build you did not watch.
 *
 * Read-only, like the diffs in the chat, and for the same reason: the sandbox
 * these files live in belongs to the build, not to the person reading.
 */
export function ChangesPanel({ edits }: { edits: FileEdits[] }) {
  if (edits.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <FileDiffIcon aria-hidden="true" className="h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No file changes in this build yet</p>
        <p className="max-w-xs text-xs text-muted-foreground/60">
          Edits to existing files show up here. A file written for the first time is new rather than
          changed, so it appears under Code.
        </p>
      </div>
    );
  }

  const added = edits.reduce((sum, edit) => sum + edit.added, 0);
  const removed = edits.reduce((sum, edit) => sum + edit.removed, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {edits.length} {edits.length === 1 ? "file changed" : "files changed"}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {added > 0 && <span className="text-emerald-400">+{added}</span>}
          {added > 0 && removed > 0 && " "}
          {removed > 0 && (
            <span className="text-rose-400">
              {"−"}
              {removed}
            </span>
          )}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-4">
          {edits.map((edit) => (
            <section key={edit.path} className="min-w-0">
              {/* One file may be edited more than once in a build; each change
                  is shown in the order it was made rather than merged, so the
                  view matches the steps that produced it. */}
              {edit.diffs.map((diff, index) => (
                <DiffView key={`${edit.path}-${index}`} diff={diff} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
