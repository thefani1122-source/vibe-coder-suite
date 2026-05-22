import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://kkyzhykycqydcguqdxye.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";

const isBrowser = typeof window !== "undefined";

if (!SUPABASE_ANON_KEY && isBrowser) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_ANON_KEY is not set. Add it to .env locally and to Vercel → Project → Settings → Environment Variables.",
  );
}

function createSafeClient() {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY || "placeholder-anon-key", {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[supabase] Failed to initialize client:", err);
    // Return a stub so SSR never crashes. Real calls will no-op / reject gracefully.
    const stubError = new Error("Supabase is not configured");
    const stub = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: stubError }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signInWithPassword: async () => ({ data: null, error: stubError }),
        signUp: async () => ({ data: null, error: stubError }),
        signOut: async () => ({ error: null }),
        signInWithOAuth: async () => ({ data: null, error: stubError }),
      },
      from: () => ({
        select: async () => ({ data: null, error: stubError }),
      }),
    };
    return stub as unknown as ReturnType<typeof createClient>;
  }
}

export const supabase = createSafeClient();