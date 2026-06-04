import { useEffect, useRef, useState, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import type { FileSystemTree } from "@webcontainer/api"
import { cn } from "@/lib/utils"
import { ExternalLink, RotateCw, Download, Check } from "lucide-react"
import { toast } from "sonner"

// ─── Browser support detection ────────────────────────────────────────────────

function isSupportedBrowser(): boolean {
  // WebContainers require SharedArrayBuffer (cross-origin isolation) and
  // only run in Chromium-based browsers (Chrome 89+, Edge 89+).
  if (typeof SharedArrayBuffer === "undefined") return false
  const ua = navigator.userAgent
  return /Chrome\/|Edg\/|Chromium\//.test(ua) && !/Safari\/[0-9]/.test(ua.replace(/Chrome\/[0-9]+/, "").replace(/Edg\/[0-9]+/, ""))
}

// ─── File tree conversion ─────────────────────────────────────────────────────

function toFileTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {}

  for (const [rawPath, content] of Object.entries(files)) {
    const parts = rawPath.replace(/^\/+/, "").split("/")
    let node = tree

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i]
      if (!node[dir]) {
        node[dir] = { directory: {} }
      }
      node = (node[dir] as { directory: FileSystemTree }).directory
    }

    const filename = parts[parts.length - 1]
    node[filename] = { file: { contents: content } }
  }

  return tree
}

// Inject a minimal package.json and vite config if not already present.
function ensureViteSetup(files: Record<string, string>): Record<string, string> {
  const out = { ...files }

  if (!out["package.json"]) {
    out["package.json"] = JSON.stringify({
      name: "app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite --host",
        build: "vite build",
        preview: "vite preview --host",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.0.0",
        vite: "^5.0.0",
      },
    }, null, 2)
  } else {
    // Ensure dev script uses --host flag so WebContainers can expose the port
    try {
      const pkg = JSON.parse(out["package.json"])
      if (pkg.scripts?.dev && !pkg.scripts.dev.includes("--host")) {
        pkg.scripts.dev = pkg.scripts.dev + " --host"
      }
      if (!pkg.scripts?.dev) {
        pkg.scripts = { ...(pkg.scripts ?? {}), dev: "vite --host" }
      }
      out["package.json"] = JSON.stringify(pkg, null, 2)
    } catch { /* leave as-is */ }
  }

  if (!out["vite.config.ts"] && !out["vite.config.js"]) {
    out["vite.config.ts"] = [
      "import { defineConfig } from 'vite'",
      "import react from '@vitejs/plugin-react'",
      "export default defineConfig({ plugins: [react()] })",
    ].join("\n")
  }

  // Bootstrap index.html for Vite
  if (!out["index.html"] && !out["public/index.html"]) {
    out["index.html"] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>App</title>
</head>
<body style="margin:0;padding:0">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
  }

  // Bootstrap entry if only App.tsx exists
  if (!out["src/index.tsx"] && !out["src/index.jsx"] && !out["src/main.tsx"]) {
    const app = out["src/App.tsx"] ?? out["src/App.jsx"]
    if (app) {
      out["src/main.tsx"] = [
        "import React from 'react'",
        "import ReactDOM from 'react-dom/client'",
        "import App from './App'",
        "",
        "ReactDOM.createRoot(document.getElementById('root')!).render(",
        "  <React.StrictMode><App /></React.StrictMode>",
        ")",
      ].join("\n")
    }
  }

  return out
}

// ─── Loading stages ───────────────────────────────────────────────────────────

const WC_STAGES = [
  "Booting WebContainer",
  "Installing dependencies",
  "Starting dev server",
] as const

type Stage = 0 | 1 | 2

// ─── Unsupported browser screen ───────────────────────────────────────────────

function UnsupportedScreen({ files }: { files: Record<string, string> }) {
  const handleDownload = () => {
    const entries = Object.entries(files)
    if (entries.length === 0) { toast("No files to download"); return }
    const blob = new Blob(
      [entries.map(([p, c]) => `// === ${p} ===\n${c}`).join("\n\n")],
      { type: "text/plain" },
    )
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "codebase.txt",
    })
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success("Codebase downloaded")
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#080808] p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
          <p className="text-base font-semibold text-amber-400">Browser not supported</p>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            Live fullstack preview requires Chrome or Edge (Chromium-based).
            Safari and Firefox do not support the required APIs.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Your code is ready — open in Chrome to see the live preview, or download now.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              <Download className="h-3.5 w-3.5" />
              Download Codebase
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  error, files, onRetry,
}: {
  error: string
  files: Record<string, string>
  onRetry: () => void
}) {
  const handleDownload = () => {
    const entries = Object.entries(files)
    if (entries.length === 0) { toast("No files to download"); return }
    const blob = new Blob(
      [entries.map(([p, c]) => `// === ${p} ===\n${c}`).join("\n\n")],
      { type: "text/plain" },
    )
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "codebase.txt",
    })
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success("Codebase downloaded")
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#080808] p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-5">
          <p className="text-base font-semibold text-yellow-400">Could not start live preview</p>
          <p className="mt-2 font-mono text-xs text-white/40 break-words">{error}</p>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            Your code is ready. Download and deploy to see the full app.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-4 py-2 text-xs text-white/70 transition hover:bg-white/[0.06]"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry Preview
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 active:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download Codebase
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Loading panel ────────────────────────────────────────────────────────────

