import { Component, useState, useMemo, type ReactNode } from "react"
import {
  SandpackProvider,
  SandpackPreview as SP,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { cn } from "@/lib/utils"
import { PREVIEW_UI_PRIMITIVES } from "@/lib/preview-ui-primitives"

// Dependencies expected by Lampcode-generated React apps. Sandpack previously
// discarded the generated package.json and installed only React, so ordinary
// generated imports (lucide-react, TanStack Query, etc.) crashed at preview time.
const PREVIEW_DEPENDENCIES: Record<string, string> = {
  "lucide-react": "^0.575.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.5.0",
  "class-variance-authority": "^0.7.1",
  "@tanstack/react-query": "^5.100.1",
  "react-router-dom": "^6.28.0",
  "framer-motion": "^12.38.0",
  "recharts": "^2.15.4",
  "date-fns": "^4.1.0",
  "zod": "^3.25.76",
  "react-hook-form": "^7.73.1",
  "@hookform/resolvers": "^5.2.2",
  "sonner": "^2.0.7",
  "cmdk": "^1.1.1",
  "vaul": "^1.1.2",
  "embla-carousel-react": "^8.6.0",
  "react-day-picker": "^9.14.0",
  "input-otp": "^1.4.2",
  "@radix-ui/react-accordion": "^1.2.12",
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.2.1",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-popover": "^1.1.12",
  "@radix-ui/react-progress": "^1.1.8",
  "@radix-ui/react-radio-group": "^1.2.3",
  "@radix-ui/react-scroll-area": "^1.2.10",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-slider": "^1.3.6",
  "@radix-ui/react-slot": "^1.2.4",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.2.15",
  "@radix-ui/react-tooltip": "^1.2.8",
};

function resolvePreviewDependencies(packageJson?: string) {
  let declared: Record<string, string> = {};
  try {
    const parsed = packageJson ? JSON.parse(packageJson) as { dependencies?: Record<string, string> } : null;
    declared = parsed?.dependencies ?? {};
  } catch {
    // Ignore an incomplete package.json while the build is streaming.
  }
  const dependencies: Record<string, string> = {};
  for (const [name, fallback] of Object.entries(PREVIEW_DEPENDENCIES)) {
    if (name in declared) dependencies[name] = declared[name]!;
    else if (name !== "react" && name !== "react-dom") dependencies[name] = fallback;
  }
  // Also pass through any additional browser-compatible dependencies declared in package.json
  for (const [name, version] of Object.entries(declared)) {
    if (
      !dependencies[name] &&
      !name.startsWith("@types/") &&
      name !== "tailwindcss" &&
      name !== "postcss" &&
      name !== "autoprefixer"
    ) {
      dependencies[name] = version;
    }
  }
  dependencies.react = "^18.2.0";
  dependencies["react-dom"] = "^18.2.0";
  return dependencies;
}

function preparePreviewCss(css: string): string {
  // The preview injects Tailwind from its CDN, not PostCSS. Remove build-only
  // directives while retaining declarations inside @layer blocks; deleting the
  // whole opening @layer line used to leave unmatched braces and blank the page.
  let output = css
    .replace(/^\s*@tailwind\b[^;]*;\s*$/gm, "")
    .replace(/^\s*@import\s+["']tailwindcss["']\s*;\s*$/gm, "")
    .replace(/@apply\s+[^;]+;/g, "")

  const layerStart = /@layer\s+[^;{]+\{/g
  let match: RegExpExecArray | null
  while ((match = layerStart.exec(output))) {
    const open = match.index + match[0].lastIndexOf("{")
    let depth = 1
    let close = open + 1
    while (close < output.length && depth > 0) {
      if (output[close] === "{") depth++
      else if (output[close] === "}") depth--
      close++
    }
    if (depth !== 0) {
      output = output.slice(0, match.index) + output.slice(open + 1)
      break
    }
    output = output.slice(0, match.index) + output.slice(open + 1, close - 1) + output.slice(close)
    layerStart.lastIndex = 0
  }
  return output.trim()
}

function rewriteSourceAliases(filePath: string, code: string): string {
  const fileDir = filePath.slice(0, filePath.lastIndexOf("/"));
  return code.replace(/(["'`])@\/([^"'`]+)\1/g, (_match, quote: string, aliasPath: string) => {
    const target = `/src/${aliasPath}`;
    const from = fileDir.split("/").filter(Boolean);
    const to = target.split("/").filter(Boolean);
    while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
    const relative = [...from.map(() => ".."), ...to].join("/");
    return `${quote}./${relative}${quote}`.replace("./../", "../");
  });
}

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
  dependencies,
}: {
  files: Record<string, { code: string }>
  entryFile: string
  className?: string
  externalDevice?: "desktop" | "mobile" | "tablet"
  dependencies: Record<string, string>
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
                dependencies,
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
      ".env", ".env.example", ".env.local",
      ".gitignore", ".eslintrc.js", ".eslintrc.json",
    ])

    const result: Record<string, { code: string }> = {}
    for (const [rawPath, content] of Object.entries(files)) {
      const basename = rawPath.split("/").pop() ?? ""
      if (SKIP.has(basename)) continue
      if (basename === "package.json") continue

      const normalized = "/" + rawPath.replace(/^\/+/, "")
      const cleanPath =
        !normalized.startsWith("/src/") &&
        !normalized.startsWith("/public/") &&
        /\.(tsx?|jsx?|css|svg)$/.test(normalized)
          ? "/src" + normalized
          : normalized

      const code = cleanPath.endsWith(".css") ? preparePreviewCss(content) : content

      result[cleanPath] = { code: rewriteSourceAliases(cleanPath, code) }
    }

    // Auto-inject a minimal src/lib/utils.ts if missing so cn() imports never crash
    if (!result["/src/lib/utils.ts"] && !result["/src/lib/utils.tsx"]) {
      result["/src/lib/utils.ts"] = {
        code: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
      };
    }

    // The server-side E2B scaffold bakes these components into its image, but
    // Sandpack receives only generated files. Mirror the scaffold here so both
    // preview modes can safely resolve the same shadcn-style imports.
    for (const [relativePath, code] of Object.entries(PREVIEW_UI_PRIMITIVES)) {
      const path = "/src/" + relativePath
      if (!result[path]) {
        result[path] = { code: rewriteSourceAliases(path, code) }
      }
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
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            background: "var(--background)", foreground: "var(--foreground)",
            card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
            popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
            primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
            secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
            muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
            accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
            destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
            border: "var(--border)", input: "var(--input)", ring: "var(--ring)"
          },
          borderRadius: {
            lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)"
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: #f8f9fc; --foreground: #202432; --card: #fff; --card-foreground: #202432;
      --popover: #fff; --popover-foreground: #202432; --primary: #5b5bd6; --primary-foreground: #fff;
      --secondary: #eff0f5; --secondary-foreground: #303548; --muted: #eff0f5; --muted-foreground: #70778b;
      --accent: #ececff; --accent-foreground: #4343b2; --destructive: #dc3545; --destructive-foreground: #fff;
      --border: #e2e4ec; --input: #e2e4ec; --ring: #5b5bd6; --radius: .625rem;
    }
    .dark {
      --background: #1c202b; --foreground: #f5f6fa; --card: #252a38; --card-foreground: #f5f6fa;
      --popover: #252a38; --popover-foreground: #f5f6fa; --primary: #8888f0; --primary-foreground: #171923;
      --secondary: #303647; --secondary-foreground: #f5f6fa; --muted: #303647; --muted-foreground: #a6adc0;
      --accent: #353653; --accent-foreground: #e0e0ff; --destructive: #e35d6a; --destructive-foreground: #fff;
      --border: #3b4151; --input: #3b4151; --ring: #8888f0;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: var(--background); color: var(--foreground); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    button, input, textarea, select { font: inherit; }
  </style>
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
      <div className={cn("flex flex-col h-full bg-[#080808] p-6", className)}>
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c10]">
          {isBuilding && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.02] animate-pulse" />
          )}
          <div className="relative flex flex-col items-center gap-3">
            {isBuilding ? (
              <>
                <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
                <p className="text-xs text-white/45">Preview will appear when build completes…</p>
              </>
            ) : (
              <p className="text-xs text-white/40">No preview yet</p>
            )}
          </div>
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
      dependencies={resolvePreviewDependencies(files["package.json"] ?? files["/package.json"])}
    />
  )
}
