import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown, FileIcon, Folder, FolderOpen } from "lucide-react"

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileNode[]
}

interface FileTreeProps {
  files: Record<string, string>
  selectedFile?: string
  onSelectFile: (path: string) => void
  newFiles?: Set<string>
  className?: string
}

function buildTree(files: Record<string, string>): FileNode[] {
  const root: Map<string, FileNode> = new Map()

  const getOrCreate = (map: Map<string, FileNode>, name: string, path: string, isFile: boolean): FileNode => {
    if (!map.has(name)) {
      map.set(name, {
        name,
        path,
        type: isFile ? "file" : "folder",
        children: isFile ? undefined : [],
      })
    }
    return map.get(name)!
  }

  for (const filePath of Object.keys(files)) {
    const parts = filePath.split("/").filter(Boolean)
    let currentMap = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const nodePath = parts.slice(0, i + 1).join("/")
      const isLast = i === parts.length - 1
      const node = getOrCreate(currentMap, part, nodePath, isLast)

      if (!isLast) {
        const childMap = new Map(
          (node.children ?? []).map(c => [c.name, c])
        )
        currentMap = childMap
        node.children = Array.from(childMap.values())
      }
    }
  }

  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map(n => ({ ...n, children: n.children ? sortNodes(n.children) : undefined }))

  return sortNodes(Array.from(root.values()))
}

const EXT_COLOR: Record<string, string> = {
  tsx: "text-blue-400", ts: "text-blue-400",
  jsx: "text-yellow-400", js: "text-yellow-400",
  css: "text-pink-400", scss: "text-pink-400",
  json: "text-orange-400",
  md: "text-gray-400",
  html: "text-red-400",
  env: "text-green-400",
}

function getExtColor(filename: string): string {
  const ext = filename.split(".").pop() ?? ""
  return EXT_COLOR[ext] ?? "text-muted-foreground"
}

function TreeNode({
  node, depth, selectedFile, onSelect, newFiles,
}: {
  node: FileNode
  depth: number
  selectedFile?: string
  onSelect: (path: string) => void
  newFiles: Set<string>
}) {
  const [open, setOpen] = useState(depth < 2)
  const isNew = newFiles.has(node.path)
  const isSelected = selectedFile === node.path

  if (node.type === "file") {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={cn(
          "file-row w-full flex items-center gap-1.5 py-[4px] pr-2 rounded-sm text-left text-xs group",
          isSelected ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          isNew && "text-green-400"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileIcon className={cn("h-3.5 w-3.5 shrink-0", getExtColor(node.name))} />
        <span className="truncate flex-1">{node.name}</span>
        {isNew && (
          <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 rounded">
            NEW
          </span>
        )}
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(p => !p)}
        className="file-row w-full flex items-center gap-1.5 py-[4px] pr-2 rounded-sm text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
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

export function FileTree({ files, selectedFile, onSelectFile, newFiles = new Set(), className }: FileTreeProps) {
  const tree = buildTree(files)
  const count = Object.keys(files).length

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</span>
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {count === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-muted-foreground">Files appear as they generate</p>
          </div>
        ) : (
          tree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelect={onSelectFile}
              newFiles={newFiles}
            />
          ))
        )}
      </div>
    </div>
  )
}
