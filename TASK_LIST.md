# Lampcode — Systematic Build Task List

**Status:** Setup cleanup ✅ | Awaiting backend review  
**Generated:** 2026-06-10

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

## PHASE 1: Backend Review & Integration (PENDING)

**Deliverable:** Honest review of backend repo + integration contract assessment

### 1.1 Backend Code Review
- [ ] Review backend directory structure + architecture
- [ ] Document all API endpoints (`/api/build/*`, `/api/projects`, `/api/users/*`, etc.)
- [ ] Document Socket.IO events emitted (build:*, file_write, etc.)
- [ ] Check response shapes vs. frontend expectations
- [ ] Identify response-shape mismatches causing frontend defensive probing

### 1.2 Stabilize Backend-Frontend Contract
- [ ] Pin response shapes for all endpoints (document in `/backend_contract.md`)
- [ ] Remove hardcoded response-shape variants in frontend (replace `project.id ?? id ?? projectId` patterns)
- [ ] Remove `HARDCODED_PATTERNS` fragility — backend should emit clean event types
- [ ] Define fullstack detection clearly (document which file paths trigger E2B)

### 1.3 Environment & Secrets
- [ ] Verify backend env vars are documented
- [ ] Confirm `VITE_BACKEND_URL` and `VITE_WS_URL` are set on Vercel
- [ ] Verify Supabase RLS rules for `integrations` and `audit_log` tables

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

**Status:** 100% non-functional. No Stripe, no payment path.

**Options:**
- **(A) Implement real payments:** Wire Stripe, implement checkout, add card management. (Scope: Large)
- **(B) Remove pricing page:** Delete route, simplify to usage view only. (Scope: Small)
- **(C) Keep mock:** Clearly label as "mock pricing" for demo. (Scope: Tiny, but misleading)

**Recommendation:** Decide before implementing. If revenue path exists, do (A) + create `/backend_payment_integration.md`. If freemium only, do (B).

**Subtasks (if A):**
- [ ] Integrate Stripe API + webhook handling on backend
- [ ] Create checkout flow (upgrade to Pro, add credits)
- [ ] Implement card management page
- [ ] Handle billing data in `GET /api/users/me/billing` (ensure it includes Stripe customer/subscription state)

**Subtasks (if B):**
- [ ] Delete `src/routes/pricing.tsx`
- [ ] Delete pricing link from navigation
- [ ] Simplify billing page to credits-only

---

### 3.2 Build Modes (Plan & Editor)
**Files:** `src/routes/plan.$sessionId.tsx`, `src/components/PromptComposer.tsx`

**Plan Mode Status:** Stub page ("Interview coming soon"). Creates project but then dead-end.  
**Editor Mode Status:** Permanently disabled (`soon: true`).

**Options:**
- **(A) Implement Plan mode:** Real interview flow (multi-step prompt refinement) before build. (Scope: Large)
- **(A-alt) Implement Editor mode:** Let users edit generated code before build. (Scope: Medium)
- **(B) Remove both:** Keep Fast Mode as the only build path. (Scope: Small)

**Recommendation:** Talk to product. For MVP, (B) is cleanest. Plan/Editor need backend support.

**Subtasks (if A):**
- [ ] Design plan/interview flow (what questions?)
- [ ] Implement multi-step form on `/plan/$sessionId`
- [ ] Wire form submit to build kickoff
- [ ] Document backend expectations

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
│ PHASE 1: Backend Review (BLOCKING)      │ ← User must provide backend repo
├─────────────────────────────────────────┤
│ PHASE 0: Setup ✅ + PHASE 2: Core Fixes │ (can start in parallel)
├─────────────────────────────────────────┤
│ PHASE 3: Shell Features (DECISIONS)     │ ← Need product input (A/B/C for each)
├─────────────────────────────────────────┤
│ PHASE 4: Code Quality                   │ (after PHASE 2)
├─────────────────────────────────────────┤
│ PHASE 5: Testing (after PHASE 1 + 3)    │
├─────────────────────────────────────────┤
│ PHASE 6: Deploy (after all)             │
└─────────────────────────────────────────┘
```

---

## Summary: What You Need to Do

**Immediate:**
1. Backend repo link bhejo → main Phase 1 karunga
2. Decide for Phase 3 features (Pricing/Billing, Plan Mode, MCP, etc.) — A/B/C options above

**Then:**
- Main Phase 2 (preview + settings bugs) karunga
- Phase 4 (cleanup) karunga
- Phase 5 (testing) karunga
- Deploy on Vercel

---

## Notes for Backend Integration

When you provide the backend repo, note:
- Frontend expects `VITE_BACKEND_URL` (REST) + `VITE_WS_URL` (Socket.IO)
- Build job emits: `build:preview_url`, `build:complete`, `build:thinking`, `build:tool_call`, `file_write`, `build:error`
- File paths `src/server/`, `src/db/`, `src/lib/api.` trigger fullstack E2B preview
- Response shapes for billing/usage/settings must match frontend defensive probing (or frontend will fail silently)
