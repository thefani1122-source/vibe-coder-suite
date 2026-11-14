import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileUp, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";

export const Route = createFileRoute("/skills")({ component: SkillsPage });

const MAX_SKILL_FOLDER_ENTRIES = 250;
const SKILL_REFERENCE_PATH_RE =
  /^references\\/(?:[A-Za-z0-9][A-Za-z0-9._-]*\\/)*[A-Za-z0-9][A-Za-z0-9._-]*\\.md$/;

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
  resourcePaths: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserSkillDocument extends UserSkill {
  content: string;
  resources: Record<string, string>;
}

function SkillsPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busySkillId, setBusySkillId] = useState<string | null>(null);
  const [loadingSkillId, setLoadingSkillId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<UserSkill | null>(null);
  const [skillMd, setSkillMd] = useState("");
  const [skillResources, setSkillResources] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState("");

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError(false);
    try {
      const result = await apiGet<{ skills: UserSkill[] }>("/api/skills");
      setSkills(result.skills);
    } catch {
      setLoadError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openImportDialog = () => {
    setEditingSkill(null);
    setSkillMd("");
    setSkillResources({});
    setSelectedFile("");
    setDialogOpen(true);
  };

  const openEditDialog = async (skill: UserSkill) => {
    setLoadingSkillId(skill.id);
    try {
      const result = await apiGet<{ skill: UserSkillDocument }>(`/api/skills/${skill.id}`);
      setEditingSkill(skill);
      setSkillMd(result.skill.content);
      setSkillResources(result.skill.resources ?? {});
      setSelectedFile("");
      setDialogOpen(true);
    } catch {
      // apiGet displays the error; keep the dialog closed.
    } finally {
      setLoadingSkillId(null);
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    if (file.size > 48 * 1024) {
      toast.error("SKILL.md must be 48 KiB or smaller.");
      input.value = "";
      return;
    }
    try {
      const text = await file.text();
      setSkillMd(text);
      if (!editingSkill) setSkillResources({});
      setSelectedFile(file.name);
    } catch {
      toast.error("Could not read that Markdown file.");
      input.value = "";
    }
  };

  const importFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedCount = input.files?.length ?? 0;
    if (selectedCount > MAX_SKILL_FOLDER_ENTRIES) {
      input.value = "";
      toast.error(`Choose a smaller skill folder (maximum ${MAX_SKILL_FOLDER_ENTRIES} files).`);
      return;
    }
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;
    // Clear a previous selection first so a rejected folder cannot leave stale
    // content ready to be saved accidentally.
    setSkillMd("");
    setSkillResources({});
    setSelectedFile("");

    const entryPoints = files.filter((file) => {
      const relativePath = file.webkitRelativePath.split("/");
      return relativePath.length === 2 && relativePath[1] === "SKILL.md";
    });
    if (entryPoints.length !== 1) {
      toast.error("Choose one skill folder containing exactly one SKILL.md file.");
      return;
    }

    const entryPoint = entryPoints[0]!;
    if (entryPoint.size > 48 * 1024) {
      toast.error("SKILL.md must be 48 KiB or smaller.");
      return;
    }
    const entryPath = entryPoint.webkitRelativePath;
    const rootPath = entryPath.slice(0, -"/SKILL.md".length);
    if (!rootPath || !entryPath.startsWith(rootPath + "/")) {
      toast.error("Choose a skill directory, not an individual file.");
      return;
    }

    const references: Record<string, string> = {};
    let totalBytes = 0;
    let skippedFiles = 0;
    try {
      for (const file of files) {
        const relativePath = file.webkitRelativePath.slice(rootPath.length + 1);
        if (relativePath === "SKILL.md") continue;
        if (!relativePath.startsWith("references/") || !relativePath.endsWith(".md") ||
            relativePath.length > 240 || !SKILL_REFERENCE_PATH_RE.test(relativePath)) {
          skippedFiles++;
          continue;
        }
        if (Object.keys(references).length >= 20) {
          toast.error("A skill can include at most 20 reference Markdown files.");
          return;
        }
        if (file.size > 32 * 1024) {
          toast.error(`Reference "${relativePath}" exceeds the 32 KiB per-file limit.`);
          return;
        }
        totalBytes += file.size;
        if (totalBytes > 256 * 1024) {
          toast.error("Combined skill references exceed the 256 KiB limit.");
          return;
        }
        references[relativePath] = await file.text();
      }

      setSkillMd(await entryPoint.text());
      setSkillResources(references);
      const folderName = rootPath.split("/").pop() ?? "skill folder";
      setSelectedFile(
        `${folderName} · ${Object.keys(references).length} references${skippedFiles ? ` · ${skippedFiles} other files skipped` : ""}`,
      );
      if (skippedFiles > 0) {
        toast.message(`${skippedFiles} unsupported files were skipped. Only references/**/*.md documents are imported.`);
      }
    } catch {
      toast.error("Could not read the selected skill folder.");
    }
  };


  const saveSkill = async () => {
    if (!skillMd.trim()) {
      toast.error("Choose a SKILL.md file or paste its contents first.");
      return;
    }
    if (new TextEncoder().encode(skillMd).byteLength > 48 * 1024) {
      toast.error("SKILL.md must be 48 KiB or smaller.");
      return;
    }

    setSaving(true);
    try {
      if (editingSkill) {
        await apiPut(`/api/skills/${editingSkill.id}`, { skillMd, resources: skillResources });
        toast.success("Skill updated.");
      } else {
        await apiPost("/api/skills", { skillMd, resources: skillResources });
        toast.success("Skill added to your library.");
      }
      setDialogOpen(false);
      setEditingSkill(null);
      setSkillMd("");
      setSkillResources({});
      setSelectedFile("");
      await refresh(false);
    } catch {
      // API helpers display the validation and server error.
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = async (skill: UserSkill, enabled: boolean) => {
    setBusySkillId(skill.id);
    try {
      await apiPatch(`/api/skills/${skill.id}`, { enabled });
      setSkills((current) => current.map((item) => item.id === skill.id ? { ...item, enabled } : item));
      toast.success(enabled ? "Skill enabled." : "Skill disabled.");
    } catch {
      // Keep the server-confirmed state visible.
    } finally {
      setBusySkillId(null);
    }
  };

  const removeSkill = async () => {
    if (!deletingSkill) return;
    const skill = deletingSkill;
    setBusySkillId(skill.id);
    try {
      await apiDelete(`/api/skills/${skill.id}`);
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      toast.success("Skill removed.");
      setDeletingSkill(null);
    } catch {
      // Keep the card and dialog state so the user can retry.
    } finally {
      setBusySkillId(null);
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
            <Button className="gap-2" onClick={openImportDialog}>
              <Plus className="h-4 w-4" /> Import skill
            </Button>
          </div>

          <Card className="border-border/60 bg-card/50">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">You control what the agent can use</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Only enabled skills appear in the agent's personal skills index. Their full instructions load on demand,
                  and are never treated as security rules or permission grants.
                </p>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground" role="status" aria-label="Loading skills">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">Couldn't load your Skills Library</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Your skills have not been removed. Check your connection and try again.
              </p>
              <Button className="mt-5" variant="outline" onClick={() => void refresh()} disabled={loading}>
                Try again
              </Button>
            </div>
          ) : skills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-muted-foreground/60" />
              <h2 className="mt-4 text-lg font-semibold">Your library is empty</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Import a SKILL.md file containing a repeatable workflow, framework conventions or domain-specific guidance.
              </p>
              <Button className="mt-5 gap-2" onClick={openImportDialog}>
                <Plus className="h-4 w-4" /> Import your first skill
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill) => {
                const busy = busySkillId === skill.id;
                return (
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
                          <Switch
                            checked={skill.enabled}
                            disabled={busy || loadingSkillId === skill.id}
                            onCheckedChange={(enabled) => void toggleSkill(skill, enabled)}
                            aria-label={`Enable ${skill.name}`}
                          />
                          <span className="text-xs text-muted-foreground">Available to agent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || loadingSkillId !== null}
                            onClick={() => void openEditDialog(skill)}
                            aria-label={`Edit ${skill.name}`}
                          >
                            {loadingSkillId === skill.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || loadingSkillId !== null}
                            onClick={() => setDeletingSkill(skill)}
                            aria-label={`Remove ${skill.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Revision {skill.revision} · {skill.resourcePaths?.length ?? 0} references</span>
                        <span>Updated {new Date(skill.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (saving) return;
          setDialogOpen(open);
          if (!open) {
            setEditingSkill(null);
            setSkillMd("");
            setSkillResources({});
            setSelectedFile("");
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSkill ? "Update skill" : "Import a Skill"}</DialogTitle>
              <DialogDescription>
                {editingSkill
                  ? "Replace this skill's instructions while keeping its identity and existing agent references."
                  : "Add a standard Agent Skills SKILL.md document to your personal library."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skill-file">Choose SKILL.md</Label>
                <Input id="skill-file" type="file" accept=".md,text/markdown,text/plain" onChange={(event) => void importFile(event)} disabled={saving} />
                <Label htmlFor="skill-folder">Or import a skill folder</Label>
                <Input
                  ref={(node) => {
                    if (!node) return;
                    node.setAttribute("webkitdirectory", "");
                    node.setAttribute("directory", "");
                  }}
                  id="skill-folder"
                  type="file"
                  multiple
                  accept=".md,text/markdown,text/plain"
                  onChange={(event) => void importFolder(event)}
                  disabled={saving}
                />
                {selectedFile && <p className="text-xs text-muted-foreground">Loaded: {selectedFile}</p>}
                {Object.keys(skillResources).length > 0 && (
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
                    <p className="font-medium">{Object.keys(skillResources).length} reference documents will be stored separately:</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {Object.keys(skillResources).sort().map((resource) => <li key={resource}>{resource}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-content">SKILL.md content</Label>
                <Textarea
                  id="skill-content"
                  value={skillMd}
                  onChange={(event) => setSkillMd(event.target.value)}
                  placeholder={"---\nname: react-accessibility\ndescription: Use when building or reviewing accessible React interfaces.\n---\n\n# React accessibility\n\nDescribe the workflow and conventions the agent should follow."}
                  className="min-h-[260px] font-mono text-xs"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Requires YAML frontmatter with a lowercase name and a description. Maximum size: 48 KiB.
                  {editingSkill ? " Keep the name unchanged; it is the stable identifier used by builds." : ""}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Skill instructions are treated as untrusted reference material. LampCode does not execute scripts or hooks from imported skills, and a skill cannot grant itself tool permissions.
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Folder import supports SKILL.md plus up to 20 portable Markdown files under references/ (32 KiB each, 256 KiB combined). Other files, unsupported paths, scripts and binary assets are skipped; scripts/hooks are never executed.
                {editingSkill ? " A single-file update preserves current references; importing a folder replaces them." : ""}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void saveSkill()} disabled={saving || !skillMd.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {editingSkill ? "Save changes" : "Add to library"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deletingSkill)} onOpenChange={(open) => {
          if (!busySkillId) setDeletingSkill(open ? deletingSkill : null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this skill?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingSkill
                  ? `“${deletingSkill.name}” will be removed from your library and will no longer be available to future builds. This cannot be undone.`
                  : "This skill will be removed from your library."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busySkillId !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void removeSkill();
                }}
                disabled={busySkillId !== null || !deletingSkill}
              >
                {busySkillId === deletingSkill?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Remove skill
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Shell>
    </RequireAuth>
  );
}
