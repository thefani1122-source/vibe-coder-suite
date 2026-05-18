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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import {
  Eye,
  Sparkles,
  BookOpen,
  Compass,
  Layout,
  Server,
  Database,
  Shield,
  Plus,
  Upload,
  Copy,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
          <TabsList className="bg-card/60 backdrop-blur flex-wrap h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
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

          <TabsContent value="general" className="mt-4">
            <GeneralPanel />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <NotificationsPanel />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <SecurityPanel />
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

function GeneralPanel() {
  const [name, setName] = useState("Vibe Coder");
  const [slug, setSlug] = useState("vibe-coder");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6c63ff");
  const [font, setFont] = useState("Inter");
  const [logo, setLogo] = useState<string | null>(null);

  const handleName = (v: string) => {
    setName(v);
    if (!slugTouched) {
      setSlug(
        v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-"),
      );
    }
  };

  const onLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "P";

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle>General</CardTitle>
        <p className="text-xs text-muted-foreground">Branding and identity for this project.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project Name</Label>
              <Input id="proj-name" value={name} onChange={(e) => handleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-slug">Slug</Label>
              <Input
                id="proj-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
              />
              <p className="text-xs text-muted-foreground">
                lampcode.app/p/<span className="text-foreground">{slug || "your-slug"}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-desc">Description</Label>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="min-h-[90px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 p-4 hover:bg-card/60 transition">
                <div className="grid h-14 w-14 place-content-center rounded-full bg-secondary text-sm font-medium overflow-hidden">
                  {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium"><Upload className="h-4 w-4" /> Upload logo</div>
                  <div className="text-xs text-muted-foreground">Drag-drop or click. PNG, JPG up to 2MB.</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogo(e.target.files?.[0])}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proj-color">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="proj-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select value={font} onValueChange={setFont}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Geist">Geist</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button>Save changes</Button>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</Label>
            <div
              className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-lg"
              style={{ fontFamily: font === "System" ? "system-ui" : font }}
            >
              <div className="aspect-video w-full rounded-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }} />
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-content-center rounded-full text-sm font-semibold text-white overflow-hidden"
                  style={{ backgroundColor: color }}
                >
                  {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{name || "Project name"}</div>
                  <div className="truncate text-xs text-muted-foreground">/p/{slug || "your-slug"}</div>
                </div>
              </div>
              {description ? (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const notificationOptions = [
  { id: "email", label: "Email notifications", desc: "Project updates and weekly digest", on: true },
  { id: "browser", label: "Browser notifications", desc: "Real-time build status alerts", on: false },
  { id: "credits", label: "Credit low alerts", desc: "When you have 10% credits remaining", on: true },
  { id: "build", label: "Build complete", desc: "When an agent finishes building", on: true },
  { id: "invites", label: "Team invites", desc: "When someone invites you to a project", on: false },
  { id: "marketing", label: "Marketing", desc: "Product updates and tips", on: false },
];

function NotificationsPanel() {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationOptions.map((o) => [o.id, o.on])),
  );
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Notifications</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Choose what Lampcode pings you about.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            toast("This is how notifications will look.", {
              description: "You can disable any category below.",
              icon: <Bell className="h-4 w-4" />,
            })
          }
        >
          <Bell className="h-4 w-4" /> Test Notification
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {notificationOptions.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-transparent px-3 py-3 hover:border-border/50 hover:bg-card/40 transition"
          >
            <div>
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
            </div>
            <Switch
              checked={state[o.id]}
              onCheckedChange={(v) => setState((s) => ({ ...s, [o.id]: v }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type Severity = "Info" | "Warning" | "Error";
type Category = "Security" | "Billing" | "Project";

const auditLog: { action: string; user: string; ip: string; time: string; severity: Severity; category: Category }[] = [
  { action: "Project Created", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "2 hours ago", severity: "Info", category: "Project" },
  { action: "API Key Generated", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "5 hours ago", severity: "Warning", category: "Security" },
  { action: "Payment Method Updated", user: "vibe@lampcode.dev", ip: "10.0.0.5", time: "1 day ago", severity: "Info", category: "Billing" },
  { action: "Failed Login Attempt", user: "unknown", ip: "203.0.113.42", time: "2 days ago", severity: "Error", category: "Security" },
  { action: "Plan Upgraded", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "3 days ago", severity: "Info", category: "Billing" },
  { action: "Project Renamed", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "4 days ago", severity: "Info", category: "Project" },
];

const sevColor: Record<Severity, string> = {
  Info: "bg-sky-500",
  Warning: "bg-amber-500",
  Error: "bg-red-500",
};

function SecurityPanel() {
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [twoFA, setTwoFA] = useState(false);
  const [keys, setKeys] = useState([
    { id: "1", name: "Production", prefix: "lc_live_a1b2", created: "Mar 12, 2026", lastUsed: "2 hours ago" },
    { id: "2", name: "CI Pipeline", prefix: "lc_ci_x9y8", created: "Feb 28, 2026", lastUsed: "Yesterday" },
    { id: "3", name: "Local Dev", prefix: "lc_dev_q4w5", created: "Jan 14, 2026", lastUsed: "5 days ago" },
  ]);
  const backupCodes = useMemo(
    () => Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6)),
    [twoFA],
  );

  const filtered = auditLog.filter((r) => filter === "All" || r.category === filter);

  const regenerate = (id: string) => {
    setKeys((ks) =>
      ks.map((k) =>
        k.id === id ? { ...k, prefix: "lc_new_" + Math.random().toString(36).slice(2, 6), lastUsed: "just now" } : k,
      ),
    );
    toast.success("API key regenerated");
  };

  const revoke = (id: string) => {
    setKeys((ks) => ks.filter((k) => k.id !== id));
    toast.success("API key revoked");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <p className="text-xs text-muted-foreground">Recent activity across your account.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["All", "Security", "Billing", "Project"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.action}</TableCell>
                    <TableCell className="text-muted-foreground">{r.user}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.ip}</TableCell>
                    <TableCell className="text-muted-foreground">{r.time}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", sevColor[r.severity])} />
                        <span className="text-xs">{r.severity}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <p className="text-xs text-muted-foreground">Use these to authenticate against the Lampcode API.</p>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setKeys((ks) => [
                ...ks,
                {
                  id: Math.random().toString(36).slice(2),
                  name: "New Key",
                  prefix: "lc_new_" + Math.random().toString(36).slice(2, 6),
                  created: "Just now",
                  lastUsed: "—",
                },
              ]);
              toast.success("New API key generated");
            }}
          >
            <Plus className="h-4 w-4" /> Generate New Key
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 divide-y divide-border/60">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{k.name}</div>
                    <Badge variant="secondary" className="font-mono text-[10px]">{k.prefix}****</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {k.created} · Last used {k.lastUsed}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => { navigator.clipboard?.writeText(k.prefix); toast("Prefix copied"); }}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => regenerate(k.id)}>Regenerate</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10">
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately disable <span className="font-mono">{k.prefix}****</span>. Any service using it will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revoke(k.id)}
                          className="bg-red-600 hover:bg-red-600/90 text-white"
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {keys.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No API keys yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <p className="text-xs text-muted-foreground">Add a second layer of security at sign-in.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-4">
            <div>
              <div className="text-sm font-medium">Enable 2FA</div>
              <div className="text-xs text-muted-foreground">Use an authenticator app like 1Password or Authy.</div>
            </div>
            <Switch checked={twoFA} onCheckedChange={setTwoFA} />
          </div>
          {twoFA ? (
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              <div className="grid place-content-center aspect-square rounded-lg border border-border/60 bg-[repeating-conic-gradient(#0a0a0b_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                <span className="rounded bg-background/80 px-2 py-1 text-xs">QR code</span>
              </div>
              <div className="space-y-3">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Scan the QR code with your authenticator app.</li>
                  <li>Enter the 6-digit code to confirm setup.</li>
                  <li>Save your backup codes somewhere safe.</li>
                </ol>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Backup codes</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-[#0a0a0b] p-3 font-mono text-xs">
                    {backupCodes.map((c) => (
                      <span key={c} className="text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Enter 6-digit code" className="max-w-[200px]" />
                  <Button>Verify</Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
