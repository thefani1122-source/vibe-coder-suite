import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
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
import { Bell, Copy, Github, Plug, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
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
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4"><ProfilePanel /></TabsContent>
          <TabsContent value="notifications" className="mt-4"><NotificationsPanel /></TabsContent>
          <TabsContent value="integrations" className="mt-4"><IntegrationsPanel /></TabsContent>
          <TabsContent value="security" className="mt-4"><SecurityPanel /></TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function ProfilePanel() {
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="name">Display name</Label><Input id="name" defaultValue="Vibe Coder" /></div>
            <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" defaultValue="vibecoder" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" defaultValue="vibe@lampcode.dev" /></div>
          <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Input id="bio" placeholder="Building vibes with code" /></div>
          <Button onClick={() => toast.success("Profile saved")}>Save changes</Button>
        </CardContent>
      </Card>
      <PasswordPanel />
    </div>
  );
}

function PasswordPanel() {
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [vals, setVals] = useState({ current: "", next: "", confirm: "" });
  const submit = () => {
    if (!vals.current || !vals.next) return toast.error("Fill in all fields");
    if (vals.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (vals.next !== vals.confirm) return toast.error("Passwords do not match");
    toast.success("Password updated");
    setVals({ current: "", next: "", confirm: "" });
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
        <Button onClick={submit}>Update password</Button>
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
        <CardTitle>Notifications</CardTitle>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => toast("Test notification", { description: "This is how it will look.", icon: <Bell className="h-4 w-4" /> })}>
          <Bell className="h-4 w-4" /> Test
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {notificationOptions.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-lg border border-transparent px-3 py-3 hover:border-border/50 hover:bg-card/40 transition">
            <div>
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
            </div>
            <Switch checked={state[o.id]} onCheckedChange={(v) => setState((s) => ({ ...s, [o.id]: v }))} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const integrations = [
  { id: "github", label: "GitHub", desc: "Sync your projects to a repo", icon: Github, connected: true },
  { id: "vercel", label: "Vercel", desc: "Deploy your apps", icon: Plug, connected: false },
  { id: "supabase", label: "Supabase", desc: "Managed backend & auth", icon: Plug, connected: true },
  { id: "stripe", label: "Stripe", desc: "Accept payments", icon: Plug, connected: false },
];

function IntegrationsPanel() {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {integrations.map((i) => {
          const Icon = i.icon;
          return (
            <div key={i.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-content-center rounded-md bg-secondary"><Icon className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-medium">{i.label}</div>
                  <div className="text-xs text-muted-foreground">{i.desc}</div>
                </div>
              </div>
              <Button size="sm" variant={i.connected ? "outline" : "default"}>{i.connected ? "Disconnect" : "Connect"}</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------- Security ----------------

type Severity = "Info" | "Warning" | "Error";
type Category = "Security" | "Billing" | "Project";

const auditLog: { action: string; user: string; ip: string; time: string; severity: Severity; category: Category }[] = [
  { action: "Project Created", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "2 hours ago", severity: "Info", category: "Project" },
  { action: "API Key Used", user: "vibe@lampcode.dev", ip: "192.168.1.24", time: "5 hours ago", severity: "Info", category: "Security" },
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

      <TwoFactorCard />
    </div>
  );
}

function TwoFactorCard() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("lampcode_2fa_secret");
  });
  const [secret, setSecret] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Start setup flow
  const startSetup = async () => {
    const s = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: "Lampcode",
      label: "vibe@lampcode.dev",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: s,
    });
    const url = totp.toString();
    setSecret(s.base32);
    setOtpauthUrl(url);
    setQrUrl(await QRCode.toDataURL(url, { margin: 1, width: 220 }));
  };

  useEffect(() => {
    // If toggled on and we don't have a stored secret yet, kick off setup
    if (enabled && !secret && !localStorage.getItem("lampcode_2fa_secret")) {
      startSetup();
    }
  }, [enabled, secret]);

  const verify = () => {
    if (!secret) return;
    const totp = new OTPAuth.TOTP({
      issuer: "Lampcode",
      label: "vibe@lampcode.dev",
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
    if (delta === null) {
      toast.error("Invalid code. Try the next one from your app.");
      return;
    }
    localStorage.setItem("lampcode_2fa_secret", secret);
    toast.success("Two-factor authentication enabled");
    setSecret(null);
    setQrUrl(null);
    setOtpauthUrl(null);
    setCode("");
  };

  const disable = () => {
    localStorage.removeItem("lampcode_2fa_secret");
    setEnabled(false);
    setSecret(null);
    setQrUrl(null);
    setOtpauthUrl(null);
    toast.success("Two-factor authentication disabled");
  };

  const stored = typeof window !== "undefined" ? localStorage.getItem("lampcode_2fa_secret") : null;
  const isFullyEnabled = enabled && !!stored && !secret;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <p className="text-xs text-muted-foreground">TOTP via authenticator app (Google Authenticator, 1Password, Authy).</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-4">
          <div>
            <div className="text-sm font-medium">Enable 2FA</div>
            <div className="text-xs text-muted-foreground">
              {isFullyEnabled ? "Active — required at sign-in." : "Off — your account uses password only."}
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              if (!v) { disable(); return; }
              setEnabled(true);
            }}
          />
        </div>

        {enabled && !isFullyEnabled ? (
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="grid place-content-center aspect-square rounded-lg border border-border/60 bg-white p-2">
              {qrUrl ? <img src={qrUrl} alt="2FA QR code" className="h-full w-full" /> : <span className="text-xs text-muted-foreground">Generating…</span>}
            </div>
            <div className="space-y-3">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Scan the QR code with your authenticator app.</li>
                <li>Or enter the secret manually.</li>
                <li>Enter the 6-digit code below to confirm.</li>
              </ol>
              {secret ? (
                <div className="flex items-center gap-2">
                  <Input value={secret} readOnly className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(secret); toast("Secret copied"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="123 456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="max-w-[160px] tracking-widest font-mono"
                />
                <Button onClick={verify} disabled={code.replace(/\s/g, "").length !== 6}>Verify & enable</Button>
              </div>
              {otpauthUrl ? <p className="break-all text-[10px] text-muted-foreground">{otpauthUrl}</p> : null}
            </div>
          </div>
        ) : null}

        {isFullyEnabled ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            2FA is active on your account.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
