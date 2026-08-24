import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus, Shuffle, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

// Direct dollar top-ups — added straight to the current period's balance
// (Lampcode's POST-free addTopUp helper bumps monthlyLimitUsd; there's no
// purchase endpoint wired up yet, so "Buy" is a mock like it was before).
const packs = [
  { amount: 5, popular: false },
  { amount: 15, popular: true },
  { amount: 30, popular: false },
  { amount: 75, popular: false },
];

// Monthly price vs. real usage budget — matches Lampcode's PLAN_USAGE_USD
// (src/db/schema.ts): free=$3, pro=$15, max=$45, power=$100.
const plans = [
  {
    name: "Free",
    price: "$0",
    usage: "$3 usage / month",
    features: ["Fast Mode generation", "Community support"],
    cta: "Current",
    current: true,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    suffix: "/mo",
    usage: "$15 usage / month",
    features: ["Everything in Free", "Security review + auto-fix", "Usage breakdown by category"],
    cta: "Upgrade",
    highlight: false,
  },
  {
    name: "Max",
    price: "$49",
    suffix: "/mo",
    usage: "$45 usage / month",
    features: ["Everything in Pro", "Priority queue", "MCP write actions"],
    cta: "Upgrade",
    highlight: true,
  },
  {
    name: "Power",
    price: "$99",
    suffix: "/mo",
    usage: "$100 usage / month",
    features: ["Everything in Max", "Rollover up to $100 unused", "Highest priority queue"],
    cta: "Upgrade",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    usage: "Custom usage budget",
    features: ["Everything in Power", "SSO + roles", "Audit logs", "Dedicated support"],
    cta: "Contact Us",
    highlight: false,
  },
];

// Real, live features only — no parallel agents, planning/conversational
// agent, or model-routing tiers exist in the product.
const featureRows: { label: string; tiers: Record<string, boolean> }[] = [
  {
    label: "Fast Mode generation",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "Security review",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "Repo / project memory",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "Type-check + auto-fix",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "MCP read integrations",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "MCP write actions (approval-gated)",
    tiers: { Free: true, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "Usage breakdown by category",
    tiers: { Free: false, Pro: true, Max: true, Power: true, Enterprise: true },
  },
  {
    label: "Priority queue",
    tiers: { Free: false, Pro: false, Max: true, Power: true, Enterprise: true },
  },
];

const why = [
  {
    icon: Shuffle,
    title: "Pay For Real Usage",
    desc: "Every request bills at its actual cost — a small fix costs less than a full build. Spend exactly where you need it.",
  },
  {
    icon: PiggyBank,
    title: "Power Rolls Over",
    desc: "Free, Pro, and Max usage resets each period. Power carries up to $100 of unused balance into the next month.",
  },
  {
    icon: Plus,
    title: "Top Up Anytime",
    desc: "Need more mid-project? Add $5–$75 to your balance instantly. No plan change required.",
  },
];

function PricingPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-12 pb-12">
        <div className="text-center">
          <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Simple, transparent usage-based pricing.
          </h1>
          <p className="mt-3 text-lg text-foreground/80">Pay for what you use.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No hidden fees. No vendor lock-in. Your usage, your choice.
          </p>
        </div>

        {/* Top up */}
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Need more? Top up anytime.</h2>
              <p className="text-xs text-muted-foreground">
                Applies to your current billing period.
              </p>
            </div>
            <Badge variant="secondary" className="bg-primary/15 text-primary border-0">
              One-time purchase
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map((p) => (
              <div
                key={p.amount}
                className={`relative flex flex-col items-center gap-2 rounded-xl border bg-background/40 p-4 transition hover:border-primary/50 ${
                  p.popular ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/60"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2 rounded-full bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="text-2xl font-bold text-primary">${p.amount}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  added to balance
                </div>
                <Button
                  size="sm"
                  variant={p.popular ? "default" : "secondary"}
                  className={`w-full ${p.popular ? "bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90" : ""}`}
                  onClick={() => toast.success(`Adding $${p.amount} to your balance`)}
                >
                  Buy
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly plans */}
        <div>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold">Monthly plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All plans include the same AI quality, security checks, and deploy pipeline. Only the
              usage budget differs.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {plans.map((t) => (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-2xl border bg-card/60 p-6 backdrop-blur ${
                  t.highlight ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border"
                }`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                {t.current && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[oklch(0.78_0.17_155)] text-background border-0">
                    Current
                  </Badge>
                )}
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{t.price}</span>
                  {t.suffix && <span className="text-sm text-muted-foreground">{t.suffix}</span>}
                </div>
                <div className="mt-3 rounded-md bg-background/50 px-2.5 py-1.5 text-xs font-medium text-primary">
                  {t.usage}
                </div>
                <ul className="mt-5 flex-1 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full ${
                    t.highlight
                      ? "bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90"
                      : ""
                  }`}
                  variant={t.highlight ? "default" : t.current ? "outline" : "secondary"}
                  disabled={t.current}
                >
                  {t.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison */}
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <h2 className="text-xl font-bold">Compare plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every plan shares the same product — only usage budget and a few perks scale up.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border/60">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 border-b border-border/60 bg-background/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Feature</span>
                {plans.map((t) => (
                  <span key={t.name} className="text-center">
                    {t.name}
                  </span>
                ))}
              </div>
              {featureRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.5fr_repeat(5,1fr)] items-center gap-2 border-b border-border/40 px-4 py-3 text-sm last:border-0"
                >
                  <span>{row.label}</span>
                  {plans.map((t) => (
                    <span key={t.name} className="flex justify-center">
                      {row.tiers[t.name] ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Why usage-based pricing */}
        <div>
          <h2 className="mb-5 text-center text-2xl font-bold">Why usage-based pricing?</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {why.map((w) => {
              const Icon = w.icon;
              return (
                <Card key={w.title} className="border-border/60 bg-card/60 p-5 backdrop-blur">
                  <div className="mb-3 inline-grid h-9 w-9 place-content-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-base font-semibold">{w.title}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{w.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
