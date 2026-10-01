import { useEffect, useRef, useState } from "react";
import { SandpackPreview } from "@/components/SandpackPreview";

interface E2BPreviewProps {
  url: string | null;
  loading: boolean;
  error?: string | null;
  isFullstack: boolean;
  files: Record<string, string>;
  device?: "desktop" | "mobile" | "tablet";
  /** Set when the sandbox has been reclaimed — the ordinary end of its life,
   *  not a failure, so it reads as an offer to restore rather than an error. */
  expired?: string | null;
  restoring?: boolean;
  onRestore?: () => void;
}

export function E2BPreview({
  url,
  loading,
  error,
  isFullstack,
  files,
  device = "desktop",
  expired = null,
  restoring = false,
  onRestore,
}: E2BPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setIframeError(false);
    setIframeLoaded(false);
  }, [url]);

  if (!isFullstack) {
    return (
      <SandpackPreview
        files={files}
        isBuilding={false}
        externalDevice={device}
        className="h-full w-full"
      />
    );
  }

  const showExpired = Boolean(expired) && !url && !restoring;
  const visibleError = showExpired
    ? null
    : error || (iframeError ? "Preview iframe could not load. Try opening it in a new tab." : null);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#080808",
        padding: 10,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: device === "mobile" ? 420 : device === "tablet" ? 768 : "none",
          overflow: "hidden",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#0c0c10",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {showExpired && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.78)" }}>
              {expired}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 340 }}>
              Your code is saved. Restoring starts a fresh sandbox and puts the project back
              exactly as you left it.
            </div>
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                style={{
                  marginTop: 4,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#0c0c10",
                  background: "rgba(255,255,255,0.92)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Restore preview
              </button>
            )}
          </div>
        )}

        {visibleError && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(248,113,113,0.9)" }}>
              Preview failed: {visibleError}
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "underline",
                }}
              >
                Open preview in a new tab
              </a>
            )}
          </div>
        )}

        {(loading || restoring || (url && !iframeLoaded)) && !visibleError && !showExpired && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              background: "#0c0c10",
              zIndex: 2,
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
                {restoring ? "Restoring preview..." : url ? "Loading preview..." : "Starting preview..."}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {restoring
                  ? "Starting a fresh sandbox and writing your saved files"
                  : url
                    ? "Fetching your app"
                    : "Installing dependencies and starting dev server"}
              </div>
            </div>
          </div>
        )}

        {url && !visibleError && (
          <iframe
            ref={iframeRef}
            src={url}
            title="App Preview"
            loading="eager"
            referrerPolicy="no-referrer"
            allow="accelerometer; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; microphone; payment"
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
              background: iframeLoaded ? "#fff" : "#0c0c10",
              opacity: iframeLoaded ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        )}

        {!url && !loading && !restoring && !visibleError && !showExpired && (
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
    </div>
  );
}
