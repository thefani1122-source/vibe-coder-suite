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

    const completeSignIn = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        // exchangeCodeForSession returns the session directly — use it instead of
        // a separate getSession() call, which can race against SIGNED_IN and resolve
        // with a stale null value after the session is already established.
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // Exchange failed (expired/used code, missing verifier, network error).
          // Fall back to getSession in case the session was established by another
          // path; otherwise onAuthStateChange + the timeout below handle it.
          const { data: sd } = await supabase.auth.getSession();
          if (sd.session) {
            useAuthStore.getState().setSession(sd.session);
            finish("/dashboard");
          }
          return;
        }
        if (data.session) {
          useAuthStore.getState().setSession(data.session);
          finish("/dashboard");
        }
        return;
      }

      // No code in URL — implicit-flow hash tokens or direct navigation.
      // onAuthStateChange SIGNED_IN will handle it; getSession() is a safety net.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        useAuthStore.getState().setSession(data.session);
        finish("/dashboard");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        useAuthStore.getState().setSession(session);
        finish("/dashboard");
      }
    });
    unsubscribe = () => subscription.unsubscribe();

    completeSignIn();

    const timeout = setTimeout(() => {
      finish("/login");
    }, 5000);

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
