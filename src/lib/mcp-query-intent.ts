/**
 * Client-side prefilter for a dedicated read-only MCP query route.
 *
 * This is only an optimization/UX guard; the backend runs the authoritative
 * intent classifier and enforces a read-only tool allowlist.
 */
const READ_RE =
  /\b(check|show|list|fetch|get|find|search|inspect|review|read|view|summari[sz]e|explain|tell\s+me|what|which|how\s+many|recent|latest|last|current|status|health|history|overview)\b/i;

const SERVICE_DATA_RE =
  /\b(deployments?|build\s+logs?|deploy\s+logs?|domains?|projects?|services?|previews?|releases?|errors?|exceptions?|issues?|pull\s*requests?|prs?|commits?|branches?|repositories|repos?|workflows?|executions?|scenarios?|products?|orders?|customers?|audiences?|campaigns?|emails?|messages?|calls?|pages?|documents?|notes?|files?|components?|design\s+files?|analytics|usage|transactions?|subscriptions?|invoices?|environments?|databases?|collections?|records?|posts?|sites?|functions?|workers?|dns|alerts?|incidents?)\b/i;

export function mayBeMcpQuery(prompt: string): boolean {
  const text = typeof prompt === "string" ? prompt.trim() : "";
  return Boolean(text && READ_RE.test(text) && SERVICE_DATA_RE.test(text));
}
