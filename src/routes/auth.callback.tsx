import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: "Completing sign in… — Lampcode" }] }),
});

function AuthCallbackPage() {
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");

        if (errorParam) {
          window.location.href = "/login?error=auth_failed";
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            window.location.href = "/login?error=auth_failed";
            return;
          }
          window.location.href = "/dashboard";
          return;
        }

        // Implicit flow fallback (#access_token=...): detectSessionInUrl handles it.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/login?error=auth_failed";
        }
      } catch {
        window.location.href = "/login?error=auth_failed";
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Completing sign in…</div>
    </div>
  );
}