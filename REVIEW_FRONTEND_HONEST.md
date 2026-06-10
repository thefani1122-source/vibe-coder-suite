# Lampcode Frontend — Honest End-to-End Review

**Date:** 2026-06-10  
**Reviewer:** Claude Code (Haiku 4.5)  
**Scope:** vibe-coder-suite frontend repo — complete architecture, all subsystems

---

## Executive Summary

**Core product (prompt → AI → preview) is REAL and WORKS WELL.** Auth is production-grade. The "messiness" is in two places:
1. **Setup/plumbing** — conflicting lockfiles, dead Cloudflare code, beta Nitro, template cruft
2. **UI shells** — many features look finished but are non-functional (pricing, billing, payments, MCP, plan mode, editor mode, etc.)

**Action items are straightforward:** setup cleanup, then systematically replace shells with real features or remove them.

---

## ✅ What's Real & Working

### Core Build Engine
- **Fast Mode:** Prompt → REST kickoff → Socket.IO streams thinking + code incrementally
- **File streaming:** Files merged without overwrite, sessionStorage survives reloads
- **Frontend preview:** Sandpack bundler works for most generated apps
- **Fullstack detection:** Backend file heuristic (`src/server/*`, `src/db/*`, etc.) switches to E2B iframe
- Files: `src/lib/websocket.ts`, `src/routes/workspace.$projectId.tsx:173-372`, `src/components/SandpackPreview.tsx`

### Auth System
- **Supabase PKCE OAuth + email/password** — solid, well-engineered
- **Session persistence, OAuth callback** — careful design with fallbacks
- **2FA TOTP** — complete (QR, enroll, verify, disable)
- **Password change** — real
- Files: `src/lib/auth.tsx`, `src/lib/supabase.ts`, `src/routes/login.tsx`, `src/routes/auth.callback.tsx`

### Project Management
- Create, list, delete projects — real REST calls + React Query
- Files: `src/routes/projects.tsx`, `src/components/PromptComposer.tsx`

### Workspace UI
- File tree, code viewer, copy, download codebase as `.txt`, session history
- Socket lifecycle, reconnect on visibility
- Files: `src/components/FileTree.tsx`, `src/components/HistoryPanel.tsx`, `src/routes/workspace.$projectId.tsx`

### Server-Side Rendering
- **Error normalization** in `src/server.ts` — handles h3's swallowed 500s, captures uncaught errors, branded error pages
- This is genuinely well-built defensive code

### File: Core Architecture
- **Routing:** TanStack Router file-based, SSR via Nitro (vercel preset)
- **API layer:** Clean fetch wrapper with Supabase JWT injection, 401→signout, toast on error
- **Stack:** Vite 7 + React 19 + Tailwind 4 + TanStack Start, deployed on Vercel

---

## ❌ What's Shell / Broken / Non-Functional

### Payments (Zero Implementation)
- **Pricing page** — 100% hardcoded mock. "Buy" buttons fire toast only (`pricing.tsx:116`). Plan CTAs have no `onClick`.
- **Billing page** — read-only display. "Add card" and "Manage" buttons are inert (`billing.tsx:98-101`).
- **No Stripe integration anywhere** in the codebase.
- **Files:** `src/routes/pricing.tsx`, `src/routes/billing.tsx`

### Build Modes
- **Plan Mode** — creates project + backend job, then routes to `/plan/$sessionId` stub page that says "Interview coming soon" (`src/routes/plan.$sessionId.tsx:22`)
- **Editor Mode** — permanently disabled (`PromptComposer.tsx:35`)

### Feature Import
- **URL import** — collects URL, never sends it (`PromptComposer.tsx:142-156`)
- **Figma import** — toast only (`PromptComposer.tsx:176`)

### MCP / Integrations
- **21 of 22 MCP providers** — toast "coming soon" (`mcp.tsx:363`)
- **Supabase only real provider** — connects but doesn't test the credentials
- **Custom MCP** — validates name/URL, then no-op, never persists (`mcp.tsx:181-189`)
- ⚠️ **Security concern:** Supabase service_role key collected in browser + stored via client SDK (`mcp.tsx:434-444`), not validated

### Workspace Top Bar
- **GitHub, Share, Publish, Deploy** — all toast only
- **Project name dropdown** — no handler
- **Docs tab** — marked `active={false}`, `onClick={}` (no-op)

