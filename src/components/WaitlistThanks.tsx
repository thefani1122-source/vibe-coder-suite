import { Link } from "@tanstack/react-router";
import { Check, Mail } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";

/**
 * What a signed-in user sees while the waitlist is up. Shown in place of the
 * product, not alongside it — there is nothing else to reach yet.
 */
export function WaitlistThanks() {
  const { user, signOut } = useAuth();
  const email = user?.email;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          You're on the list
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Thanks for signing up. Lampcode isn't open to everyone yet — we're
          finishing the last pieces and letting people in gradually so the first
          build you run actually works.
        </p>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          We'll email you as soon as your access is ready. You don't need to do
          anything else.
        </p>

        {email && (
          <div className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">We'll write to {email}</span>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/docs" className="text-muted-foreground transition hover:text-foreground">
            What you'll be able to build
          </Link>
          <button
            onClick={() => void signOut()}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
