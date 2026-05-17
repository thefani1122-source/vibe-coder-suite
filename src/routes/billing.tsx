import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download } from "lucide-react";

export const Route = createFileRoute("/billing")({ component: BillingPage });

const invoices = [
  { id: "INV-0042", date: "May 01, 2026", amount: "$20.00", status: "Paid" },
  { id: "INV-0041", date: "Apr 01, 2026", amount: "$20.00", status: "Paid" },
  { id: "INV-0040", date: "Mar 01, 2026", amount: "$20.00", status: "Paid" },
];

function BillingPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your plan and payment method.</p>
        </div>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge>Free</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">12 / 50 credits used this month.</div>
            <Button asChild className="bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground"><Link to="/pricing">Upgrade</Link></Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Payment method</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3 text-sm">
            <div className="flex h-9 w-12 items-center justify-center rounded-md bg-secondary"><CreditCard className="h-4 w-4" /></div>
            <div>No card on file.</div>
            <Button variant="outline" size="sm" className="ml-auto">Add card</Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border/60">
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3"><span className="font-medium">{i.id}</span><span className="text-muted-foreground">{i.date}</span></div>
                <div className="flex items-center gap-4"><span>{i.amount}</span><Badge variant="secondary">{i.status}</Badge><Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
