import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MoreVertical, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

type Project = {
  id: string;
  name: string;
  visibility: "public" | "private";
  updated_at: string;
  gradient?: string;
};

const GRADIENTS = [
  "from-fuchsia-500 via-pink-500 to-orange-400",
  "from-amber-400 via-orange-500 to-red-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-rose-400 via-red-500 to-orange-500",
];

function gradientFor(index: number) {
  return GRADIENTS[index % GRADIENTS.length];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Edited ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Edited ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Edited ${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `Edited ${weeks}w ago`;
  return `Edited ${Math.floor(days / 30)}mo ago`;
}

function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isPending } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiGet<unknown>("/api/projects");
      if (Array.isArray(res)) return res as Project[];
      // Backend may wrap as { projects: [...] } or { data: [...] } etc.
      const wrapped = res as Record<string, unknown>;
      const arr = wrapped.projects ?? wrapped.data ?? wrapped.items ?? [];
      return Array.isArray(arr) ? (arr as Project[]) : [];
    },
  });

  const projects = Array.isArray(data) ? data : [];

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <RequireAuth>
      <Shell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPending
                  ? "Loading…"
                  : `${filtered.length} project${filtered.length !== 1 ? "s" : ""} · all your vibes in one place.`}
              </p>
            </div>
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground"
              onClick={() => navigate({ to: "/" })}
            >
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 bg-card/60 border-border/60 backdrop-blur"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isPending
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur"
                  >
                    <Skeleton className="aspect-video w-full" />
                    <div className="flex items-center justify-between p-4 gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))
              : filtered.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() =>
                      navigate({ to: "/workspace/$projectId", params: { projectId: p.id }, search: { sessionId: undefined, mode: undefined } })
                    }
                    className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
                  >
                    <div
                      className={`relative aspect-video w-full bg-gradient-to-br ${p.gradient ?? gradientFor(i)}`}
                    >
                      <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
                      <div className="absolute right-2 top-2">
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-black/40 text-white backdrop-blur"
                        >
                          {p.visibility === "public" ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {p.visibility}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(p.updated_at)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

            {!isPending && filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
                {search
                  ? `No projects match "${search}"`
                  : "No projects yet. Start building your first one!"}
              </div>
            )}
          </div>
        </div>
      </Shell>
    </RequireAuth>
  );
}
