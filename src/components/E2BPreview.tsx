import { useState, useRef } from "react"
import { SandpackPreview } from "@/components/SandpackPreview"

interface E2BPreviewProps {
  url: string | null
  loading: boolean
  isFullstack: boolean
  files: Record<string, string>
  device?: "desktop" | "mobile" | "tablet"
}

export function E2BPreview({ url, loading, isFullstack, files, device = "desktop" }: E2BPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [, setIframeError] = useState(false)

  // Frontend-only: use Sandpack (already working)
  if (!isFullstack) {
    return (
      <SandpackPreview
        files={files}
        isBuilding={false}
        externalDevice={device}
        className="h-full w-full"
      />
    )
  }

  // Fullstack: show E2B preview — a real public URL that loads directly in an
  // iframe (no Service Workers, no COEP headers, no cross-origin issues).
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#080808",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Loading state */}
      {loading && !url && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "2px solid rgba(255,255,255,0.08)",
              borderTop: "2px solid rgba(255,255,255,0.8)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
              Starting preview...
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Installing dependencies and starting dev server
            </div>
          </div>
        </div>
      )}

      {/* Preview iframe — loads directly, no SW needed */}
      {url && (
        <>
          {/* Tiny toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "#0f0f0f",
            }}
          >
            <button
              onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              title="Refresh"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                padding: "2px 4px",
              }}
            >
              ↺
            </button>
            <div
              style={{
                flex: 1,
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {url}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                padding: "2px 4px",
                textDecoration: "none",
              }}
            >
              ↗
            </a>
          </div>

          {/* The actual preview iframe */}
          <iframe
            ref={iframeRef}
            src={url}
            style={{
              flex: 1,
              width: "100%",
              border: "none",
            }}
            title="App Preview"
            onError={() => setIframeError(true)}
          />
        </>
      )}

      {/* No preview yet and not loading */}
      {!url && !loading && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
          }}
        >
          Preview will appear here after build completes
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
