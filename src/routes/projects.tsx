import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MoreVertical } from "lucide-react";
import { apiGet, apiDelete } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

type Project = {
  id: string;
  name: string;
  description?: string;
  /** API may return camelCase or snake_case */
  updatedAt?: string;
  updated_at?: string;
  lastBuildStatus?: "success" | "error" | "pending" | string;
  fileCount?: number;
};

function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const handleProjectClick = async (projectId: string) => {
    const res = await apiGet<{ sessionId?: string; session_id?: string }>(
      `/api/build/${projectId}/last-session`,
      { silent: true },
    ).catch(() => null);
    const sessionId = res?.sessionId ?? res?.session_id;
    navigate({
      to: "/workspace/$projectId",
      params: { projectId },
      search: { sessionId: sessionId ?? undefined, mode: "fast" },
    });
  };

  const { data, isPending } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiGet<unknown>("/api/projects");
      if (Array.isArray(res)) return res as Project[];
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
              : filtered.map((p) => {
                  const rawDate = p.updatedAt ?? p.updated_at;
                  const timeAgo = rawDate
                    ? formatDistanceToNow(new Date(rawDate), { addSuffix: true })
                    : "";
                  const built = p.lastBuildStatus === "completed";

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProjectClick(p.id)}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-[#0d0d12] to-[#1a1a2e] flex flex-col justify-between p-4">
                        <div className="text-white/15 text-xs font-mono">lampcode.dev</div>
                        <div>
                          <div className="text-white/70 text-sm font-medium line-clamp-2 mb-2">
                            {p.name || p.description || "Untitled"}
                          </div>
                          {built && (
                            <div className="inline-flex items-center gap-1 text-xs text-green-400/70 bg-green-400/10 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-green-400" />
                              Built
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between p-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{p.name}</div>
                          {timeAgo && (
                            <div className="text-xs text-muted-foreground">{timeAgo}</div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="grid h-8 w-8 shrink-0 place-content-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm("Delete this project?")) return;
                                await apiDelete(`/api/projects/${p.id}`);
                                queryClient.invalidateQueries({ queryKey: ["projects"] });
                              }}
                            >
                              Delete project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}

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
