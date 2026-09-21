import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { WAITLIST_MODE } from "@/lib/waitlist";

const DISMISSED_KEY = "lampcode:waitlist-dismissed";

/**
 * First-visit waitlist prompt. Signing in is what joins the list, so this sends
 * people to the normal auth flow rather than collecting an email separately —
 * one source of truth, and they land already signed in when access opens.
 *
 * Dismissal is remembered so it doesn't reappear on every page view. It is not
 * a hard gate: the landing page stays readable, because someone arriving from a
 * launch post should be able to see what this is before being asked for
 * anything.
 */
export function WaitlistDialog() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!WAITLIST_MODE || loading || isAuthenticated) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // private mode / blocked storage — show it, it's only mildly annoying
    }
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
    return;
  }, [loading, isAuthenticated]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* ignore */ }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <h2 id="waitlist-title" className="text-center text-2xl font-bold tracking-tight text-foreground">
          Join the waitlist
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          Lampcode turns a sentence into a working app, with a live preview you
          can use straight away. We're opening access gradually — sign in to
          claim your spot and we'll email you the moment yours is ready.
        </p>

        <button
          onClick={() => {
            dismiss();
            void navigate({ to: "/login" });
          }}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Sign in to join
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground/70">
          Free to join. No card required.
        </p>
      </div>
    </div>
  );
}
