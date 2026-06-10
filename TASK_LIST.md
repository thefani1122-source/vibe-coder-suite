# Lampcode — Systematic Build Task List

**Status:** Setup cleanup ✅ | Backend review ✅ (2026-06-10)  
**Generated:** 2026-06-10 | **Updated:** 2026-06-10 (post backend review)

> **Backend review done.** See `Lampcode/REVIEW_BACKEND_HONEST.md`.
> **Headline:** the backend is more complete than the frontend. Stripe billing and Plan
> mode are **fully built on the backend** — the frontend just doesn't call them. The real
> blockers are (a) a WebSocket event-contract mismatch that hangs failed/cancelled builds
> in the UI, (b) a handful of concrete backend bugs, and (c) frontend wiring.

---

## PHASE 0: Setup Cleanup ✅ DONE

- [x] Remove `package-lock.json` (npm lockfile residue)
- [x] Add `packageManager: "bun@1.x"` to `package.json`
- [x] Remove `@cloudflare/vite-plugin` from dependencies
- [x] Remove `.wrangler/`, `.dev.vars` from `.gitignore`
- [x] Clean stale `.vinxi` from ESLint ignores
- [x] Remove stale `COOP` header from `vercel.json`
- [x] Rename package name to `"lampcode"`
- [x] Update ESLint `ecmaVersion` 2020 → 2022
- [x] Add `globals.node` to ESLint config (SSR files)
- [x] Create `.env.example`

---

## PHASE 1: Backend Review & Integration ✅ REVIEW DONE

**Deliverable:** `Lampcode/REVIEW_BACKEND_HONEST.md` — full pipeline, API, WS, sandbox, plan, billing, auth.

### 1.1 Backend Code Review ✅
- [x] Reviewed backend structure + architecture (Hono + Socket.IO + E2B + Drizzle + Supabase + OpenRouter)
- [x] Documented API endpoints + Socket.IO events
- [x] Checked response shapes vs frontend expectations (see cross-check table in review)
- [x] Identified response-shape mismatches

### 1.2 🔴 CRITICAL — WebSocket event-contract mismatch (HIGH)
The frontend workspace listens for `build:error` and `build:cancelled`, but the backend's
terminal-failure path emits `build_failed` (underscore) and **never emits `build:cancelled`**.
Result: **failed and cancelled builds hang in the UI** with no terminal state.
- [ ] **Backend:** emit `build:error` on every terminal failure (validation, missing App.tsx, dispatch error, unsupported runtime), not just stream exceptions
- [ ] **Backend:** emit `build:cancelled` on cancel (currently sends `build_failed`)
- [ ] **Frontend:** also handle `build_failed` as a fallback terminal event (defensive)
- [ ] Decide on `build:token`/`build:prompt` — backend never emits them; either remove the listeners or add real token streaming (`stream-handler` already has the content)
- [ ] Remove unused underscore emits (`progress`/`phase_complete`/`file_update`/`agent_*`) once confirmed dead, OR start consuming them
- [ ] Document the canonical event contract in `Lampcode/BACKEND_CONTRACT.md`

### 1.3 🔴 Concrete backend bugs
- [ ] **`plan.ts:986`** writes `projects.status = "completed"` — not a valid `project_status` enum value → **Postgres rejects the write**. Use `"idle"`/`"archived"`.
- [ ] **Credit accounting** is dual/unreconciled: flat `deductCredits(20)` at request vs cost-based `buildSessions.creditsUsed` at completion (never added to `userBilling`). Pick one model.
- [ ] **Starter credits** disagree: schema/`PLAN_CREDITS.free`/`billing.ts` say **100**; `credits.ts`/`users.ts` say **500** (race-dependent which wins). Make every path agree.

