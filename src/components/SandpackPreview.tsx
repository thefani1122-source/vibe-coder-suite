import { useMemo, useState } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
  SandpackLayout,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import { Monitor, Smartphone, Maximize2 } from "lucide-react"

interface SandpackPreviewProps {
  files: Record<string, string>
  isBuilding: boolean
  className?: string
}

const ENTRY_PRIORITIES = [
  "/src/index.tsx",
  "/src/index.jsx",
  "/index.tsx",
  "/index.jsx",
  "/src/App.tsx",
  "/src/App.jsx",
  "/App.tsx",
  "/App.jsx",
  "/index.html",
]

export function SandpackPreview({ files, isBuilding, className }: SandpackPreviewProps) {
  const fileCount = Object.keys(files).length

  // Convert "src/App.tsx" → "/src/App.tsx" with { code } wrapper
  const sandpackFiles = useMemo(
    () =>
      Object.entries(files).reduce<Record<string, { code: string }>>(
        (acc, [path, code]) => {
          acc[path.startsWith("/") ? path : `/${path}`] = { code }
          return acc
        },
        {},
      ),
    [files],
  )

  const entryFile = useMemo(() => {
    for (const p of ENTRY_PRIORITIES) {
      if (sandpackFiles[p]) return p
    }
    return Object.keys(sandpackFiles)[0] ?? "/App.tsx"
  }, [sandpackFiles])

  // Show animated skeleton while files haven't arrived yet
  if (fileCount === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex items-center justify-center gap-1 border-b px-3 py-2 shrink-0">
          <div className="h-6 w-44 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-7 w-2/5 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 animate-pulse rounded-xl bg-muted" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 animate-pulse rounded-md bg-muted" />
            <div className="h-16 animate-pulse rounded-md bg-muted" />
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {isBuilding ? "Preview appears as files generate…" : "No files generated yet"}
          </p>
        </div>
      </div>
    )
  }

  return <PreviewWithFrame files={sandpackFiles} entryFile={entryFile} className={className} />
}

function PreviewWithFrame({
  files,
  entryFile,
  className,
}: {
  files: Record<string, { code: string }>
  entryFile: string
  className?: string
}) {
  const [device, setDevice] = useState<"desktop" | "mobile" | "full">("desktop")

  // Sandpack instance — placed inside each conditional branch so React naturally
  // remounts it (and the iframe) when the device frame changes.
  const makeSandpack = () => (
    <SandpackProvider
      template="react-ts"
      files={files}
      options={{
        activeFile: entryFile,
        recompileMode: "delayed",
        recompileDelay: 800,
      }}
      theme="dark"
      customSetup={{
        dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      }}
    >
      <SandpackLayout style={{ height: "100%", width: "100%", border: "none", borderRadius: 0 }}>
        <SP
          style={{ height: "100%", width: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton
        />
      </SandpackLayout>
    </SandpackProvider>
  )

  return (
    <div className={cn("flex flex-col h-full w-full bg-background", className)}>
      {/* Device picker toolbar */}
      <div className="flex items-center justify-center gap-1 border-b px-3 py-2 shrink-0">
        <DeviceBtn active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop">
          <Monitor className="h-3.5 w-3.5" />
        </DeviceBtn>
        <DeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile">
          <Smartphone className="h-3.5 w-3.5" />
        </DeviceBtn>
        <DeviceBtn active={device === "full"} onClick={() => setDevice("full")} label="Full">
          <Maximize2 className="h-3.5 w-3.5" />
        </DeviceBtn>
      </div>

      {/* Preview canvas */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0d0d0d] p-4">
        {device === "full" && (
          <div className="h-full w-full overflow-hidden rounded-md">
            {makeSandpack()}
          </div>
        )}

        {device === "desktop" && (
          <div className="flex w-full max-w-[800px] flex-col overflow-hidden rounded-lg border border-border/30 shadow-2xl">
            {/* Browser chrome */}
            <div className="flex h-8 shrink-0 items-center gap-1.5 bg-[#1e1e1e] px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <div className="mx-2 flex-1 rounded bg-[#2d2d2d] px-3 py-0.5 text-[10px] text-muted-foreground">
                localhost:3000
              </div>
            </div>
            <div className="h-[480px] overflow-hidden">
              {makeSandpack()}
            </div>
          </div>
        )}

        {device === "mobile" && (
          <div
            className="relative flex flex-col overflow-hidden rounded-[2.5rem] border-[5px] border-border/40 bg-black shadow-2xl"
            style={{ width: 375, height: 680 }}
          >
            {/* Dynamic island */}
            <div className="absolute left-1/2 top-3 z-10 h-[26px] w-28 -translate-x-1/2 rounded-full bg-black" />
            <div className="flex-1 overflow-hidden pt-[46px]">
              {makeSandpack()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DeviceBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
