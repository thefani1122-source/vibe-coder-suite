import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileUp, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export const Route = createFileRoute("/skills")({ component: SkillsPage });

interface UserSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  revision: number;
  enabled: boolean;
  source: string;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

function SkillsPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [skillMd, setSkillMd] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await apiGet<{ skills: UserSkill[] }>("/api/skills");
      setSkills(result.skills);
    } catch {
      // apiGet reports the error to the user.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 48 * 1024) {
      toast.error("SKILL.md must be 48 KiB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      setSkillMd(text);
      setSelectedFile(file.name);
    } catch {
      toast.error("Could not read that Markdown file.");
    }
  };

  const installSkill = async () => {
    if (!skillMd.trim()) {
      toast.error("Choose a SKILL.md file or paste its contents first.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/skills", { skillMd });
      toast.success("Skill added to your library.");
      setSkillMd("");
      setSelectedFile("");
      setDialogOpen(false);
      await refresh();
    } catch {
      // apiPost reports validation and server errors.
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = async (skill: UserSkill, enabled: boolean) => {
    setSkills((current) => current.map((item) => item.id === skill.id ? { ...item, enabled } : item));
    try {
      await apiPatch(`/api/skills/${skill.id}`, { enabled });
      toast.success(enabled ? "Skill enabled." : "Skill disabled.");
    } catch {
      setSkills((current) => current.map((item) => item.id === skill.id ? { ...item, enabled: skill.enabled } : item));
    }
  };

  const removeSkill = async (skill: UserSkill) => {
    if (!window.confirm(`Remove "${skill.name}" from your Skills Library?`)) return;
    try {
      await apiDelete(`/api/skills/${skill.id}`);
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      toast.success("Skill removed.");
    } catch {
      // apiDelete reports the error.
    }
  };

  const enabledCount = skills.filter((skill) => skill.enabled).length;

  return (
    <RequireAuth>
      <Shell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Skills Library</h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Add reusable instructions that LampCode can discover and load when a build needs them.
                Enabled skills are available across your projects.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {skills.length} installed · {enabledCount} enabled
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Import skill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import a Skill</DialogTitle>
                  <DialogDescription>
                    Add a standard Agent Skills SKILL.md document to your personal library.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skill-file">Choose SKILL.md</Label>
                    <Input id="skill-file" type="file" accept=".md,text/markdown,text/plain" onChange={(event) => void importFile(event)} />
                    {selectedFile && <p className="text-xs text-muted-foreground">Loaded: {selectedFile}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skill-content">SKILL.md content</Label>
                    <Textarea
                      id="skill-content"
                      value={skillMd}
                      onChange={(event) => setSkillMd(event.target.value)}
                      placeholder={"---\nname: react-accessibility\ndescription: Use when building or reviewing accessible React interfaces.\n---\n\n# React accessibility\n\nDescribe the workflow and conventions the agent should follow."}
                      className="min-h-[260px] font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Requires YAML frontmatter with a lowercase name and a description. Maximum size: 48 KiB.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      Skill instructions are treated as untrusted reference material. LampCode does not execute scripts or hooks from imported skills, and a skill cannot grant itself tool permissions.
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This first release imports one SKILL.md file. ZIP bundles and additional references/assets are not imported yet.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                  <Button onClick={() => void installSkill()} disabled={saving || !skillMd.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    Add to library
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border/60 bg-card/50">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">You control what the agent can use</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Only enabled skills appear in the agent's personal skills index. Their full instructions load on demand, and are never treated as security rules or permission grants.
                </p>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : skills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-muted-foreground/60" />
              <h2 className="mt-4 text-lg font-semibold">Your library is empty</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Import a SKILL.md file containing a repeatable workflow, framework conventions or domain-specific guidance.
              </p>
              <Button className="mt-5 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Import your first skill
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill) => (
                <Card key={skill.id} className={skill.enabled ? "border-border/70 bg-card/70" : "border-border/40 bg-card/30 opacity-75"}>
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="break-words text-base">{skill.name}</CardTitle>
                        <CardDescription className="mt-1 text-xs">{skill.slug} · v{skill.version}</CardDescription>
                      </div>
                      <Badge variant={skill.enabled ? "default" : "secondary"}>
                        {skill.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="min-h-12 text-sm leading-relaxed text-muted-foreground">{skill.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border-t border-border/50 pt-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={skill.enabled} onCheckedChange={(enabled) => void toggleSkill(skill, enabled)} aria-label={`Enable ${skill.name}`} />
                        <span className="text-xs text-muted-foreground">Available to agent</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => void removeSkill(skill)} aria-label={`Remove ${skill.name}`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Revision {skill.revision}</span>
                      <span>Updated {new Date(skill.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Shell>
    </RequireAuth>
  );
}