function LoadingPanel({ stage, logLines }: { stage: Stage; logLines: string[] }) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500/40 border-t-violet-400" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-white/60">{WC_STAGES[stage]}</p>
        <p className="mt-0.5 text-xs text-white/30">This takes 30–90 seconds</p>
      </div>

      {/* Stage indicators */}
      <div className="space-y-2">
        {WC_STAGES.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              i < stage  ? "text-emerald-400" :
              i === stage ? "text-white/60"    : "text-white/20",
            )}
          >
            {i < stage ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : i === stage ? (
              <div className="h-3 w-3 shrink-0 rounded-full border border-current border-t-transparent animate-spin" />
            ) : (
              <div className="h-3 w-3 shrink-0 rounded-full border border-current opacity-40" />
            )}
            {s}
          </div>
        ))}
      </div>

      {/* Terminal output log */}
      {logLines.length > 0 && (
        <div
          ref={logRef}
          className="w-full max-w-md rounded-lg border border-white/[0.06] bg-black/30 p-3 font-mono text-[10px] text-white/40 max-h-[120px] overflow-y-auto space-y-px"
        >
          {logLines.slice(-30).map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inner WebContainer hook ──────────────────────────────────────────────────

let globalWC: WebContainer | null = null

async function getOrBootWC(): Promise<WebContainer> {
  if (globalWC) return globalWC
  globalWC = await WebContainer.boot()
  return globalWC
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WebContainerPreviewProps {
  files: Record<string, string>
  onRetry: () => void
  device?: "desktop" | "mobile" | "tablet"
  className?: string
}

export function WebContainerPreview({ files, onRetry, device = "desktop", className }: WebContainerPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [stage, setStage]           = useState<Stage>(0)
  const [error, setError]           = useState<string | null>(null)
  const [logLines, setLogLines]     = useState<string[]>([])

  const appendLog = useCallback((line: string) => {
    setLogLines(prev => [...prev, line])
  }, [])

  useEffect(() => {
    let cancelled = false
    let wc: WebContainer | null = null

    async function run() {
      try {
        // Stage 0: boot
        setStage(0)
        appendLog("Booting WebContainer…")
        wc = await getOrBootWC()
        if (cancelled) return

        // Mount all files
        const prepared = ensureViteSetup(files)
        const tree = toFileTree(prepared)
        await wc.mount(tree)
        if (cancelled) return
        appendLog(`Mounted ${Object.keys(prepared).length} files`)

        // Stage 1: npm install
        setStage(1)
        appendLog("Running npm install…")
        const install = await wc.spawn("npm", ["install"])
        install.output.pipeTo(
          new WritableStream({ write(data) { if (!cancelled) appendLog(data.trimEnd()) } })
        )
        const installCode = await install.exit
        if (cancelled) return
        if (installCode !== 0) throw new Error(`npm install exited with code ${installCode}`)

        // Stage 2: dev server
        setStage(2)
        appendLog("Starting dev server…")
        const dev = await wc.spawn("npm", ["run", "dev"])
        dev.output.pipeTo(
          new WritableStream({ write(data) { if (!cancelled) appendLog(data.trimEnd()) } })
        )

        // Wait for server-ready
        wc.on("server-ready", (_port, url) => {
          if (!cancelled) {
            appendLog(`Server ready at ${url}`)
            setPreviewUrl(url)
          }
        })
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          appendLog(`Error: ${msg}`)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [files, appendLog])

  if (!isSupportedBrowser()) {
    return <UnsupportedScreen files={files} />
  }

  if (error) {
    return <ErrorScreen error={error} files={files} onRetry={onRetry} />
  }

  const mobile = device === "mobile"
  const tablet = device === "tablet"

  return (
    <div className={cn("h-full w-full bg-[#080808]", className)} style={{ padding: 24 }}>
      <div className="flex h-full justify-center">
        <div
          style={{
            width: "100%",
            height: "100%",
            maxWidth: mobile ? 420 : tablet ? 768 : "none",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Toolbar — only when server is live */}
          {previewUrl && (
            <div className="shrink-0 flex items-center gap-2 border-b border-white/[0.08] bg-[#0d0d0d] px-3 py-1.5">
              <span className="font-mono text-[11px] text-white/35 truncate">{previewUrl}</span>
              <div className="flex-1" />
              <button
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.10] px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/[0.06]"
              >
                <ExternalLink className="h-3 w-3" />
                Open in New Tab
              </button>
            </div>
          )}

          {/* Content */}
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="WebContainer Preview"
              style={{ flex: 1, width: "100%", height: "100%", border: "none", display: "block" }}
              allow="cross-origin-isolated; clipboard-write; clipboard-read"
            />
          ) : (
            <LoadingPanel stage={stage} logLines={logLines} />
          )}
        </div>
      </div>
    </div>
  )
}