### Project Display
- **Thumbnails** — hardcoded gradient + literal "lampcode.dev" text
- **"Built" badge** — type/check mismatch (`"completed"` vs `"success"`)

### Settings
- **Forgot password** — `preventDefault`, no logic (`login.tsx:301-303`)
- **"Keep me signed in" checkbox** — non-functional
- **Notifications:** 4 of 6 toggles are local-only, don't persist
- **Integrations:** Can disconnect but never connect anything
- **Profile email field** — editable but never sent in PATCH

### Preview Engine Issues
- **Tailwind + CSS:** Config ignored, CDN Tailwind lossy, regex strips directives poorly (`SandpackPreview.tsx:288-327`)
- **E2B fullstack:** No timeout, no client-side failure detection if backend never emits `build:preview_url`
- **Dead code:** `E2BPreview.tsx` has unused `setIframeError` (`E2BPreview.tsx:15`/`:168`), dead `!isFullstack` branch (`:18-27`)
- **Open-in-new-tab broken:** Title mismatch on iframe selector (`workspace.$projectId.tsx:863`)
- **Files:** `src/components/SandpackPreview.tsx`, `src/components/E2BPreview.tsx`, `src/routes/workspace.$projectId.tsx:653-669` (debug overlay)

### Other
- **Debug overlay shipped to users** — a black fixed panel showing mode/file count (`workspace.$projectId.tsx:653-669`)
- **Console spam in production** — `console.log` on every file write, build complete

---

## 🔴 Setup / Plumbing Issues

### Blocker: Two Lockfiles
- `bun.lock` (Jun 5, 230 KB) — original
- `package-lock.json` (Jun 10, 252 KB) — npm install happened 5 days later
- `bunfig.toml` indicates Bun is intended
- **Impact:** Non-deterministic installs on Vercel. One lockfile will be ignored.
- **Fix:** Delete `package-lock.json`, commit only `bun.lock`, add `packageManager: "bun@1.x"` to `package.json`

### Dead Cloudflare Path
- `@cloudflare/vite-plugin@^1.25.5` — dependency exists but `vite.config.ts:11` sets `cloudflare: false`
- `.gitignore:22-24` ignores `.wrangler/`, `.dev.vars` (Wrangler is Cloudflare CLI)
- `eslint.config.js:9` ignores `.vinxi` (old TanStack Start bundler, replaced by Nitro)
- **Impact:** Confusing, unused dependency, stale ignores
- **Fix:** Remove `@cloudflare/vite-plugin` from `package.json`, clean ignores

### Beta Nitro
- `nitro@3.0.260429-beta` — pre-release powering Vercel builds
- **Impact:** Fragile, could break on next version
- **Fix:** Lock to stable release once available, or accept the risk

### Stale Vercel Header
- `vercel.json:6-10` sets `Cross-Origin-Opener-Policy: same-origin` for WebContainer compatibility
- WebContainer was replaced by E2B (`ca066a8`), so this header is now pointless
- **Impact:** No functional impact (E2B works without it), but could interfere with popup OAuth
- **Fix:** Remove it

### Template Cruft
- `package.json:2` name is `"tanstack_start_ts"` (template name)
- `.lovable/project.json:3` also references template
- ESLint `ecmaVersion: 2020` vs TypeScript target `ES2022`
- ESLint runs on server files (node) but only has browser globals
- **Impact:** Cosmetic/misleading for maintainers
- **Fix:** Rename to `"lampcode"`, update ESLint config

