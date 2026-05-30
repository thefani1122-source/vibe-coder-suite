import { useMemo, useState } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import { Monitor, Smartphone, Maximize2 } from "lucide-react"

interface SandpackPreviewProps {
  files: Record<string, string>
  isBuilding: boolean
  className?: string
  /** When provided, suppresses the internal device toolbar and uses this value instead. */
  externalDevice?: "desktop" | "mobile" | "full"
}

export function SandpackPreview({ files, isBuilding, className, externalDevice }: SandpackPreviewProps) {
  const fileCount = Object.keys(files).length

  const sandpackFiles = useMemo(() => {
    const result: Record<string, { code: string }> = {}
    for (const [rawPath, content] of Object.entries(files)) {
      const normalized = "/" + rawPath.replace(/^\/+/, "")
      // The react-ts template expects all source files under /src/.
      // If the backend sends root-level files ("App.tsx", "index.tsx"),
      // remap them into /src/ so they override the template's defaults —
      // otherwise the template's own /src/App.tsx ("Hello World") loads instead.
      const cleanPath =
        !normalized.startsWith("/src/") &&
        !normalized.startsWith("/public/") &&
        /\.(tsx?|jsx?|css|svg)$/.test(normalized)
          ? "/src" + normalized
          : normalized
      result[cleanPath] = { code: content }
    }

    // If there's no entry/bootstrap file, inject one so the App component renders
    const hasEntry =
      result["/src/index.tsx"] ||
      result["/src/index.jsx"] ||
      result["/src/main.tsx"]
    if (!hasEntry && (result["/src/App.tsx"] || result["/src/App.jsx"])) {
      result["/src/index.tsx"] = {
        code:
          "import React from 'react';\n" +
          "import ReactDOM from 'react-dom/client';\n" +
          "import App from './App';\n" +
          "\n" +
          "ReactDOM.createRoot(document.getElementById('root')!).render(\n" +
          "  <React.StrictMode><App /></React.StrictMode>\n" +
          ");",
      }
    }

    return result
  }, [files])

  // Prefer the most common entry points in order
  const entryFile =
    sandpackFiles["/src/index.tsx"] ? "/src/index.tsx" :
    sandpackFiles["/src/index.jsx"] ? "/src/index.jsx" :
    sandpackFiles["/src/main.tsx"]  ? "/src/main.tsx"  :
    sandpackFiles["/index.tsx"]     ? "/index.tsx"     :
    sandpackFiles["/src/App.tsx"]   ? "/src/App.tsx"   :
    sandpackFiles["/App.tsx"]       ? "/App.tsx"       :
    Object.keys(sandpackFiles)[0]   ?? "/src/index.tsx"

  // Skeleton while files haven't arrived yet
  if (fileCount === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-[#0a0a0a]", className)}>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-7 w-2/5 animate-pulse rounded-md bg-white/[0.06]" />
          <div className="flex-1 animate-pulse rounded-xl bg-white/[0.04]" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 animate-pulse rounded-md bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-md bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-md bg-white/[0.06]" />
          </div>
          <p className="text-center text-xs text-white/40">
            {isBuilding ? "Preview appears as files generate…" : "No files generated yet"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <PreviewWithFrame
      files={sandpackFiles}
      entryFile={entryFile}
      className={className}
      externalDevice={externalDevice}
    />
  )
}

function PreviewWithFrame({
  files,
  entryFile,
  className,
  externalDevice,
}: {
  files: Record<string, { code: string }>
  entryFile: string
  className?: string
  externalDevice?: "desktop" | "mobile" | "full"
}) {
  const [internalDevice, setInternalDevice] = useState<"desktop" | "mobile" | "full">("desktop")
  const device = externalDevice ?? internalDevice
  const setDevice = (d: "desktop" | "mobile" | "full") => { if (!externalDevice) setInternalDevice(d) }

  const makeSandpack = () => (
    <SandpackProvider
      template="react-ts"
      files={files}
      options={{
        activeFile: entryFile,
        visibleFiles: Object.keys(files).slice(0, 5),
        recompileMode: "delayed",
        recompileDelay: 800,
      }}
      theme="dark"
      customSetup={{
        entry: entryFile,
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
        },
      }}
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
    >
      <SP
        style={{ flex: 1, width: "100%" }}
        showNavigator={false}
        showOpenInCodeSandbox={false}
      />
    </SandpackProvider>
  )

  return (
    <div className={cn("flex flex-col h-full w-full bg-[#0a0a0a]", className)}>
      {/* Internal device picker — only when not driven by top bar */}
      {!externalDevice && (
        <div className="flex items-center justify-center gap-1 border-b border-white/[0.06] px-3 py-2 shrink-0">
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
      )}

      {/* Preview canvas — fills all remaining space, no device frames */}
      <div className="h-full w-full overflow-hidden flex flex-col">
        {makeSandpack()}
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
          ? "bg-white/[0.10] text-white"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
