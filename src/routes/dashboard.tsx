import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderGit2, Plus, Sparkles, Zap, Calendar, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

type Project = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  status: "active" | "draft" | "archived";
};

const seedProjects: Project[] = [
  {
    id: "p1",
    name: "Aurora Landing",
    description: "Marketing site for the new product launch.",
    updatedAt: "2 hours ago",
    status: "active",
  },
  {
    id: "p2",
    name: "Crypto Dashboard",
    description: "Realtime portfolio tracker with charts.",
    updatedAt: "Yesterday",
    status: "draft",
  },
];

function DashboardPage() {
  return (
    <RequireAuth>
      <Shell>
        <DashboardContent />
      </Shell>
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const createProject = () => {
    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    const p: Project = {
      id: `p${Date.now()}`,
      name: name.trim(),
      description: desc.trim() || "No description",
      updatedAt: "Just now",
      status: "draft",
    };
    setProjects((cur) => [p, ...cur]);
    setName("");
    setDesc("");
    setOpen(false);
    toast.success(`Project "${p.name}" created`);
  };

  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your projects today.
          </p>
        </div>
        <NewProjectDialog
          open={open}
          setOpen={setOpen}
          name={name}
          setName={setName}
          desc={desc}
          setDesc={setDesc}
          onCreate={createProject}
        />
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<FolderGit2 className="h-4 w-4" />} label="Active Projects" value={String(projects.filter((p) => p.status === "active").length)} />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Builds This Month" value="12" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Plan" value="Free" hint="Upgrade for more" />
      </div>

      {/* Projects */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">My Projects</h2>
        <span className="text-xs text-muted-foreground">{projects.length} total</span>
      </div>

      {projects.length === 0 ? (
        <EmptyState onCreate={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <button
            onClick={() => setOpen(true)}
            className="group flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-6 text-muted-foreground transition hover:border-primary/60 hover:bg-card hover:text-foreground"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">New Project</span>
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusVariant =
    project.status === "active" ? "default" : project.status === "draft" ? "secondary" : "outline";
  return (
    <Link
      to="/workspace/$projectId"
      params={{ projectId: project.id }}
      className="group block"
    >
      <Card className="h-full border-border/60 bg-card/60 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <Badge variant={statusVariant} className="capitalize">
              {project.status}
            </Badge>
          </div>
          <CardTitle className="mt-3 text-base font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Updated {project.updatedAt}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed border-border/60 bg-card/40">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
          <Rocket className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to start building.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create your first project
        </Button>
      </CardContent>
    </Card>
  );
}

function NewProjectDialog({
  open,
  setOpen,
  name,
  setName,
  desc,
  setDesc,
  onCreate,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Give your project a name and short description to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project name</label>
            <Input
              placeholder="My awesome app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              placeholder="What are you building?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
