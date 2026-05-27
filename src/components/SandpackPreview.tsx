import { useMemo } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
  SandpackLayout,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"

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
      <div className={cn("flex flex-col items-center justify-center h-full gap-3", className)}>
        <div className="w-10 h-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Preview appears as files generate...</p>
      </div>
    )
  }

  if (fileCount === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
        <span className="text-4xl">🖥️</span>
        <p className="text-sm text-muted-foreground">No files generated yet</p>
      </div>
    )
  }

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <SandpackProvider
        template="react-ts"
        files={sandpackFiles}
        options={{
          activeFile: entryFile,
          recompileMode: "delayed",
          recompileDelay: 800,
        }}
        theme="dark"
        customSetup={{
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
        }}
      >
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
          <SP
            style={{ height: "100%" }}
            showOpenInCodeSandbox={false}
            showRefreshButton
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  )
}
