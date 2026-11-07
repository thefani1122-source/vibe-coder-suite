import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Plus, X, FolderGit2, Plug, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  addedAt: number;
}

interface ContextSidePanelProps {
  projectName?: string;
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

/** Lovable-style Context panel: projects, uploads (screenshots/files),
 *  and active connectors in a docked, scrollable side column. */
export function ContextSidePanel({
  projectName,
  attachments,
  onAdd,
  onRemove,
  onClose,
}: ContextSidePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-white/[0.08] bg-[#0c0c10] text-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white/90">Context</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-white/60">
              {attachments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-7 w-7 place-content-center rounded-lg text-white/50 transition hover:bg-white/[0.07] hover:text-white"
            title="Add screenshots or files"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-content-center rounded-lg text-white/50 transition hover:bg-white/[0.07] hover:text-white"
            title="Close context panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

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

      {/* Scrollable Context Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        
        {/* Section 1: Projects */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Projects</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-white/80">
            <span className="grid h-6 w-6 place-content-center rounded-md bg-orange-500/20 text-orange-400 font-semibold text-[11px]">
              {(projectName?.[0] || "P").toUpperCase()}
            </span>
            <span className="truncate font-medium">{projectName || "Current Project"}</span>
          </div>
        </div>

        {/* Section 2: Uploads / Screenshots */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Uploads {attachments.length > 0 && `(${attachments.length})`}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[11px] font-medium text-orange-400/90 hover:text-orange-300 transition"
            >
              + Add
            </button>
          </div>

          {/* Dropzone */}
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
              "flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-3 py-4 text-center transition",
              dragOver
                ? "border-orange-500/60 bg-orange-500/[0.08]"
                : "border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.03]",
            )}
          >
            <span className="grid h-7 w-7 place-content-center rounded-lg bg-white/[0.06] text-white/70">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium text-white/80">Paste or drop images here</span>
            <span className="text-[10px] text-white/40">Screenshots are sent to the agent</span>
          </button>

          {/* Uploaded items list */}
          {attachments.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="group flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 transition hover:bg-white/[0.05]"
                >
                  {a.dataUrl ? (
                    <img
                      src={a.dataUrl}
                      alt={a.name}
                      className="h-9 w-9 shrink-0 rounded-md border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-content-center rounded-md bg-white/[0.05] text-white/45">
                      {a.type.startsWith("text/") || /\.(txt|md|json|csv|pdf)$/i.test(a.name) ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white/85" title={a.name}>
                      {a.name}
                    </p>
                    <p className="text-[10px] text-white/40">{formatSize(a.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    className="grid h-6 w-6 shrink-0 place-content-center rounded text-white/35 opacity-0 transition hover:bg-white/[0.08] hover:text-white/80 group-hover:opacity-100"
                    title="Remove from context"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section 3: Connectors */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Connectors</span>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "GitHub", status: "Active" },
              { name: "Vercel", status: "Active" },
              { name: "Firecrawl", status: "Active" },
            ].map((conn) => (
              <div
                key={conn.name}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 text-white/75">
                  <Plug className="h-3.5 w-3.5 text-orange-400/80" />
                  <span className="font-medium text-[11px]">{conn.name}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{conn.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}
