import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Bell, Copy, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPatch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <RequireAuth>
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account, workspace and security.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-card/60 backdrop-blur flex-wrap h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4"><ProfilePanel /></TabsContent>
          <TabsContent value="notifications" className="mt-4"><NotificationsPanel /></TabsContent>
          <TabsContent value="security" className="mt-4"><SecurityPanel /></TabsContent>
        </Tabs>
      </div>
    </Shell>
    </RequireAuth>
  );
}

/* ─── Profile ─────────────────────────────────────────────────────────────── */

function ProfilePanel() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name);
      setEmail((prev) => prev || user.email);
    }
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/users/me/settings", { name, username, bio });
      toast.success("Profile saved");
    } catch {
      // apiPatch already shows toast.error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Building vibes with code" />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>
      <PasswordPanel />
    </div>
  );
}

function PasswordPanel() {
  const { user } = useAuth();
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [vals, setVals] = useState({ current: "", next: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!vals.current || !vals.next) return toast.error("Fill in all fields");
    if (vals.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (vals.next !== vals.confirm) return toast.error("Passwords do not match");
    if (!user?.email) return toast.error("Could not verify your account email");
    setSubmitting(true);
    try {
      // updateUser() alone doesn't re-verify the caller still knows the current
      // password — it just needs a valid session. Confirm it first with a real
      // sign-in attempt before writing the new one.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: vals.current,
      });
      if (reauthError) return toast.error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: vals.next });
      if (error) return toast.error(error.message);
      toast.success("Password updated");
      setVals({ current: "", next: "", confirm: "" });
    } finally {
      setSubmitting(false);
    }
  };
  const field = (key: "current" | "next" | "confirm", label: string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <div className="relative">
        <Input
          id={key}
          type={show[key] ? "text" : "password"}
          value={vals[key]}
          onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
          className="pr-10"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <CardTitle>Password</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Change your account password. Use at least 8 characters.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {field("current", "Current password")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("next", "New password")}
          {field("confirm", "Confirm new password")}
        </div>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Notifications ───────────────────────────────────────────────────────── */

interface NotifSettings {
  email_notifications: boolean;
  build_notifications: boolean;
}

const NOTIF_OPTIONS = [
  { id: "email",     label: "Email notifications",  desc: "Project updates and weekly digest",      apiKey: "email_notifications" as keyof NotifSettings },
  { id: "build",     label: "Build complete",        desc: "When an agent finishes building",        apiKey: "build_notifications" as keyof NotifSettings },
  { id: "browser",   label: "Browser notifications", desc: "Real-time build status alerts",          apiKey: null },
  { id: "credits",   label: "Credit low alerts",     desc: "When you have 10% credits remaining",    apiKey: null },
  { id: "invites",   label: "Team invites",          desc: "When someone invites you to a project",  apiKey: null },
  { id: "marketing", label: "Marketing",             desc: "Product updates and tips",               apiKey: null },
] as const;

const NOTIF_DEFAULTS: Record<string, boolean> = {
  email: true, build: true, browser: false, credits: true, invites: false, marketing: false,
};

function NotificationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>(NOTIF_DEFAULTS);

  useEffect(() => {
    apiGet<Partial<NotifSettings>>("/api/users/me/settings", { silent: true })
      .then((data) => {
        setState((prev) => ({
          ...prev,
          ...(data.email_notifications !== undefined ? { email: data.email_notifications } : {}),
          ...(data.build_notifications  !== undefined ? { build: data.build_notifications  } : {}),
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, value: boolean) => {
    setState((s) => ({ ...s, [id]: value }));

    const opt = NOTIF_OPTIONS.find((o) => o.id === id);
    if (!opt?.apiKey) return; // local-only toggle, no API call needed

    setSaving(true);
    try {
      const patch: Partial<NotifSettings> = {};
      // Always send both mapped fields so state stays consistent
      const emailOpt = NOTIF_OPTIONS.find((o) => o.apiKey === "email_notifications");
      const buildOpt = NOTIF_OPTIONS.find((o) => o.apiKey === "build_notifications");
      patch.email_notifications = id === emailOpt?.id ? value : state[emailOpt?.id ?? "email"];
      patch.build_notifications  = id === buildOpt?.id  ? value : state[buildOpt?.id  ?? "build"];
      await apiPatch("/api/users/me/settings", patch);
      toast.success("Preference saved");
    } catch {
      // toast shown by apiPatch — revert optimistic update
      setState((s) => ({ ...s, [id]: !value }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toast("Test notification", { description: "This is how it will look.", icon: <Bell className="h-4 w-4" /> })}
          >
            <Bell className="h-4 w-4" /> Test
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          NOTIF_OPTIONS.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-transparent px-3 py-3 hover:border-border/50 hover:bg-card/40 transition">
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.desc}</div>
              </div>
              <Switch
                checked={state[o.id]}
                onCheckedChange={(v) => toggle(o.id, v)}
                disabled={saving}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Security ────────────────────────────────────────────────────────────── */

type Severity = "Info" | "Warning" | "Error";
type Category = "Security" | "Billing" | "Project";

interface AuditEntry {
  action: string;
  user: string;
  ip: string;
  time: string;
  severity: Severity;
  category: Category;
}

interface DbAuditRow {
  action: string;
  entity_type: string | null;
  ip_address: string | null;
  severity: string | null;
  created_at: string;
}

function toAuditEntry(row: DbAuditRow, email: string): AuditEntry {
  const sev = (row.severity ?? "info").toLowerCase();
  const severity: Severity =
    sev === "warning" ? "Warning" : sev === "error" || sev === "critical" ? "Error" : "Info";

  const cat = (row.entity_type ?? "").toLowerCase();
  const category: Category =
    /bill|payment|credit|stripe/.test(cat) ? "Billing" :
    /project/.test(cat) ? "Project" : "Security";

  const ms = Date.now() - new Date(row.created_at).getTime();
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const time = h < 1 ? "Just now" : h < 24 ? `${h}h ago` : `${d}d ago`;

  return { action: row.action, user: email, ip: row.ip_address ?? "—", time, severity, category };
}

const sevColor: Record<Severity, string> = {
  Info: "bg-sky-500",
  Warning: "bg-amber-500",
  Error: "bg-red-500",
};

function SecurityPanel() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [auditLog, setAuditLog]   = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError,   setAuditError]   = useState(false);

  useEffect(() => {
    if (!user?.id) { setAuditLoading(false); return; }
    const email = user.email ?? user.id.slice(0, 8);
    supabase
      .from("audit_log")
      .select("action, entity_type, ip_address, severity, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) { setAuditError(true); }
        else { setAuditLog((data as DbAuditRow[] ?? []).map(r => toAuditEntry(r, email))); }
        setAuditLoading(false);
      });
  }, [user?.id]);

  const filtered = auditLog.filter((r) => filter === "All" || r.category === filter);

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
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>

          {auditLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : auditError ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Could not load audit events. Please try again later.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <TwoFactorCard />
    </div>
  );
}

/* ─── 2FA ─────────────────────────────────────────────────────────────────── */

function TwoFactorCard() {
  const { user } = useAuth();
  const [loading,   setLoading]   = useState(true);
  const [factorId,  setFactorId]  = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  // Check current MFA status on mount
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!error && data) {
        const verified = data.totp?.find((f) => f.status === "verified");
        if (verified) setFactorId(verified.id);
      }
      setLoading(false);
    });
  }, []);

  const startSetup = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Lampcode",
      friendlyName: user?.email ?? "account",
    });
    setEnrolling(false);
    if (error) { toast.error(error.message); return; }
    setEnrollData({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    if (!enrollData) return;
    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.id,
      code: code.replace(/\s/g, ""),
    });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    await supabase.auth.refreshSession();
    setFactorId(enrollData.id);
    setEnrollData(null);
    setCode("");
    toast.success("Two-factor authentication enabled");
  };

  const disable = async () => {
    if (!factorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) { toast.error(error.message); return; }
    setFactorId(null);
    setEnrollData(null);
    toast.success("Two-factor authentication disabled");
  };

  const isFullyEnabled = !!factorId && !enrollData;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <p className="text-xs text-muted-foreground">TOTP via authenticator app (Google Authenticator, 1Password, Authy).</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-4">
              <div>
                <div className="text-sm font-medium">Enable 2FA</div>
                <div className="text-xs text-muted-foreground">
                  {isFullyEnabled ? "Active — required at sign-in." : "Off — your account uses password only."}
                </div>
              </div>
              <Switch
                checked={isFullyEnabled}
                onCheckedChange={(v) => {
                  if (!v) { disable(); return; }
                  if (!enrollData) startSetup();
                }}
                disabled={enrolling}
              />
            </div>

            {/* Setup flow: show QR + verify step */}
            {enrollData && (
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="grid aspect-square place-content-center rounded-lg border border-border/60 bg-white p-2">
                  <img src={enrollData.qrCode} alt="2FA QR code" className="h-full w-full" />
                </div>
                <div className="space-y-3">
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Scan the QR code with your authenticator app.</li>
                    <li>Or enter the secret key manually.</li>
                    <li>Enter the 6-digit code below to confirm.</li>
                  </ol>
                  <div className="flex items-center gap-2">
                    <Input value={enrollData.secret} readOnly className="font-mono text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigator.clipboard?.writeText(enrollData.secret); toast("Secret copied"); }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder="123 456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="max-w-[160px] tracking-widest font-mono"
                    />
                    <Button
                      onClick={verify}
                      disabled={verifying || code.replace(/\s/g, "").length !== 6}
                    >
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isFullyEnabled && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                2FA is active on your account.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
