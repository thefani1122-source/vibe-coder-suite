import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/usage")({ component: UsagePage });

// Real response shapes from Lampcode:
// GET /api/users/me/billing/usage (src/server/routes/billing.ts) — real USD
// usage plus the per-category breakdown; there is no separate "projects
// built" field here, but totalSessions counts the same buildSessions rows
// GET /api/users/me/usage does, so it's reused for that stat.
// GET /api/users/me/billing — only source for `plan`.
type UsageResponse = {
  usage: {
    monthlyLimitUsd: number;
    rolloverUsd: number;
    usageUsd: number;
    remainingUsd: number;
    totalSessions: number;
    categoryBreakdown: { category: string; usageUsd: number; taskCount: number }[];
  };
};

type BillingResponse = { billing: { plan: string } };

const CATEGORY_LABELS: Record<string, string> = {
  build: "Builds",
  empty_output_fix: "Empty-output fixes",
  missing_files_retry: "Missing-files retries",
  syntax_fix: "Syntax fixes",
  security_fix: "Security fixes",
  backend_crash_fix: "Backend-crash fixes",
  typecheck_fix: "Type-check fixes",
};

function UsagePage() {
  const { isAuthenticated } = useAuth();
  const { data, isPending } = useQuery<UsageResponse>({
    queryKey: ["billing-usage"],
    queryFn: () => apiGet<UsageResponse>("/api/users/me/billing/usage"),
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: billingData } = useQuery<BillingResponse>({
    queryKey: ["billing"],
    queryFn: () => apiGet<BillingResponse>("/api/users/me/billing"),
    enabled: isAuthenticated,
    retry: false,
  });

  const usage = data?.usage;
  const usageUsd = usage?.usageUsd ?? 0;
  const monthlyLimitUsd = usage?.monthlyLimitUsd ?? 0;
  const availableUsd = monthlyLimitUsd + (usage?.rolloverUsd ?? 0);
  const remainingUsd = usage?.remainingUsd ?? 0;
  const projectsBuilt = usage?.totalSessions ?? 0;
  const rawPlan = billingData?.billing?.plan ?? "";
  const plan = rawPlan ? rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1) : "—";
  // Usage breakdown by category is a Pro-and-up perk (pricing.tsx); free-plan
  // users see an upsell instead. This is a UI-only gate — the API itself
  // returns categoryBreakdown for every plan.
  const showBreakdown = rawPlan !== "" && rawPlan !== "free";
  const categoryBreakdown = usage?.categoryBreakdown ?? [];

  const pct = availableUsd > 0 ? Math.round((usageUsd / availableUsd) * 100) : 0;
  const maxCategoryUsd = Math.max(...categoryBreakdown.map((c) => c.usageUsd), 0.01);

  return (
    <RequireAuth>
      <Shell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">Usage</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Billing</span>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight">Usage &amp; Billing</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your real AI generation spend for this billing period.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Used This Period
              </div>
              {isPending ? (
                <Skeleton className="mt-3 h-12 w-24" />
              ) : (
                <div className="mt-3 text-5xl font-bold text-primary">${usageUsd.toFixed(2)}</div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {isPending ? (
                  <Skeleton className="h-3 w-20" />
                ) : (
                  `$${remainingUsd.toFixed(2)} remaining`
                )}
              </div>
            </Card>

            <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Projects Built
              </div>
              {isPending ? (
                <Skeleton className="mt-3 h-12 w-24" />
              ) : (
                <div className="mt-3 text-5xl font-bold text-[oklch(0.78_0.17_155)]">
                  {projectsBuilt}
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">All time</div>
            </Card>

            <Card className="border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Plan
              </div>
              {isPending ? (
                <Skeleton className="mt-3 h-12 w-24" />
              ) : (
                <div className="mt-3 text-5xl font-bold text-[oklch(0.82_0.17_85)]">{plan}</div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {isPending ? (
                  <Skeleton className="h-3 w-20" />
                ) : (
                  `$${monthlyLimitUsd.toFixed(2)}/mo included`
                )}
              </div>
            </Card>
          </div>

          <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Period Usage</h2>
              <span className="text-sm font-semibold text-primary">{pct}% used</span>
            </div>
            <div className="mt-4">
              <Progress
                value={pct}
                className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-[oklch(0.65_0.20_280)]"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>${usageUsd.toFixed(2)} used</span>
              <span>${availableUsd.toFixed(2)} total</span>
            </div>
          </Card>

          <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold">Usage by Category</h2>
            {!showBreakdown ? (
              <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                <span>
                  Category breakdown (builds, fixes, deploys) is available on Pro and above.
                </span>
                <Link to="/pricing" className="font-medium text-primary hover:underline">
                  View plans
                </Link>
              </div>
            ) : isPending ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No usage recorded yet this period.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {categoryBreakdown.map((c) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground/85">
                        {CATEGORY_LABELS[c.category] ?? c.category}
                      </span>
                      <span className="text-muted-foreground">
                        ${c.usageUsd.toFixed(2)} · {c.taskCount}{" "}
                        {c.taskCount === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.65_0.20_280)]"
                        style={{ width: `${(c.usageUsd / maxCategoryUsd) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Shell>
    </RequireAuth>
  );
}