### 1.4 🟡 Response-shape stabilization
- [ ] `GET /api/build/:sessionId/files` returns `{ totalFiles, groups }` (grouped by dir) but frontend hydrate wants a flat `{ files: {...} }` map — **fix one side**
- [ ] `POST /api/projects` returns `{ project: {id} }`; `last-session` returns `{ sessionId }` not `{ id }`; `billing` wraps in `{ billing }` — confirm frontend reads the wrapped/renamed fields, then remove `id ?? projectId ?? project_id` probing
- [ ] `GET /api/users/me/settings` is **preferences** (theme/notifications), NOT profile. **No `username`/`bio` columns exist** → those settings fields can never persist. Drop them or add columns + wire `PATCH /api/users/me` for name/image.
- [ ] Two usage endpoints (`/me/usage` vs `/me/billing/usage`) with different shapes — frontend uses `/me/usage`; consider removing the duplicate.

### 1.5 Dead / unwired subsystems
- [ ] **ContextManager** (`context/manager.ts`) — sophisticated relevance selector, but only reachable via `/api/context`; the build/plan dispatch never feeds its output into `contextFiles`. Wire it in or delete.
- [ ] `dispatcher.ts:244-245` hardcodes `reasoning:""`/`toolCalls:[]` — drops real stream data.
- [ ] Better-Auth `session`/`account`/`verification` tables are unused (Supabase owns sessions) — drop or document.

### 1.6 Model catalogue freshness (`model-gateway.ts`)
- [ ] Planning tier-1 uses `anthropic/claude-opus-4-6` — refresh to **Opus 4.8** (planning is highest-leverage; its contract propagates to all agents)
- [ ] Verify ALL OpenRouter slugs resolve (`deepseek-v4-pro/flash`, `kimi-k2.6`, `gemini-2.5-pro`, and Claude slug punctuation — OpenRouter has used dotted versions)

### 1.7 Environment & Secrets
- [ ] Confirm `VITE_BACKEND_URL` (REST + WS) is set on Vercel
- [ ] Verify Supabase RLS rules for `integrations` and `audit_log` tables
- [ ] Confirm WS auth middleware reads token from `handshake.auth.token` (frontend sends it there)

---

## PHASE 2: Core Features (Genuinely Real, Bug Fixes Only)

### 2.1 Preview Engine Fixes
**Files:** `src/components/SandpackPreview.tsx`, `src/components/E2BPreview.tsx`, `src/routes/workspace.$projectId.tsx`

