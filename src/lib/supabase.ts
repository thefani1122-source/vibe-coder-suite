// Supabase client — reads ONLY from Vercel-provided VITE_* env vars at build time.
// No fallbacks, no placeholders. If either var is missing, throws on first use.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isBrowser = typeof window !== "undefined";

function createRealClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing required environment variable: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set both in your Vercel project (Settings → Environment Variables → Production) and redeploy.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      // true: Supabase auto-processes both ?code= (PKCE) and #access_token= (implicit)
      // and fires SIGNED_IN on onAuthStateChange. The callback page relies on this
      // instead of calling exchangeCodeForSession manually (which would double-use the code).
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

// Lazy client: VITE_ env vars are replaced at build time, so on SSR (or if a
// build was made without them) we must not throw at module load. Construct
// the real client only on first use (in the browser).
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  _client = createRealClient();
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});