import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

const projects = [
  { name: "Neon Portfolio", updated: "Edited 2h ago", visibility: "public", gradient: "from-fuchsia-500 via-pink-500 to-orange-400" },
  { name: "Crypto Tracker", updated: "Edited 1d ago", visibility: "private", gradient: "from-amber-400 via-orange-500 to-red-500" },
  { name: "AI Notes App", updated: "Edited 3d ago", visibility: "public", gradient: "from-emerald-400 via-teal-500 to-cyan-500" },
  { name: "Lo-fi Player", updated: "Edited 1w ago", visibility: "private", gradient: "from-indigo-500 via-purple-500 to-pink-500" },
  { name: "Habit Tracker", updated: "Edited 2w ago", visibility: "public", gradient: "from-sky-400 via-blue-500 to-indigo-600" },
  { name: "Recipe Vault", updated: "Edited 1mo ago", visibility: "private", gradient: "from-rose-400 via-red-500 to-orange-500" },
];

function ProjectsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">{projects.length} projects · all your vibes in one place.</p>
          </div>
          <Button className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9 bg-card/60 border-border/60 backdrop-blur" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.name}
              className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <div className={`relative aspect-video w-full bg-gradient-to-br ${p.gradient}`}>
                <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
                <div className="absolute right-2 top-2">
                  <Badge variant="secondary" className="gap-1 bg-black/40 text-white backdrop-blur">
                    {p.visibility === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {p.visibility}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.updated}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
