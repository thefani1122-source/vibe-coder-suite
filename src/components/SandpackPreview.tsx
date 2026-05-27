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

export function SandpackPreview({ files, isBuilding, className }: SandpackPreviewProps) {
  const fileCount = Object.keys(files).length

  const sandpackFiles = useMemo(() => {
    const result: Record<string, { code: string }> = {}
    for (const [path, code] of Object.entries(files)) {
      const p = path.startsWith("/") ? path : `/${path}`
      result[p] = { code }
    }
    return result
  }, [files])

  const entryFile = useMemo(() => {
    const priorities = [
      "/src/App.tsx", "/src/App.jsx", "/src/main.tsx", "/src/index.tsx",
      "/App.tsx", "/App.jsx", "/index.tsx", "/index.jsx", "/index.html",
    ]
    for (const p of priorities) {
      if (sandpackFiles[p]) return p
    }
    return Object.keys(sandpackFiles)[0] ?? "/App.tsx"
  }, [sandpackFiles])

  if (isBuilding && fileCount === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-background p-6 gap-4", className)}>
        <div className="skeleton-shimmer h-8 w-48" />
        <div className="skeleton-shimmer flex-1 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton-shimmer h-20" />
          <div className="skeleton-shimmer h-20" />
          <div className="skeleton-shimmer h-20" />
        </div>
        <p className="text-xs text-muted-foreground text-center">Preview appears as files generate…</p>
      </div>
    )
  }

  if (fileCount === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2 bg-background", className)}>
        <span className="text-4xl">🖥️</span>
        <p className="text-sm text-muted-foreground">No files generated yet</p>
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

  const sandpack = (
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
      <div key={device} className="flex-1 overflow-auto p-6 flex items-center justify-center animate-fade-in">
        {device === "full" && (
          <div className="h-full w-full overflow-hidden rounded-md border">{sandpack}</div>
        )}
        {device === "desktop" && (
          <div className="device-macbook">
            <div className="device-macbook-screen">{sandpack}</div>
            <div className="device-macbook-base" />
          </div>
        )}
        {device === "mobile" && (
          <div className="device-iphone">
            <div className="device-iphone-screen">
              <div className="device-iphone-notch" />
              {sandpack}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DeviceBtn({
  active, onClick, label, children,
}: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
