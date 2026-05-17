import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/usage")({ component: UsagePage });

const stats = [
  { label: "Credits", used: 12, total: 50, unit: "" },
  { label: "Projects", used: 4, total: 10, unit: "" },
  { label: "Storage", used: 230, total: 1024, unit: " MB" },
];

function UsagePage() {
  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your monthly consumption.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{s.used}{s.unit} <span className="text-sm font-normal text-muted-foreground">/ {s.total}{s.unit}</span></div>
                <Progress value={(s.used / s.total) * 100} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
