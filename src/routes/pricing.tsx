import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, ClipboardList, Wrench, Rocket, Eye, Pencil, Brain, Shuffle, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({ component: PricingPage });

const packs = [
  { credits: 500, price: 5, popular: false },
  { credits: 1000, price: 9, popular: true },
  { credits: 2500, price: 20, popular: false },
  { credits: 5000, price: 35, popular: false },
  { credits: 10000, price: 60, popular: false },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    credits: "500 credits / month",
    features: ["~25 Fast Mode builds", "OR ~3 Plan Mode builds", "Community support"],
    cta: "Current",
    current: true,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    suffix: "/mo",
    credits: "2,500 credits / month",
    features: ["~125 Fast Mode builds", "OR ~15 Plan Mode builds", "OR mix & match", "Priority support"],
    cta: "Upgrade",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    suffix: "/mo",
    credits: "10,000 credits / month",
    features: ["~500 Fast Mode builds", "OR ~60 Plan Mode builds", "OR mix & match", "Team workspaces"],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    credits: "Unlimited credits",
    features: ["Everything in Pro", "SSO + roles", "Audit logs", "Custom models"],
    cta: "Contact Us",
    highlight: false,
  },
];

const costs = [
  { icon: Zap, label: "Fast Mode build", credits: "20 credits", cost: "~$0.20", color: "text-primary" },
  { icon: ClipboardList, label: "Plan Mode build", credits: "150 credits", cost: "~$1.50", color: "text-[oklch(0.7_0.18_280)]" },
  { icon: Wrench, label: "Fix round (auto-fix)", credits: "30 credits", cost: "~$0.30", color: "text-[oklch(0.78_0.17_155)]" },
  { icon: Rocket, label: "Deploy", credits: "10 credits", cost: "~$0.10", color: "text-[oklch(0.72_0.20_35)]" },
  { icon: Eye, label: "Monitor (per day)", credits: "5 credits", cost: "~$0.05", color: "text-[oklch(0.7_0.15_220)]" },
  { icon: Pencil, label: "Editor Mode request", credits: "5 credits", cost: "~$0.05", color: "text-muted-foreground" },
  { icon: Brain, label: "Planning interview", credits: "Free", cost: "$0", color: "text-[oklch(0.78_0.17_155)]" },
];

const why = [
  { icon: Shuffle, title: "Mix & Match", desc: "Use Fast for quick prototypes, Plan for production apps. Your choice." },
  { icon: PiggyBank, title: "No Waste", desc: "Unused credits roll over for 30 days. Never lose what you paid for." },
  { icon: Plus, title: "Top Up Anytime", desc: "Run out mid-project? Buy a credit pack instantly. No plan upgrade needed." },
];

function PricingPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-12 pb-12">
        <div className="text-center">
          <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Simple, transparent credits.
          </h1>
          <p className="mt-3 text-lg text-foreground/80">Pay for what you use.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No hidden fees. No vendor lock-in. Your credits, your choice.
          </p>
        </div>

        {/* Credit packs */}
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Need more? Top up anytime.</h2>
              <p className="text-xs text-muted-foreground">Credits never expire on top-ups.</p>
            </div>
            <Badge variant="secondary" className="bg-primary/15 text-primary border-0">One-time purchase</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {packs.map((p) => (
              <div
                key={p.credits}
                className={`relative flex flex-col items-center gap-2 rounded-xl border bg-background/40 p-4 transition hover:border-primary/50 ${
                  p.popular ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/60"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2 rounded-full bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="text-2xl font-bold">{p.credits.toLocaleString()}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">credits</div>
                <div className="text-xl font-semibold text-primary">${p.price}</div>
                <Button
                  size="sm"
                  variant={p.popular ? "default" : "secondary"}
                  className={`w-full ${p.popular ? "bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground hover:opacity-90" : ""}`}
                  onClick={() => toast.success(`Buying ${p.credits} credits for $${p.price}`)}
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
              All plans include the same AI quality, security checks, and deploy pipeline. Only credits differ.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[oklch(0.78_0.17_155)] text-background border-0">Current</Badge>
                )}
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{t.price}</span>
                  {t.suffix && <span className="text-sm text-muted-foreground">{t.suffix}</span>}
                </div>
                <div className="mt-3 rounded-md bg-background/50 px-2.5 py-1.5 text-xs font-medium text-primary">
                  {t.credits}
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

        {/* What costs credits */}
        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <h2 className="text-xl font-bold">What costs credits?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Transparent pricing for every action.</p>
          <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border/60 bg-background/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Action</span>
              <span>Credits</span>
              <span className="text-right w-24">Est. Cost</span>
            </div>
            {costs.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/40 px-4 py-3 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${c.color}`} />
                    <span>{c.label}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{c.credits}</span>
                  <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">{c.cost}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Why credits */}
        <div>
          <h2 className="mb-5 text-center text-2xl font-bold">Why credits?</h2>
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