### Missing Env Documentation
- No `.env.example` file
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`, optional `VITE_WS_URL`
- **Fix:** Create `.env.example` with these vars

---

## API Contract (Backend Dependencies)

These endpoints are called by frontend, must exist on backend:

| Method | Path | Endpoint | Notes |
|---|---|---|---|
| POST | `/api/projects` | create | returns `{id, ...}` |
| GET | `/api/projects` | list | returns `{projects: [...]}` or `[...]` |
| DELETE | `/api/projects/:id` | delete | - |
| POST | `/api/build/fast` | start build | returns `{sessionId, ...}` |
| POST | `/api/plan/start` | start plan | returns `{sessionId, ...}` |
| GET | `/api/build/:projectId/sessions` | history | returns `{sessions: [...]}` or `[...]` |
| GET | `/api/build/:projectId/last-session` | latest | returns `{id, ...}` or session object |
| GET | `/api/build/:sessionId/files` | hydrate | returns `{files: {...}}` |
| GET | `/api/users/me/billing` | billing | returns `{plan, creditsUsed, ...}` |
| GET | `/api/users/me/usage` | usage | returns `{usage: {...}}` or flat shape |
| GET/PATCH | `/api/users/me/settings` | settings | returns/updates `{name, username, bio, ...}` |

**Socket.IO events:** `build:backend_ready`, `build:preview_loading`, `build:preview_url`, `build:preview_error`, `build:warning`, `build:complete`, `build:thinking`, `build:tool_call`, `build:tool_result`, `file_write`, `build:error`, `build:cancelled`, `start-build`

---

## Backend-Frontend Fragility Points

1. **Response shape unstable** — frontend probes 3-4 variants for every API response (e.g. `project.id ?? id ?? projectId ?? project_id`)
2. **`HARDCODED_PATTERNS` regex** (`workspace.$projectId.tsx:74-83`) — manually synced with backend `stream-handler.ts`, marked `TODO(backend): FRAGILE`
3. **Fullstack heuristic** — only matches `src/server/`, `src/db/`, `src/lib/api.` paths; other paths silently downgrade to Sandpack (fails if backend needed)
4. **MCP doesn't talk to REST backend** — reads/writes directly to Supabase `integrations` table; if table doesn't exist, MCP page breaks silently

---

## Code Quality Notes

- **Preview Tailwind handling is lossy** — config ignored, directives partially stripped, CSS-in-JS often doesn't work
- **Race condition risk:** `isFullstack` set by 3 independent paths (`build:backend_ready`, `build:complete` heuristic, sessionStorage restore)
- **No iframe sandbox attribute** on E2B iframe — loads arbitrary backend URL with full privileges
- **Auth comments are stale** — mention "Better Auth" + cookies, but code uses Supabase Bearer tokens
- **Two competing backends:** Supabase direct reads (integrations, audit_log) vs REST (settings, usage). Inconsistent.
- **RLS security depends entirely on Supabase table setup** — cannot be verified from frontend code

---

## Files by Subsystem

**Preview/Sandbox:** `src/components/SandpackPreview.tsx`, `src/components/E2BPreview.tsx`, `src/lib/websocket.ts`, `src/routes/workspace.$projectId.tsx:653-669` (debug overlay)

**Auth/Supabase:** `src/lib/auth.tsx`, `src/lib/supabase.ts`, `src/components/RequireAuth.tsx`, `src/routes/login.tsx`, `src/routes/auth.callback.tsx`

**Billing/Pricing:** `src/routes/billing.tsx`, `src/routes/pricing.tsx`, `src/routes/usage.tsx`

**Chat/Workspace:** `src/routes/workspace.$projectId.tsx`, `src/components/ChatPanel.tsx`, `src/components/PromptComposer.tsx`, `src/lib/api.ts`

**Projects/History/MCP:** `src/routes/projects.tsx`, `src/components/HistoryPanel.tsx`, `src/routes/mcp.tsx`

**Settings:** `src/routes/settings.tsx`

**Architecture/Server:** `src/server.ts`, `src/start.ts`, `src/lib/error-capture.ts`, `vite.config.ts`, `vercel.json`, `tsconfig.json`, `package.json`

---

## Summary: What Needs Doing

**Setup (do first, safe, no feature impact):**
1. Remove package-lock.json
2. Add `packageManager: "bun@1.x"` to package.json
3. Remove `@cloudflare/vite-plugin` from package.json
4. Clean .gitignore (.wrangler, .dev.vars, .vinxi)
5. Remove COOP header from vercel.json
6. Rename package.json name to "lampcode"
7. Create .env.example
8. Update ESLint config

**Systematically fix:**
- [ ] Review backend (user will provide repo link)
- [ ] API contract stabilization (define response shapes)
- [ ] Preview Tailwind + CSS (detect config, handle better)
- [ ] Replace pricing/billing shells with real Stripe or remove
- [ ] Replace plan/editor/mcp shells with real features or remove
- [ ] Settings form validation + field persistence
- [ ] Remove debug overlay or gate behind dev flag
- [ ] Document the build socket events contract
