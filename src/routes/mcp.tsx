import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/mcp")({ component: McpPage });

const servers = [
  { name: "GitHub", desc: "Read repos, open PRs", status: "Connected" },
  { name: "Supabase", desc: "Query your databases", status: "Connected" },
  { name: "Linear", desc: "Manage issues and projects", status: "Not connected" },
  { name: "Notion", desc: "Read & write pages", status: "Not connected" },
];

function McpPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MCP</h1>
            <p className="mt-1 text-sm text-muted-foreground">Connect Model Context Protocol servers to extend your agents.</p>
          </div>
          <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Server</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {servers.map((s) => (
            <Card key={s.name} className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Plug className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                </div>
                <Badge variant={s.status === "Connected" ? "default" : "secondary"}>{s.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.desc}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
