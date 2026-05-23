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
      detectSessionInUrl: isBrowser,
    },
  });
}

// On the server during SSR we don't have access to VITE_ env vars at runtime
// (they're build-time replaced). To avoid crashing SSR when they're missing,
// expose a lazy proxy that only constructs the client on first use in the browser.
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