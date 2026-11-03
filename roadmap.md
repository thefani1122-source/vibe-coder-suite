# MCP OAuth + provider parity — task list

Verified against each provider's live OAuth metadata on 2026-11-03 (RFC 9728
protected-resource + authorization-server metadata probes).

## Verified auth support (live)

| Provider | Official auth | Dynamic client registration (DCR) | Lampcode approach |
|---|---|---|---|
| Sentry | OAuth only | yes | MCP OAuth flow (existing) |
| Notion | OAuth 2.0 + PKCE | yes | MCP OAuth flow (existing) |
| Linear | OAuth 2.1 + API key | yes | OAuth via `oauth` flag; API-key connect stays |
| Vercel | OAuth only (MCP server rejects static tokens) | yes | switch to MCP OAuth flow |
| Cloudflare | OAuth (managed MCP servers) | yes | switch to MCP OAuth flow |
| Figma | OAuth, scope `mcp:connect` | yes (catalog clients) | MCP OAuth flow (existing) |
| GitHub | PAT **and** OAuth, but **no DCR** | no | keep PAT connect (official token path) |
| Stripe | Agent API key **and** OAuth, but **no DCR** | no | keep agent-key connect; update copy |
| Google Stitch | OAuth, no DCR/CIMD — needs pre-registered Google client | no | remove from store (honest "not available") |
| n8n / Make / Zapier | token / URL only | n/a | unchanged |

## Backend (thefani1122-source/Lampcode, `main` only)

- [ ] registry: `vercel` + `cloudflare` → `authType: "oauth"`, drop token fields
- [ ] registry: remove `google-stitch` (generic OAuth cannot complete without a pre-registered Google client)
- [ ] registry: Stripe help copy → Agent API key (full keys stop working Dec 2026)
- [ ] add `oauth?: boolean` provider flag; `oauth/start` gates on the flag (Linear OAuth enabled, token connect preserved)
- [ ] update/extend tests; typecheck + test run
- [ ] commit + push to `main` only (no `db-path`)

## Frontend (vibe-coder-suite, `main` only)

- [ ] Vercel + Cloudflare cards → `authMode: "oauth"` (Sign-in button, no token field)
- [ ] Google Stitch card → honest not-available state
- [ ] Stripe card copy → Agent API key
- [ ] parity check of every remaining card against the backend registry
- [ ] typecheck + build

## Security notes

- Callback stays one-use, expiring state-hash transaction (no session reuse).
- Tokens encrypted at rest; only non-secret meta returned to the browser.
- GitHub PAT / Stripe agent key never logged; Stripe full-key deprecation reflected in copy.
