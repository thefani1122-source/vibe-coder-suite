import { Component, useState, useMemo, type ReactNode } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"

// ─── Entry-file priority list (most specific first) ──────────────────────────
const ENTRY_PRIORITY = [
  "/src/index.tsx",
  "/src/index.jsx",
  "/src/main.tsx",
  "/index.tsx",
  "/src/App.tsx",
  "/App.tsx",
] as const

// ─── Shared "Preview failed" screen ──────────────────────────────────────────

interface FailScreenProps {
  reasons: string[]
  error: string | null
  files: Record<string, { code: string }>
  entryFile: string
  onRetry: () => void
}

function PreviewFailScreen({ reasons, error, files, entryFile, onRetry }: FailScreenProps) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#080808] p-6">
      <div className="w-full max-w-md space-y-3">

        {/* Error card */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5">
          <p className="text-sm font-semibold text-red-400">Preview failed to load</p>

          <p className="mt-2.5 text-xs text-white/50">This might be due to:</p>
          <ul className="mt-1.5 space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-white/40">• {r}</li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-white/30">
            Try: Refresh the page or start a new build.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onRetry}
              className="rounded-lg border border-white/[0.10] px-4 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.06]"
            >
              Retry
            </button>
            <button
              onClick={() => setShowDebug(d => !d)}
              className="rounded-lg border border-white/[0.07] px-4 py-1.5 text-xs text-white/40 transition hover:bg-white/[0.04]"
            >
              {showDebug ? "Hide debug" : "Debug"}
            </button>
          </div>
        </div>

        {/* Debug panel */}
        {showDebug && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 font-mono text-[11px] text-white/40 space-y-3">
            <p className="font-sans text-xs font-semibold text-white/60">Debug info</p>

            <div>
              <span className="text-white/30">Entry detected: </span>
              <span className="text-violet-400/80">{entryFile || "(none)"}</span>
            </div>

            <div>
              <span className="text-white/30">Files ({Object.keys(files).length}):</span>
              <div className="mt-1 max-h-[120px] overflow-y-auto space-y-px">
                {Object.keys(files).map(f => (
                  <div key={f} className="pl-2 text-white/35">{f}</div>
                ))}
              </div>
            </div>

            {error && (
              <div>
                <span className="text-white/30">Error:</span>
                <pre className="mt-1 max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-red-400/60">
                  {error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── React error boundary (catches render-phase crashes) ─────────────────────

class PreviewErrorBoundary extends Component<
  { children: ReactNode; files: Record<string, { code: string }>; entryFile: string },
  { error: string | null }
> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <PreviewFailScreen
          reasons={["A React render error in the preview sandbox"]}
          error={this.state.error}
          files={this.props.files}
          entryFile={this.props.entryFile}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

// ─── Inner component — runs inside SandpackProvider so useSandpack() works ───

function SandpackInner({
  files,
  entryFile,
  onRetry,
}: {
  files: Record<string, { code: string }>
  entryFile: string
  onRetry: () => void
}) {
  const { sandpack } = useSandpack()
  // Sandpack exposes a single `error` object (not an array) on SandpackState
  const rawError = sandpack.error as { message?: string; title?: string } | null | undefined

  if (rawError) {
    const errorText = rawError.message ?? rawError.title ?? String(rawError)

    // Classify into human-readable reasons
    const reasons: string[] = []
    if (/SyntaxError|Unexpected token|Unexpected identifier/i.test(errorText))
      reasons.push("A syntax error in the generated code")
    if (/cannot find module|module not found|failed to resolve/i.test(errorText))
      reasons.push("A missing import or module")
    if (/main component|default export|no default export/i.test(errorText))
      reasons.push("Missing entry file (src/App.tsx)")
    if (/@tailwind|@layer|@apply|invalid css/i.test(errorText))
      reasons.push("Invalid CSS formatting (PostCSS directives in Sandpack)")
    if (reasons.length === 0) {
      // Fallback generic list when the error doesn't match a pattern
      reasons.push("A syntax error in the generated code")
      reasons.push("Missing entry file (src/App.tsx)")
      reasons.push("Invalid CSS formatting")
    }

    return (
      <PreviewFailScreen
        reasons={reasons}
        error={errorText ?? null}
        files={files}
        entryFile={entryFile}
        onRetry={onRetry}
      />
    )
  }

  return (
    <SP
      style={{ flex: 1, width: "100%" }}
      showNavigator={false}
      showOpenInCodeSandbox={false}
    />
  )
}

// ─── Outer frame + SandpackProvider ──────────────────────────────────────────

function PreviewWithFrame({
  files,
  entryFile,
  className,
  externalDevice,
}: {
  files: Record<string, { code: string }>
  entryFile: string
  className?: string
  externalDevice?: "desktop" | "mobile" | "tablet"
}) {
  const [retryKey, setRetryKey] = useState(0)
  const device = externalDevice ?? "desktop"
  const mobile = device === "mobile"
  const tablet = device === "tablet"

  return (
    <div
      className={cn("h-full w-full bg-[#080808]", className)}
      style={{ padding: 24 }}
    >
      <div className="flex h-full justify-center">
        <div
          style={{
            width: "100%",
            height: "100%",
            maxWidth: mobile ? 420 : tablet ? 768 : "none",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PreviewErrorBoundary files={files} entryFile={entryFile}>
            <SandpackProvider
              key={retryKey}
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
              <SandpackInner
                files={files}
                entryFile={entryFile}
                onRetry={() => setRetryKey(k => k + 1)}
              />
            </SandpackProvider>
          </PreviewErrorBoundary>
        </div>
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SandpackPreviewProps {
  files: Record<string, string>
  isBuilding: boolean
  className?: string
  externalDevice?: "desktop" | "mobile" | "tablet"
}

export function SandpackPreview({ files, isBuilding, className, externalDevice }: SandpackPreviewProps) {
  const fileCount = Object.keys(files).length

  const sandpackFiles = useMemo(() => {
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
      const cleanPath =
        !normalized.startsWith("/src/") &&
        !normalized.startsWith("/public/") &&
        /\.(tsx?|jsx?|css|svg)$/.test(normalized)
          ? "/src" + normalized
          : normalized

      const code = cleanPath.endsWith(".css")
        ? content.replace(/^@(tailwind|layer|apply)\b.*$/gm, "").trim()
        : content

      result[cleanPath] = { code }
    }

    // Auto-inject a bootstrap entry if the backend only sent App.tsx
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

    // Inject Tailwind CDN via index.html so class names work without PostCSS
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

  // Detect entry file with cascading fallbacks
  const entryFile = ENTRY_PRIORITY.find(p => sandpackFiles[p]) ?? null

  // ── Skeleton while no files have arrived ───────────────────────────────────
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

  // ── No valid entry component found ─────────────────────────────────────────
  if (!entryFile) {
    return (
      <div className={cn("h-full w-full bg-[#080808]", className)}>
        <PreviewFailScreen
          reasons={["No valid entry component found (App.tsx / index.tsx / main.tsx)"]}
          error={null}
          files={sandpackFiles}
          entryFile="(none detected)"
          onRetry={() => {}}
        />
      </div>
    )
  }

  // ── Normal render ──────────────────────────────────────────────────────────
  return (
    <PreviewWithFrame
      files={sandpackFiles}
      entryFile={entryFile}
      className={className}
      externalDevice={externalDevice}
    />
  )
}
