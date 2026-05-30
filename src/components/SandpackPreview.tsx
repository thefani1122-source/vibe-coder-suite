import { useMemo } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"

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
    // Sandpack's browser bundler cannot use these — skip them entirely so they
    // don't override the template's package.json or cause null-path errors.
    const SKIP = new Set([
      "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
      "tailwind.config.js", "tailwind.config.ts",
      "postcss.config.js", "postcss.config.ts", "postcss.config.cjs",
      "vite.config.ts", "vite.config.js",
      "next.config.js", "next.config.ts",
      "tsconfig.json", "tsconfig.node.json",
      ".env", ".gitignore", ".eslintrc.js", ".eslintrc.json",
    ])

    const result: Record<string, { code: string }> = {}
    for (const [rawPath, content] of Object.entries(files)) {
      const basename = rawPath.split("/").pop() ?? ""
      if (SKIP.has(basename)) continue

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

      // Strip @tailwind / @layer / @apply directives — Sandpack has no PostCSS,
      // so these cause "Path must be a string. Received null" in the bundler.
      const code = cleanPath.endsWith(".css")
        ? content.replace(/^@(tailwind|layer|apply)\b.*$/gm, "").trim()
        : content

      result[cleanPath] = { code }
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

    // Always inject a custom index.html that loads Tailwind CDN so plain
    // Tailwind class names work even when the LLM omits a PostCSS build step.
    result["/public/index.html"] = {
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>App</title>
</head>
<body style="margin:0;padding:0">
  <div id="root"></div>
</body>
</html>`,
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
      <div className={cn("flex flex-col h-full bg-[#080808]", className)}>
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
  // Device is driven entirely by the workspace top bar. "mobile" simply
  // constrains the iframe width (centered); desktop/full are edge-to-edge.
  const device = externalDevice ?? "desktop"
  const mobile = device === "mobile"

  const makeSandpack = () => (
    <SandpackProvider
      template="react"
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
    <div
      className={cn("flex h-full w-full justify-center bg-[#080808]", className)}
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          maxWidth: mobile ? 420 : "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {makeSandpack()}
      </div>
    </div>
  )
}
