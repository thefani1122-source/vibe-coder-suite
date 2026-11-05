import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Data URL for images small enough to keep — a thumbnail, nothing more.
   *  The binary is not uploaded to the backend yet, so this is presentation
   *  only and the agent currently learns the file's name and kind, not its
   *  pixels. */
  dataUrl?: string;
  addedAt: number;
}

interface ContextSidePanelProps {
  attachments: WorkspaceAttachment[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Lovable-style Context panel: everything the user uploaded for this project
 *  lives here — screenshots, docs, data files — with a drag-and-drop target
 *  and one row per file. Docked as a fixed-width column on the right edge of
 *  the workspace so it never floats over or peeks behind anything. */
export function ContextSidePanel({ attachments, onAdd, onRemove, onClose }: ContextSidePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0d0d12]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/90">Context</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/50">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-content-center rounded text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
          title="Close context panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-white/10">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) onAdd(files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition",
            dragOver
              ? "border-orange-500/60 bg-orange-500/[0.06]"
              : "border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.03]",
          )}
        >
          <span className="grid h-8 w-8 place-content-center rounded-lg bg-white/[0.06] text-white/60">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-white/75">Add screenshots or files</span>
          <span className="text-[10px] text-white/35">Click to browse or drop files here</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onAdd(files);
            e.target.value = "";
          }}
        />

        {attachments.length === 0 ? (
          <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-white/30">
            Screenshots and files you add are kept here for this project and
            attached to your next prompt.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="group flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
              >
                {a.dataUrl ? (
                  <img
                    src={a.dataUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md border border-white/10 object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-content-center rounded-md bg-white/[0.05] text-white/45">
                    {a.type.startsWith("text/") || /\.(txt|md|json|csv|pdf)$/i.test(a.name) ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-white/80" title={a.name}>
                    {a.name}
                  </p>
                  <p className="text-[10px] text-white/35">{formatSize(a.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="grid h-6 w-6 shrink-0 place-content-center rounded text-white/30 opacity-0 transition hover:bg-white/[0.06] hover:text-white/70 group-hover:opacity-100"
                  title="Remove from context"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
