/**
 * Frontend half of the conservative MCP query router.
 *
 * Keep aligned with backend src/agents/mcp-intent.ts. The API repeats this
 * guard independently. A positive result means "attempt a read-only service
 * query", never "allow a write". Ambiguous prompts remain on the build path.
 */
const READ_REQUEST = /\b(?:check|show|list|fetch|read|inspect|look(?:\s+up|\s+at)?|find|search|summari[sz]e|tell\s+me|what(?:\s+is|\s+are|['’]s|\s+happened|\s+did|\s+does)|how\s+many|which|when\s+(?:was|did|is)|where\s+is|give\s+me|display|review|what(?:'s|\s+are)\s+the\s+(?:latest|recent|current))\b/i;
const RECENCY_SIGNAL = /\b(?:recent|latest|newest|current|last|status|history|overview|summary|count|details|health|activity)\b/i;
const EXTERNAL_OBJECT = /\b(?:deployments?|projects?|domains?|environment\s+variables?|build\s+logs?|logs?|errors?|incidents?|issues?|pull\s+requests?|prs?|repositories|repos|branches|commits|workflows?|workflow\s+runs?|executions?|scenarios?|pages?|documents?|docs?|databases?|tables?|queries|products?|orders?|customers?|subscriptions?|payments?|billing|campaigns?|audiences?|emails?|messages?|sms|releases?|versions?|services?|zones?|workers?|buckets?|files?|design\s+files?|components?|events?|metrics|usage|transactions?|invoices?|refunds?|members?|users?|contacts?|records?)\b/i;
const MUTATION_REQUEST = /\b(?:create|write|edit|modify|change|update|delete|remove|destroy|publish|deploy|redeploy|rollback|restart|trigger|execute|send\s+(?:an?\s+)?(?:email|message|sms)|push|commit|merge|close|resolve|assign|refund|cancel|install|migrate|fix|repair|provision|add|rename|overwrite|launch|promote)\b/i;
const BUILD_OR_DEPLOY_ACTION = /^\s*(?:(?:could|can|would|will)\s+you\s+)?(?:(?:please|kindly)\s+)?(?:(?:I(?:'d| would| want to| need to)|we(?:'d| would| want to| need to))\s+)?(?:build|make|generate|implement|code|deploy|redeploy|publish)\b/i;
const WORKFLOW_ACTION = /\b(?:run|execute|trigger)\s+(?:the\s+)?(?:workflow|scenario|job|deployment|migration|campaign|message|query|build)\b/i;

export function isLikelyReadOnlyMcpQuery(prompt: string): boolean {
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 8_000) return false;
  const text = prompt.trim();
  if (MUTATION_REQUEST.test(text) || BUILD_OR_DEPLOY_ACTION.test(text) || WORKFLOW_ACTION.test(text)) return false;
  if (!(READ_REQUEST.test(text) || RECENCY_SIGNAL.test(text))) return false;
  if (!EXTERNAL_OBJECT.test(text)) return false;

  const explicitlyNamesService = /\b(?:vercel|github|gitlab|railway|netlify|cloudflare|sentry|notion|figma|linear|stripe|shopify|wordpress|framer|mailchimp|resend|twilio|sendgrid|mongodb|supabase|n8n|zapier|make(?:\.com)?|google\s+stitch|stitch)\b/i.test(text);
  if (/\b(?:source|project|workspace|typescript|javascript)\s+files?\b/i.test(text) && !explicitlyNamesService) return false;
  return true;
}
