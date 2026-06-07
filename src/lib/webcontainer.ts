import { WebContainer } from "@webcontainer/api"

// ─── Singleton boot ───────────────────────────────────────────────────────────
// WebContainer.boot() can only be called ONCE per page load — a second call
// throws. coep: 'credentialless' matches our Vercel COEP header so the hidden
// StackBlitz runtime generates `local-credentialless.webcontainer.io` server-
// ready URLs that load directly inline, instead of `*.webcontainer-api.io`
// gateway URLs that show a "Connect to Project" gate screen.

let instance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

export function bootWebContainer(): Promise<WebContainer> {
  if (instance) return Promise.resolve(instance)
  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" }).then(wc => {
      instance = wc
      return wc
    })
  }
  return bootPromise
}

export function getWebContainer(): WebContainer | null {
  return instance
}

// ─── Filesystem helpers ───────────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "")
}

export async function writeFileToWC(path: string, content: string): Promise<void> {
  const wc = await bootWebContainer()
  const normalPath = normalizePath(path)
  const parts = normalPath.split("/")
  if (parts.length > 1) {
    await wc.fs.mkdir(parts.slice(0, -1).join("/"), { recursive: true }).catch(() => {})
  }
  await wc.fs.writeFile(normalPath, content, { encoding: "utf-8" })
}

export async function removeFileFromWC(path: string): Promise<void> {
  const wc = await bootWebContainer()
  await wc.fs.rm(normalizePath(path)).catch(() => {})
}

// ─── Vite scaffolding ─────────────────────────────────────────────────────────
// Inject a minimal package.json / vite config / index.html / entry point when
// the AI didn't generate them — lets bare-component projects still boot.

export function ensureViteSetup(files: Record<string, string>): Record<string, string> {
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

// ─── Dev server orchestration ─────────────────────────────────────────────────
// Idempotent — npm install + npm run dev are spawned at most once per page
// lifetime (the WebContainer singleton can't be re-booted, so a second
// install/dev-server would collide with the first).

export type WCStage = 0 | 1 | 2

interface DevServerHandlers {
  onStage: (stage: WCStage) => void
  onLog: (line: string) => void
  onServerReady: (url: string) => void
}

let devServerPromise: Promise<void> | null = null

export function startDevServer(allFiles: Record<string, string>, handlers: DevServerHandlers): Promise<void> {
  if (devServerPromise) return devServerPromise

  devServerPromise = (async () => {
    const wc = await bootWebContainer()

    handlers.onStage(1)
    handlers.onLog("Preparing project files…")
    const prepared = ensureViteSetup(allFiles)
    await Promise.all(
      Object.entries(prepared).map(([path, content]) => writeFileToWC(path, content)),
    )
    handlers.onLog(`Synced ${Object.keys(prepared).length} files`)

    handlers.onLog("Running npm install…")
    const install = await wc.spawn("npm", ["install"])
    install.output.pipeTo(new WritableStream({ write: d => handlers.onLog(d.trimEnd()) }))
    const installCode = await install.exit
    if (installCode !== 0) throw new Error(`npm install exited with code ${installCode}`)

    handlers.onStage(2)
    handlers.onLog("Starting dev server…")
    const dev = await wc.spawn("npm", ["run", "dev"])
    dev.output.pipeTo(new WritableStream({ write: d => handlers.onLog(d.trimEnd()) }))

    wc.on("server-ready", (_port, url) => {
      handlers.onLog(`Server ready at ${url}`)
      handlers.onServerReady(url)
    })
  })()

  devServerPromise.catch(() => {
    devServerPromise = null // allow a retry to spawn a fresh attempt
  })

  return devServerPromise
}

export function resetDevServer(): void {
  devServerPromise = null
}
