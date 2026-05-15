import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const tiers = [
  {
    name: "Free",
    price: "$0",
    desc: "For tinkering and learning the vibes.",
    features: ["50 credits / month", "Public projects", "Community support"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$20",
    desc: "For solo vibe coders shipping every weekend.",
    features: ["1,500 credits / month", "Private projects", "Custom domains", "Priority support"],
    cta: "Upgrade",
    highlight: true,
  },
  {
    name: "Team",
    price: "$60",
    desc: "Collaborate with your crew in real time.",
    features: ["5,000 credits / month", "Team workspaces", "SSO + roles", "Dedicated support"],
    cta: "Start trial",
    highlight: false,
  },
];

function PricingPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-6 py-12">
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Pricing</h1>
                <p className="mt-3 text-muted-foreground">Pick a plan that matches your build energy.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {tiers.map((t) => (
                  <div
                    key={t.name}
                    className={`relative flex flex-col rounded-2xl border bg-card/60 p-6 backdrop-blur ${
                      t.highlight
                        ? "border-primary/60 shadow-[var(--shadow-glow)]"
                        : "border-border"
                    }`}
                  >
                    {t.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{t.price}</span>
                      <span className="text-sm text-muted-foreground">/ mo</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
                    <ul className="mt-6 flex-1 space-y-2">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`mt-6 w-full ${
                        t.highlight
                          ? "bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90"
                          : ""
                      }`}
                      variant={t.highlight ? "default" : "secondary"}
                    >
                      {t.cta}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}