- [ ] **Tailwind handling:** Detect `tailwind.config.js` in generated files + parse it (don't ignore)
- [ ] **CSS preprocessing:** Better stripping of `@tailwind/@layer/@apply` (handle indented usage)
- [ ] **E2B timeout:** Add 30s timeout + fallback to Sandpack if backend never emits `build:preview_url`
- [ ] **E2B error detection:** Remove dead `setIframeError` or implement it properly
- [ ] **Dead code cleanup:** Remove `!isFullstack` branch in `E2BPreview` (`:18-27`)
- [ ] **Debug overlay:** Either gate behind dev-only flag or remove (currently shipped to users)
- [ ] **Open-in-new-tab fix:** Verify iframe title matches (`"App Preview"` for Sandpack)
- [ ] **Console spam:** Remove `console.log` calls on every file write/complete

### 2.2 Settings & Profile Fixes
**Files:** `src/routes/settings.tsx`

- [ ] **Email field:** Either remove or send in PATCH (currently editable but discarded)
- [ ] **Notifications:** Persist all 6 toggles (currently 4 are local-only)
- [ ] **Password change:** Validate current password if needed by Supabase (document requirement)
- [ ] **Signup edge case:** Handle email confirmation requirement (currently signs up then tries to login immediately)

### 2.3 Projects & History Fixes
**Files:** `src/routes/projects.tsx`, `src/components/HistoryPanel.tsx`

- [ ] **Project thumbnails:** Either real previews or remove (currently hardcoded fake)
- [ ] **"Built" badge:** Align type + check (currently `"completed"` vs `"success"`)
- [ ] **History status icons:** Document which status strings backend sends (currently assumes `complete`/`error`/`running`)

---

## PHASE 3: Feature Shells — Decide & Implement

**Decision Required:** For each shell, either (A) implement real feature, (B) remove UI, or (C) keep as "coming soon" but gate differently.

### 3.1 Pricing / Billing (ZERO PAYMENT INTEGRATION)
**Files:** `src/routes/pricing.tsx`, `src/routes/billing.tsx`

**Status:** Frontend is 100% non-functional — BUT **the backend Stripe integration is already built**
(`billing.ts`: customers, checkout sessions, invoices, upgrade). This is now mostly a **frontend wiring job**.

**Revised scope: MEDIUM (frontend wiring), not Large.**

**Options:**
- **(A) Wire the existing backend:** point the "Buy"/"Upgrade" buttons at `POST /api/users/me/billing/upgrade` (returns `{ checkoutUrl }`), redirect to Stripe Checkout, read state from `GET /api/users/me/billing`. (Scope: Medium)
- **(B) Remove pricing page:** if no revenue path yet. (Scope: Small)

**Recommendation:** (A) — the hard part (Stripe REST, checkout, invoices) is done. Just needs `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PRO`/`STRIPE_PRICE_ENTERPRISE` env vars and frontend buttons.

**Subtasks (if A):**
- [ ] Wire pricing CTAs → `POST /api/users/me/billing/upgrade` { plan, successUrl, cancelUrl } → redirect to `checkoutUrl`
- [ ] Billing page: render `GET /api/users/me/billing` (plan, credits, period) + `GET /api/users/me/billing/invoices`
- [ ] Set Stripe env vars on backend (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`)
- [ ] Add a Stripe **webhook** handler to flip `userBilling.plan` on `checkout.session.completed` (check `webhooks.ts` — verify it exists/handles this)

**Subtasks (if B):**
- [ ] Delete `src/routes/pricing.tsx`
- [ ] Delete pricing link from navigation
- [ ] Simplify billing page to credits-only

---

### 3.2 Build Modes (Plan & Editor)
**Files:** `src/routes/plan.$sessionId.tsx`, `src/components/PromptComposer.tsx`

**Plan Mode Status:** Frontend `/plan/$sessionId` is a stub ("Interview coming soon") — BUT
**the backend plan pipeline is fully built** (`plan.ts`): interview-question generation →
contract + task breakdown → FOUNDATION→BUILD→VERIFY→DEPLOY with a verify→fix loop, per-phase
approval gates, freeze contracts, and brain versioning. **This is a frontend wiring job, not a build-from-scratch.**
**Editor Mode Status:** Permanently disabled (`soon: true`) — no backend; still a real decision.

**Revised scope for Plan mode: MEDIUM (frontend wiring), not Large.**

**Options:**
- **(A) Wire the existing backend plan flow:** (Scope: Medium)
- **(B) Remove plan mode UI** if you want Fast Mode only for MVP. (Scope: Small)
- Editor mode: keep removed (no backend).

**Recommendation:** (A) if plan mode is a product priority — the backend is done. Otherwise (B) and revisit later.

**Subtasks (if A) — map to existing backend endpoints:**
- [ ] `POST /api/plan/start` returns `{ sessionId, questions }` — render the interview form from `questions`
- [ ] Submit answers → `POST /api/plan/interview` → render returned `{ contract, tasks }`
- [ ] Approve → `POST /api/plan/approve { approved:true }` → poll `GET /api/plan/:sessionId/status`
- [ ] Per-phase approval → `POST /api/plan/:sessionId/phase/:phase/approve { approved:true }`
- [ ] Note: plan WS events use the **/interview namespace** + underscore events (`plan_phase_start`, `phase_complete`, `verify_result`, `fix_required`) — frontend must subscribe to these (same event-contract caveat as Phase 1.2)

**Subtasks (if B):**
- [ ] Remove Plan Mode: delete route, remove PromptComposer mode dropdown
- [ ] Remove Editor Mode: delete from PromptComposer
- [ ] Verify `POST /api/build/fast` is the only build endpoint

---

### 3.3 Import Features (URL, Figma)
**Files:** `src/components/PromptComposer.tsx`

**Status:** Both collect input but discard it (never send to backend).

**Options:**
- **(A) Implement both:** Backend processes URL/Figma design → code generation. (Scope: Large, requires backend)
- **(B) Remove both:** Keep prompt-only generation. (Scope: Small)

**Recommendation:** (B) for MVP. Figma especially requires Figma API + design parsing.

**Subtasks (if B):**
- [ ] Remove URL import UI (`:142-156`)
- [ ] Remove Figma button (`:176`)
- [ ] Simplify PromptComposer

---

### 3.4 MCP / Integrations (21 of 22 "coming soon")
**Files:** `src/routes/mcp.tsx`

**Status:** Only Supabase real. Other 21 are toast + custom MCP is no-op.

**Options:**
- **(A) Implement OAuth for real MCP providers:** GitHub, Vercel, etc. (Scope: Large, per provider)
- **(A-alt) Focus on 1-2 key providers:** E.g., GitHub + Vercel (Scope: Medium)
- **(B) Remove MCP page:** Delete for now, add later. (Scope: Small)
- **(C) Refactor Supabase integration:** Make it a template for others. (Scope: Medium)

**Recommendation:** (B) for MVP or (C) if you want to showcase extensibility. (A) is a lot of OAuth setup.

**Subtasks (if B):**
- [ ] Delete `src/routes/mcp.tsx`
- [ ] Remove MCP nav link

**Subtasks (if A-alt/C):**
- [ ] Implement GitHub OAuth integration (Supabase as template)
- [ ] Test GitHub API calls from frontend
- [ ] Document integration flow for next provider

**Security fix (regardless):**
- [ ] Remove service_role key collection from browser (`mcp.tsx:434-444`). Use backend to store credentials.

---

### 3.5 Workspace Top Bar Features
**Files:** `src/routes/workspace.$projectId.tsx` (`:878-900`)

**Status:** GitHub, Share, Publish, Deploy all toast.

**Options:**
- **(A) Implement all:** GitHub export, shareable links, Vercel deploy. (Scope: Very large)
- **(B) Remove all:** Keep just code viewer. (Scope: Small)
- **(C) Implement just 1:** E.g., GitHub push. (Scope: Medium)

**Recommendation:** (B) for MVP. These are polish features.

**Subtasks (if B):**
- [ ] Delete GitHub button (`:878`)
- [ ] Delete Share button (`:887`)
- [ ] Delete Publish / Deploy button (`:893`)
- [ ] Delete Docs tab (`:824`) or make it real

---

### 3.6 Minor UI Shell Fixes
- [ ] **Project dropdown:** Implement or remove (`:785`)
- [ ] **Forgot password:** Either implement `resetPasswordForEmail` or remove (`:301-303`)
- [ ] **"Keep me signed in" checkbox:** Either implement or remove (`:296-300`)
- [ ] **Integrations connect buttons:** Remove or implement (`:313-321`)

---

## PHASE 4: Code Quality & Security

### 4.1 Auth & Session
- [ ] Remove stale "Better Auth" comments from `src/lib/api.ts` + `src/lib/websocket.ts`
- [ ] Document actual auth model (Supabase JWT Bearer)
- [ ] Verify 401 handling doesn't break user experience (hard redirect is jarring)

### 4.2 API Contract & Backend Coupling
- [ ] Create `/backend_contract.md` listing all endpoints + expected response shapes
- [ ] Consolidate response-shape probing (remove `?? id ?? projectId` patterns once backend stabilized)
- [ ] Document Socket.IO event contract

### 4.3 Supabase RLS & Security
- [ ] Audit `integrations` table RLS (ensure users can't read others' rows)
- [ ] Audit `audit_log` table RLS
- [ ] Document why direct Supabase reads are safe vs. going through backend

### 4.4 Error Handling
- [ ] Verify SSR error captures in `src/lib/error-capture.ts` + `src/server.ts` are working
- [ ] Test 500-error recovery path
- [ ] Ensure no stack traces leak to users

### 4.5 TypeScript & Linting
- [ ] Run `npx tsc --noEmit` + verify no errors (currently had warning about `vite/client`)
- [ ] Run `npm run lint` + fix any issues
- [ ] Add strict mode gradually if not already on

---

## PHASE 5: Backend Integration & Testing

### 5.1 API Integration Tests
- [ ] Verify `POST /api/projects` creates a project + returns correct shape
- [ ] Verify `POST /api/build/fast` starts a build + returns sessionId
- [ ] Verify Socket.IO events arrive in correct order + format
- [ ] Test session reconnect after network loss

### 5.2 Preview Verification
- [ ] Test Sandpack with a real generated app (React + Tailwind)
- [ ] Test E2B fullstack detection (backend files → E2B iframe)
- [ ] Test fallback: E2B timeout → error message
- [ ] Test error states (CSS error, missing module, etc.)

### 5.3 Auth Flow Testing
- [ ] Test email + password signup + login
- [ ] Test Google/GitHub OAuth login
- [ ] Test 2FA enroll + verify
- [ ] Test session persistence across reload
- [ ] Test logout + redirect to login

### 5.4 End-to-End
- [ ] Prompt → AI streams code → preview renders correctly
- [ ] Edit prompt → new build preserves session state
- [ ] Long session (1hr+) → verify no memory leaks or socket issues

---

## PHASE 6: Deployment & Performance

### 6.1 Vercel Setup
- [ ] Confirm `VITE_SUPABASE_*` env vars are set in Vercel project settings
- [ ] Confirm `VITE_BACKEND_URL` + `VITE_WS_URL` are set
- [ ] Verify build succeeds: `npm run build` (will use `bun.lock` now that `package-lock.json` is gone)
- [ ] Test Vercel preview deploy

### 6.2 Frontend Performance
- [ ] Check bundle size: `npm run build` output
- [ ] Audit slowest routes (workspace likely heavy with preview)
- [ ] Ensure Supabase client is lazy-loaded (doesn't block SSR)

### 6.3 Monitoring
- [ ] Set up error tracking (Sentry, Rollbar, etc.) to catch production issues
- [ ] Log key events (build start, preview error, etc.) for debugging
- [ ] Monitor API latency + socket disconnects

---

## Dependencies & Decision Gates

```
┌─────────────────────────────────────────┐
│ PHASE 1: Backend Review ✅ DONE         │
├─────────────────────────────────────────┤
│ 🔴 NEW BLOCKER → Phase 1.2 WS events    │ ← failed/cancelled builds hang the UI
│    + Phase 1.3 backend bugs (enum write)│
├─────────────────────────────────────────┤
│ PHASE 0: Setup ✅ + PHASE 2: Core Fixes │ (can start in parallel)
├─────────────────────────────────────────┤
│ PHASE 3: Shells — Stripe + Plan now     │ ← backend READY, frontend wiring only
│          MEDIUM scope (were Large)      │
├─────────────────────────────────────────┤
│ PHASE 4: Code Quality                   │ (after PHASE 2)
├─────────────────────────────────────────┤
│ PHASE 5: Testing (after 1.2/1.3 fixed)  │
├─────────────────────────────────────────┤
│ PHASE 6: Deploy (after all)             │
└─────────────────────────────────────────┘
```

---

## Summary: What You Need to Do

**Immediate (highest impact, fixes broken UX):**
1. **Phase 1.2** — fix WS terminal-failure + cancel events (`build:error`/`build:cancelled`). Without this, every failed or cancelled build hangs in the UI.
2. **Phase 1.3** — fix the `plan.ts:986` invalid-enum write + reconcile credit accounting.

**Then decide (scope dropped — backend is ready):**
3. Phase 3.1 Stripe — wire frontend buttons to the existing `/billing/upgrade` (MEDIUM)
4. Phase 3.2 Plan mode — wire frontend to the existing `/api/plan/*` flow (MEDIUM), or remove for MVP
5. Remaining Phase 3 shells (MCP, import, top-bar) — A/B/C decisions as before

**Then:**
- Phase 2 (preview + settings bugs), Phase 4 (cleanup), Phase 5 (testing), Phase 6 (deploy)

> Full backend findings + file:line references: `Lampcode/REVIEW_BACKEND_HONEST.md`

---

## Notes for Backend Integration

When you provide the backend repo, note:
- Frontend expects `VITE_BACKEND_URL` (REST) + `VITE_WS_URL` (Socket.IO)
- Build job emits: `build:preview_url`, `build:complete`, `build:thinking`, `build:tool_call`, `file_write`, `build:error`
- File paths `src/server/`, `src/db/`, `src/lib/api.` trigger fullstack E2B preview
- Response shapes for billing/usage/settings must match frontend defensive probing (or frontend will fail silently)
