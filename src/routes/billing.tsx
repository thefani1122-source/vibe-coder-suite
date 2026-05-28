import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Download } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/billing")({ component: BillingPage });

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: string;
};

type BillingData = {
  plan: string;
  credits_used: number;
  credits_total: number;
  has_payment_method: boolean;
  card_brand?: string;
  card_last4?: string;
  invoices: Invoice[];
};

function BillingPage() {
  const { isAuthenticated } = useAuth();
  const { data, isPending } = useQuery<BillingData>({
    queryKey: ["billing"],
    queryFn: () => apiGet<BillingData>("/api/users/me/billing"),
    enabled: isAuthenticated,
    retry: false,
  });

  const planLabel = data?.plan
    ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    : "—";
  const creditsUsed = data?.credits_used ?? 0;
  const creditsTotal = data?.credits_total ?? 0;
  const invoices = data?.invoices ?? [];

  return (
    <RequireAuth>
      <Shell>
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your plan and payment method.</p>
          </div>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current plan</CardTitle>
              {isPending ? (
                <Skeleton className="h-6 w-16 rounded-full" />
              ) : (
                <Badge>{planLabel}</Badge>
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              {isPending ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <div className="text-sm text-muted-foreground">
                  {creditsUsed} / {creditsTotal} credits used this month.
                </div>
              )}
              <Button
                asChild
                className="bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground"
              >
                <Link to="/pricing">Upgrade</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader><CardTitle>Payment method</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-12 items-center justify-center rounded-md bg-secondary">
                <CreditCard className="h-4 w-4" />
              </div>
              {isPending ? (
                <Skeleton className="h-4 w-32" />
              ) : data?.has_payment_method ? (
                <div>
                  {data.card_brand ?? "Card"} ending in {data.card_last4 ?? "••••"}
                </div>
              ) : (
                <div>No card on file.</div>
              )}
              <Button variant="outline" size="sm" className="ml-auto">
                {data?.has_payment_method ? "Manage" : "Add card"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border/60">
              {isPending ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              ) : invoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                invoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{i.id}</span>
                      <span className="text-muted-foreground">{i.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{i.amount}</span>
                      <Badge variant="secondary">{i.status}</Badge>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </Shell>
    </RequireAuth>
  );
}
