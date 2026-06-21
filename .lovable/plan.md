# E2B Preview Blank — Exact Fix (TanStack + Next.js templates)

## Problem
Build sandbox me complete hoti hai, lekin iframe me blank white screen. Browser DevTools me iframe URL load hota hai par content empty.

## Root Cause (99% of "blank iframe" cases)
Build complete hone ka matlab **bun install / next build** complete hua. Lekin dev server ya to:
1. `127.0.0.1` pe bound hai (E2B ke bahar se unreachable) — port forward fail
2. `0.0.0.0` pe bound hai par **`allowedHosts` / `allowedDevOrigins` block** kar raha hai → silently empty response
3. HMR client `ws://localhost:PORT` try karta hai → console errors, app mount nahi hota
4. Backend `previewUrl` return karta hai **Vite/Next ready hone se pehle** → iframe pehli baar 502/empty load karta hai, retry nahi hota

---

## Fix #1 — TanStack Start Template (`vite.config.ts`)

`skeleton/vite.config.ts` me **ye exact 4 lines** chahiye:

```ts
import { defineConfig } from 'vite'
export default defineConfig({
  // ...plugins
  server: {
    host: '0.0.0.0',          // 1. bind all interfaces (CRITICAL)
    port: 5173,
    strictPort: true,
    allowedHosts: true,       // 2. Vite 5+ blocks unknown hosts → .e2b.app
    hmr: {
      clientPort: 443,        // 3. browser uses HTTPS, HMR must use wss:443
      protocol: 'wss',
    },
    watch: { usePolling: true, interval: 300 }, // 4. E2B FS events unreliable
  },
})
```

**Agar `allowedHosts: true` missing hai** → Vite "Blocked request. This host (xxx.e2b.app) is not allowed" return karta hai. Kabhi blank, kabhi text — depends on Vite version.

**Agar `host: '0.0.0.0'` missing hai** → E2B ka port forwarder 5173 pe kuch nahi paata → iframe timeout ya ERR_EMPTY_RESPONSE.

---

## Fix #2 — Next.js Template (`next.config.js` + start command)

Next.js 14/15 me ye chahiye:

```js
// next.config.js
module.exports = {
  // Next 15 — agar miss hua to dev me cross-origin requests block hote hain
  allowedDevOrigins: ['*.e2b.app', '*.e2b.dev'],
  
  // optional but recommended for iframe embedding
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'ALLOWALL' },
        // ya better: Content-Security-Policy frame-ancestors *
      ],
    }]
  },
}
```

`e2b.toml` me start command:
```toml
start_cmd = "cd /home/user/app && bun run dev -- --hostname 0.0.0.0 --port 3000"
```

**Note**: Next.js me flag `--hostname` hai (Vite me `--host`). Common mistake — galat flag pass karne se Next default `localhost` pe bind ho jata hai.

`package.json` me bhi confirm karein:
```json
"scripts": { "dev": "next dev --hostname 0.0.0.0 --port 3000" }
```

---

## Fix #3 — Backend `ensureSandbox` — Vite/Next ready wait

Backend `previewUrl` return karne se pehle HEAD check karein (ye line miss hone ki wajah se "build complete par blank" sabse zyada hota hai):

```ts
async function waitForReady(url: string, maxMs = 20_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
      if (r.ok || r.status === 304) return
    } catch {}
    await new Promise(r => setTimeout(r, 400))
  }
  throw new Error('Dev server did not become ready')
}

// ensureSandbox ke end me:
await waitForReady(`https://${PORT}-${sb.sandboxId}.e2b.app`, 20_000)
return { id: sb.sandboxId, previewUrl }
```

Bina ye wait ke, frontend iframe ko ekdam URL milta hai jab Vite/Next abhi compile bhi nahi hua → blank.

---

## Fix #4 — `sb.setTimeout()` chahiye (sandbox 5min me die ho rahi)

Har `Sandbox.create()` / `resume()` / `connect()` ke baad:
```ts
await sb.setTimeout(60 * 60 * 1000) // 1 hour
```

Agar miss hai → preview pehle 5 min kaam karta hai phir suddenly blank (sandbox killed).

---

## Diagnostic Steps (in order)

Agar fixes laga ke bhi blank hai, sandbox ke andar manually check karein:

```bash
# 1. Dev server actually listening hai?
curl -I http://localhost:5173        # (TanStack)
curl -I http://localhost:3000        # (Next.js)
# expect: HTTP/1.1 200 ya 304

# 2. 0.0.0.0 pe bound hai?
ss -tlnp | grep -E '5173|3000'
# expect: 0.0.0.0:5173 (NOT 127.0.0.1:5173)

# 3. Vite/Next ka actual log
tail -100 /tmp/vite.log
# ya
tail -100 /tmp/next.log
# look for: "Blocked request", syntax errors, port conflicts

# 4. E2B external URL se response
curl -I https://5173-${SANDBOX_ID}.e2b.app
```

In 4 commands ka output blank-iframe ka exact cause batayega.

---

## Tech Notes

- TanStack Start ke liye dev port **5173** (Vite default), Next.js ke liye **3000**
- E2B URL format: `https://{PORT}-{SANDBOX_ID}.e2b.app` — port URL ka first segment hota hai
- Browser HMR WebSocket: `wss://{PORT}-{SANDBOX_ID}.e2b.app` (port 443, not 5173) — yahi `hmr.clientPort: 443` ki wajah hai
- Next.js 15 ka `allowedDevOrigins` Next 14 me nahi hai — agar Next 14 use kar rahe hain to skip karein
- Agar repo public kar dein ya zaroori files (skeleton `vite.config.ts`, `next.config.js`, `e2b.toml`, backend `ensureSandbox`) paste kar dein, main exact line-by-line diff de dunga

---

## Next Action

Plan approve ke baad, agar aap repo public kar dete hain ya 4 files paste karte hain, main har template ka exact patch likh dunga. Abhi ke liye ye 4 fixes (host, allowedHosts/allowedDevOrigins, waitForReady, setTimeout) order me apply karein — 95% probability ek inhi me se fix kar dega.
