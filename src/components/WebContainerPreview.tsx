import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Check, ExternalLink, RotateCw } from "lucide-react"
import { SandpackPreview } from "@/components/SandpackPreview"
import type { WCStage } from "@/lib/webcontainer"

// ─── Browser support detection ────────────────────────────────────────────────

function isChromiumBrowser(): boolean {
  const ua = navigator.userAgent
  // Chrome/Edge/Chromium all contain 'Chrome/N' in their UA.
  // Real Safari only has 'Safari/N' (no 'Chrome/'). Firefox has neither.
  return /Chrome\/\d/.test(ua) || /Chromium\/\d/.test(ua)
}

// ─── Framework detection ──────────────────────────────────────────────────────

type Framework = "next" | "vue" | "react"

function detectFramework(files: Record<string, string>): Framework {
  const pkgRaw = files["package.json"] ?? files["/package.json"]
  if (pkgRaw) {
    try {
      const deps = {
        ...(JSON.parse(pkgRaw).dependencies ?? {}),
        ...(JSON.parse(pkgRaw).devDependencies ?? {}),
      }
      if ("next" in deps) return "next"
      if ("vue" in deps) return "vue"
    } catch { /* fall through */ }
  }
  return "react"
}

const FRAMEWORK_LABEL: Record<Framework, string> = {
  next:  "Next.js",
  vue:   "Vue + Vite",
  react: "React + Vite",
}

// ─── Loading stages ───────────────────────────────────────────────────────────

const WC_STAGES = [
  "Booting WebContainer",
  "Installing dependencies",
  "Starting dev server",
] as const

// ─── Sandpack fallback (shown when WebContainers can't boot) ──────────────────

function SandpackFallback({
  files,
  device,
  notice,
  onRetryWC,
}: {
  files: Record<string, string>
  device: "desktop" | "mobile" | "tablet"
  notice: string
  onRetryWC: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/[0.05] px-3 py-1.5">
        <span className="text-xs text-amber-400/80 truncate">{notice}</span>
        <button
          onClick={onRetryWC}
          className="shrink-0 flex items-center gap-1 rounded border border-amber-500/30 px-2.5 py-0.5 text-xs text-amber-400/70 transition hover:bg-amber-500/10"
        >
          <RotateCw className="h-3 w-3" />
          Retry live
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <SandpackPreview files={files} isBuilding={false} externalDevice={device} className="h-full w-full" />
      </div>
    </div>
  )
}

// ─── Loading panel ────────────────────────────────────────────────────────────

function LoadingPanel({ stage, framework }: { stage: WCStage; framework: Framework }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500/40 border-t-violet-400" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-white/60">{WC_STAGES[stage]}</p>
        <p className="mt-0.5 text-xs text-white/30">
          {FRAMEWORK_LABEL[framework]} · This takes 30–90 seconds
        </p>
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
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
// Purely presentational — WebContainer lifecycle (boot, incremental file
// writes, npm install, dev server) is owned by the workspace route so it can
// run in parallel with AI generation. This component just renders whatever
// stage/log/url state it's handed.

interface WebContainerPreviewProps {
  files: Record<string, string>
  previewUrl: string | null
  stage: WCStage
  wcError: string | null
  onRetry: () => void
  device?: "desktop" | "mobile" | "tablet"
  className?: string
}

export function WebContainerPreview({
  files, previewUrl, stage, wcError, onRetry, device = "desktop", className,
}: WebContainerPreviewProps) {
  const [iframeLoaded, setIframeLoaded]         = useState(false)
  const [showFallbackLink, setShowFallbackLink] = useState(false)

  const framework = detectFramework(files)

  // Fallback external link: shown after 4 seconds if the iframe hasn't loaded.
  // Lets users open the preview in a new tab when the inline iframe is slow/blank.
  useEffect(() => {
    if (!previewUrl || iframeLoaded) return
    const timer = setTimeout(() => setShowFallbackLink(true), 4000)
    return () => clearTimeout(timer)
  }, [previewUrl, iframeLoaded])

  // Reset fade state when the preview URL changes (e.g. after a retry).
  useEffect(() => {
    setIframeLoaded(false)
    setShowFallbackLink(false)
  }, [previewUrl])

  // Debug logging — emitted once on mount so devtools always show exact values
  useEffect(() => {
    console.log("[WebContainerPreview]", {
      crossOriginIsolated: window.crossOriginIsolated,
      userAgent: navigator.userAgent,
      isChromium: isChromiumBrowser(),
    })
  }, [])

  // ── Render-time guards (ordered: browser → isolation → error → live) ─────────

  // Non-Chromium browser — WC not supported, fall back to Sandpack
  if (!isChromiumBrowser()) {
    return (
      <SandpackFallback
        files={files}
        device={device}
        notice="Live preview requires Chrome or Edge — showing frontend-only preview"
        onRetryWC={onRetry}
      />
    )
  }

  // Chrome/Edge but COOP/COEP not applied — WC cannot boot, fall back to Sandpack
  if (!window.crossOriginIsolated) {
    return (
      <SandpackFallback
        files={files}
        device={device}
        notice="Frontend-only preview — fullstack live preview requires cross-origin isolation"
        onRetryWC={onRetry}
      />
    )
  }

  // WC runtime error — fall back to Sandpack
  if (wcError) {
    return (
      <SandpackFallback
        files={files}
        device={device}
        notice={`WebContainer error: ${wcError} — showing frontend-only preview`}
        onRetryWC={onRetry}
      />
    )
  }

  const mobile = device === "mobile"
  const tablet = device === "tablet"

  return (
    <div className={cn("h-full w-full bg-[#080808]", className)} style={{ padding: 24 }}>
      <div className="flex h-full justify-center">
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            maxWidth: mobile ? 420 : tablet ? 768 : "none",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Loading panel — fades out once the iframe has loaded */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              opacity: iframeLoaded ? 0 : 1,
              transition: "opacity 500ms ease",
              pointerEvents: iframeLoaded ? "none" : "auto",
              background: "#080808",
            }}
          >
            <LoadingPanel stage={stage} framework={framework} />
          </div>

          {/* Preview iframe — fades in directly, no URL bar */}
          {previewUrl && (
            <iframe
              src={previewUrl}
              title="WebContainer Preview"
              onLoad={(e) => {
                console.log("[iframe] loaded src:", e.currentTarget.src)
                setIframeLoaded(true)
              }}
              onError={() => console.log("[iframe] LOAD ERROR")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                opacity: iframeLoaded ? 1 : 0,
                transition: "opacity 500ms ease",
              }}
              allow="cross-origin-isolated; clipboard-write; clipboard-read"
            />
          )}

          {/* Tiny "open in new tab" icon — top-right corner, unobtrusive */}
          {previewUrl && iframeLoaded && (
            <button
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              title="Open in new tab"
              style={{ position: "absolute", top: 10, right: 10, zIndex: 20 }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.10] bg-black/50 text-white/50 backdrop-blur transition hover:text-white/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Fallback link — appears after 4s if the iframe stays blank */}
          {showFallbackLink && !iframeLoaded && previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ position: "absolute", bottom: 12, right: 12, zIndex: 20 }}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-black/70 px-3 py-1.5 text-xs text-white/60 backdrop-blur transition hover:text-white/90"
            >
              <ExternalLink className="h-3 w-3" />
              Preview not loading? Open in new tab
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
