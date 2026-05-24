import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: "Completing sign in… — Lampcode" }] }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const finish = (to: "/dashboard" | "/login") => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      navigate({ to, replace: true });
    };

    // With detectSessionInUrl: true, Supabase automatically processes both:
    //   ?code=xxx        (PKCE flow) — internal exchangeCodeForSession
    //   #access_token=   (implicit flow) — internal setSession
    // Both paths fire SIGNED_IN on all onAuthStateChange listeners.
    // Do NOT call exchangeCodeForSession manually — PKCE codes are one-time use.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        useAuthStore.getState().setSession(session);
        finish("/dashboard");
      }
    });
    unsubscribe = () => subscription.unsubscribe();

    // Fallback chain: runs after a short delay to let Supabase's async
    // detectSessionInUrl processing fire SIGNED_IN first.
    const tryFallbacks = async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (settled) return;

      // Fallback 1: session may already be set if SIGNED_IN fired before listener registered.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        useAuthStore.getState().setSession(data.session);
        finish("/dashboard");
        return;
      }

      // Fallback 2: manual hash parsing for implicit-flow tokens auto-detection missed.
      const hash = window.location.hash.slice(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token) {
          const { data: sd } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? "",
          });
          if (sd.session) {
            useAuthStore.getState().setSession(sd.session);
            finish("/dashboard");
          }
        }
      }
    };

    tryFallbacks();

    const timeout = setTimeout(() => finish("/login"), 8000);

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Completing sign in…</div>
    </div>
  );
}
