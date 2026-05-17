import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Rocket, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

const stats = [
  { label: "Active Projects", value: "12", icon: Rocket },
  { label: "Credits Used", value: "1,240", icon: Zap },
  { label: "Deployments", value: "38", icon: Activity },
  { label: "Collaborators", value: "5", icon: Users },
];

function DashboardPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, vibe coder.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">No activity yet — start a new app to see it here.</CardContent>
        </Card>
      </div>
    </Shell>
  );
}
