import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react"

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileNode[]
}

interface FileTreeProps {
  files: Record<string, string>
  selectedFile: string | null
  onFileSelect: (path: string) => void
  newFiles?: Set<string>
  className?: string
}

// Build a proper nested tree. Uses a plain-object hierarchy (null = leaf file)
// so children are accumulated correctly before converting to arrays.
function buildTree(files: Record<string, string>): FileNode[] {
  const dir: Record<string, unknown> = {}

  for (const filePath of Object.keys(files)) {
    const parts = filePath.split("/").filter(Boolean)
    let cursor = dir
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cursor[parts[i]] !== "object" || cursor[parts[i]] === null) {
        cursor[parts[i]] = {}
      }
      cursor = cursor[parts[i]] as Record<string, unknown>
    }
    // Mark the leaf — only set to null if not already a folder object
    const leaf = parts[parts.length - 1]
    if (!(leaf in cursor)) {
      cursor[leaf] = null
    }
  }

  function toNodes(obj: Record<string, unknown>, prefix: string): FileNode[] {
    return Object.entries(obj)
      .sort(([aName, aVal], [bName, bVal]) => {
        const aIsDir = aVal !== null && typeof aVal === "object"
        const bIsDir = bVal !== null && typeof bVal === "object"
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
        return aName.localeCompare(bName)
      })
      .map(([name, val]) => {
        const path = prefix ? `${prefix}/${name}` : name
        if (val === null) {
          return { name, path, type: "file" as const }
        }
        return {
          name,
          path,
          type: "folder" as const,
          children: toNodes(val as Record<string, unknown>, path),
        }
      })
  }

  return toNodes(dir, "")
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "tsx" || ext === "jsx")
    return <span className="w-4 shrink-0 text-center text-[11px] leading-none text-blue-400">⚛</span>
  if (ext === "ts" || ext === "js")
    return <span className="w-4 shrink-0 text-center text-[9px] font-bold leading-none text-yellow-400">JS</span>
  if (ext === "css" || ext === "scss")
    return <span className="w-4 shrink-0 text-center text-[11px] leading-none">🎨</span>
  if (ext === "json")
    return <span className="w-4 shrink-0 text-center font-mono text-[10px] leading-none text-orange-400">{"{}"}</span>
  return <span className="w-4 shrink-0 text-center text-[11px] leading-none">📄</span>
}

function TreeNode({
  node,
  depth,
  selectedFile,
  onSelect,
  newFiles,
}: {
  node: FileNode
  depth: number
  selectedFile: string | null
  onSelect: (path: string) => void
  newFiles: Set<string>
}) {
  const [open, setOpen] = useState(depth < 2)
  const isNew = newFiles.has(node.path)
  const isSelected = selectedFile === node.path

  if (node.type === "file") {
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-sm py-[4px] pr-2 text-left text-xs",
          isSelected
            ? "bg-primary/20 text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileTypeIcon name={node.name} />
        <span className="flex-1 truncate">{node.name}</span>
        {isNew && (
          <span className="rounded bg-green-400/10 px-1 text-[9px] font-bold text-green-400">
            NEW
          </span>
        )}
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center gap-1.5 rounded-sm py-[4px] pr-2 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {open
          ? <ChevronDown className="h-3 w-3 shrink-0" />
          : <ChevronRight className="h-3 w-3 shrink-0" />
        }
        {open
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
          : <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
        }
        <span className="truncate">{node.name}</span>
      </button>

      {open && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
              newFiles={newFiles}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({
  files,
  selectedFile,
  onFileSelect,
  newFiles = new Set(),
  className,
}: FileTreeProps) {
  const tree = buildTree(files)
  const count = Object.keys(files).length

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {count === 0 ? "Files" : `${count} files generated`}
        </span>
        {count > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {count === 0 ? (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-muted-foreground">Waiting for build...</p>
          </div>
        ) : (
          tree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelect={onFileSelect}
              newFiles={newFiles}
            />
          ))
        )}
      </div>
    </div>
  )
}
