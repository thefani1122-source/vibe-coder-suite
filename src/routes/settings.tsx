import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Eye, Sparkles, BookOpen, Compass, Layout, Server, Database, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const instructionTypes = [
  { id: "general", label: "General", icon: BookOpen, placeholder: "Describe your tech stack, code style, and design preferences..." },
  { id: "planning", label: "Planning Agent", icon: Compass, placeholder: "Specific instructions for this agent..." },
  { id: "frontend", label: "Frontend Agent", icon: Layout, placeholder: "Specific instructions for this agent..." },
  { id: "backend", label: "Backend Agent", icon: Server, placeholder: "Specific instructions for this agent..." },
  { id: "database", label: "Database Agent", icon: Database, placeholder: "Specific instructions for this agent..." },
  { id: "security", label: "Security Agent", icon: Shield, placeholder: "Specific instructions for this agent..." },
];

function SettingsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-card/60 backdrop-blur">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Display name</Label><Input id="name" defaultValue="Vibe Coder" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" defaultValue="vibe@lampcode.dev" /></div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Email notifications</div><div className="text-xs text-muted-foreground">Project updates & weekly digest.</div></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Beta features</div><div className="text-xs text-muted-foreground">Try experimental vibes early.</div></div><Switch /></div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="instructions" className="mt-4">
            <InstructionsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function InstructionsPanel() {
  const [active, setActive] = useState(instructionTypes[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const current = instructionTypes.find((t) => t.id === active)!;

  return (
    <Card className="border-border/60 bg-[#0a0a0b]/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Instructions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Guide how Lampcode AI builds for you.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-[#0a0a0b] border-border/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> How instructions shape AI output
              </DialogTitle>
              <DialogDescription>
                Your instructions are injected into every agent prompt for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><span className="text-foreground font-medium">General</span> applies to every agent — tech stack, code style, design preferences and global rules.</p>
              <p><span className="text-foreground font-medium">Planning Agent</span> shapes how the AI breaks features into steps before coding.</p>
              <p><span className="text-foreground font-medium">Frontend Agent</span> guides UI components, layout patterns and styling decisions.</p>
              <p><span className="text-foreground font-medium">Backend Agent</span> defines server-side patterns, error handling and API conventions.</p>
              <p><span className="text-foreground font-medium">Database Agent</span> sets schema conventions, naming, indexes and RLS defaults.</p>
              <p><span className="text-foreground font-medium">Security Agent</span> enforces auth, validation and secret-handling rules.</p>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-foreground">
                Be specific. "Use Tailwind v4 with OKLCH tokens" beats "make it pretty".
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-2">
            {instructionTypes.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{current.label} instructions</Label>
              <span className="text-xs text-muted-foreground">Markdown supported</span>
            </div>
            <Textarea
              key={current.id}
              value={values[current.id] ?? ""}
              onChange={(e) => setValues({ ...values, [current.id]: e.target.value })}
              placeholder={current.placeholder}
              className="min-h-[320px] resize-none bg-[#0a0a0b] font-mono text-sm leading-relaxed border-border/60"
            />
            <div className="flex justify-end">
              <Button className="bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
                Save instructions
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
