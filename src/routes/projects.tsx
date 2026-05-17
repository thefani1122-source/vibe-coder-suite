import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

const projects = [
  { name: "Neon Portfolio", updated: "2h ago" },
  { name: "Crypto Tracker", updated: "1d ago" },
  { name: "AI Notes App", updated: "3d ago" },
  { name: "Lo-fi Player", updated: "1w ago" },
];

function ProjectsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">All your vibes in one place.</p>
          </div>
          <Button className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.name} className="group border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Updated {p.updated}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
