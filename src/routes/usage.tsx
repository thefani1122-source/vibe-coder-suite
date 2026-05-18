import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/usage")({ component: UsagePage });

const creditsUsed = 194;
const creditsTotal = 850;
const projectsBuilt = 0;
const plan = "Starter";
const planLimit = 10;

const monthly = [
  { m: "Jan", v: 55 }, { m: "Feb", v: 68 }, { m: "Mar", v: 50 },
  { m: "Apr", v: 72 }, { m: "May", v: 30 }, { m: "Jun", v: 82 },
  { m: "Jul", v: 62 }, { m: "Aug", v: 70 }, { m: "Sep", v: 85 },
  { m: "Oct", v: 78 }, { m: "Nov", v: 95 }, { m: "Dec", v: 38 },
];

function UsagePage() {
  const pct = Math.round((creditsUsed / creditsTotal) * 100);
  const maxBar = Math.max(...monthly.map((x) => x.v));

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">Usage</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Credits</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold tracking-tight">Usage &amp; Credits</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your AI generation usage and credit consumption.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Credits Used
            </div>
            <div className="mt-3 text-5xl font-bold text-primary">{creditsUsed}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {creditsTotal - creditsUsed} remaining
            </div>
          </Card>

          <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Projects Built
            </div>
            <div className="mt-3 text-5xl font-bold text-[oklch(0.78_0.17_155)]">{projectsBuilt}</div>
            <div className="mt-2 text-xs text-muted-foreground">This month</div>
          </Card>

          <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plan
            </div>
            <div className="mt-3 text-5xl font-bold text-[oklch(0.82_0.17_85)]">{plan}</div>
            <div className="mt-2 text-xs text-muted-foreground">{planLimit} projects/mo</div>
          </Card>
        </div>

        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Credit Usage</h2>
            <span className="text-sm font-semibold text-primary">{pct}% used</span>
          </div>
          <div className="mt-4">
            <Progress value={pct} className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-[oklch(0.65_0.20_280)]" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{creditsUsed} credits used</span>
            <span>{creditsTotal} total</span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Monthly Activity</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {monthly.map((d) => (
              <div key={d.m} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-[oklch(0.55_0.14_265)] transition hover:bg-[oklch(0.65_0.18_265)]"
                  style={{ height: `${(d.v / maxBar) * 100}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.m}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
