import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kkyzhykycqydcguqdxye.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "missing-anon-key";

if (!import.meta.env.VITE_SUPABASE_ANON_KEY && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_ANON_KEY is not set. Add it to .env (and Vercel env vars).",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
  },
});