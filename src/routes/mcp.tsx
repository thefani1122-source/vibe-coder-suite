import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/mcp")({ component: McpPage });

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ProviderType = "deploy" | "database" | "code" | "payment" | "email" | "analytics" | "auth" | "ai";

interface IntegrationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  provider: string;
  provider_type: ProviderType;
  connection_type: "mcp" | "oauth" | "api_key";
  config: Record<string, string>;
  status: "connected" | "disconnected" | "error" | "refreshing";
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

type ConnectMode = "supabase_form" | "coming_soon";
type Category = "Deploy" | "Database" | "Design" | "AI Tools" | "Dev Tools" | "Productivity";

interface McpDef {
  name: string;
  desc: string;
  category: Category;
  emoji: string;
  provider: string;          // lowercase key stored in DB
  providerType: ProviderType;
  connectMode: ConnectMode;
}

/* ─── Static server catalogue ────────────────────────────────────────────── */

const SERVERS: McpDef[] = [
  { name: "Vercel",        desc: "Deploy and manage your apps on Vercel's global edge network.", category: "Deploy",       emoji: "▲",  provider: "vercel",      providerType: "deploy",   connectMode: "coming_soon" },
  { name: "Netlify",       desc: "One-click deploys with previews and serverless functions.",    category: "Deploy",       emoji: "◆",  provider: "netlify",     providerType: "deploy",   connectMode: "coming_soon" },
  { name: "Railway",       desc: "Deploy backends, databases, and cron jobs in minutes.",        category: "Deploy",       emoji: "🚂", provider: "railway",     providerType: "deploy",   connectMode: "coming_soon" },
  { name: "Cloudflare",    desc: "Workers, R2 storage, and global CDN at the edge.",             category: "Deploy",       emoji: "☁︎", provider: "cloudflare",  providerType: "deploy",   connectMode: "coming_soon" },

  { name: "Supabase",      desc: "Provision Postgres databases with auth, storage and RLS.",     category: "Database",     emoji: "⚡", provider: "supabase",    providerType: "database", connectMode: "supabase_form" },
  { name: "Neon",          desc: "Serverless Postgres with branching for every PR.",             category: "Database",     emoji: "🌿", provider: "neon",        providerType: "database", connectMode: "coming_soon" },
  { name: "PlanetScale",   desc: "Serverless MySQL with branching workflows.",                   category: "Database",     emoji: "🪐", provider: "planetscale", providerType: "database", connectMode: "coming_soon" },
  { name: "MongoDB Atlas", desc: "Managed document database with global clusters.",              category: "Database",     emoji: "🍃", provider: "mongodb",     providerType: "database", connectMode: "coming_soon" },

  { name: "Figma",         desc: "Pull designs, components and tokens straight from Figma.",    category: "Design",       emoji: "🎨", provider: "figma",       providerType: "code",     connectMode: "coming_soon" },
  { name: "Framer",        desc: "Import animated layouts and components from Framer.",         category: "Design",       emoji: "✦",  provider: "framer",      providerType: "code",     connectMode: "coming_soon" },

  { name: "OpenAI",             desc: "GPT, embeddings, and vision tools for your agents.",                    category: "AI Tools",     emoji: "✺",  provider: "openai",           providerType: "ai",   connectMode: "coming_soon" },
  { name: "Anthropic",          desc: "Claude models for long-context reasoning.",                             category: "AI Tools",     emoji: "✶",  provider: "anthropic",        providerType: "ai",   connectMode: "coming_soon" },
  { name: "Sequential Thinking",desc: "Step-by-step reasoning helper for complex tasks.",                     category: "AI Tools",     emoji: "🧠", provider: "sequential_think", providerType: "ai",   connectMode: "coming_soon" },
  { name: "Context7",           desc: "Up-to-date library docs piped right into the agent.",                  category: "AI Tools",     emoji: "📚", provider: "context7",         providerType: "ai",   connectMode: "coming_soon" },

  { name: "GitHub",   desc: "Read repos, open PRs, and manage issues from chat.",    category: "Dev Tools",    emoji: "",  provider: "github",   providerType: "code", connectMode: "coming_soon" },
  { name: "GitLab",   desc: "Repos, MRs, CI pipelines and registries.",             category: "Dev Tools",    emoji: "🦊", provider: "gitlab",   providerType: "code", connectMode: "coming_soon" },
  { name: "Sentry",   desc: "Track errors and performance across your stack.",       category: "Dev Tools",    emoji: "🛡",  provider: "sentry",   providerType: "code", connectMode: "coming_soon" },
  { name: "PostHog",  desc: "Product analytics, feature flags, and session replay.", category: "Dev Tools",    emoji: "📊", provider: "posthog",  providerType: "analytics", connectMode: "coming_soon" },

  { name: "Linear",  desc: "Read and update issues, projects and cycles.", category: "Productivity", emoji: "📐", provider: "linear",  providerType: "code",    connectMode: "coming_soon" },
  { name: "Notion",  desc: "Search pages, append blocks and create databases.", category: "Productivity", emoji: "📝", provider: "notion",  providerType: "code",    connectMode: "coming_soon" },
  { name: "Slack",   desc: "Post messages and read channels for context.", category: "Productivity", emoji: "💬", provider: "slack",   providerType: "code",    connectMode: "coming_soon" },
  { name: "Stripe",  desc: "Create payments, subscriptions and customer portals.", category: "Productivity", emoji: "💳", provider: "stripe",  providerType: "payment", connectMode: "coming_soon" },
];

const CATEGORIES = ["All", "Deploy", "Database", "Design", "AI Tools", "Dev Tools", "Productivity"] as const;

/* ─── Page ────────────────────────────────────────────────────────────────── */

function McpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loadingRows, setLoadingRows] = useState(true);
  // Keyed by provider string (lowercase)
  const [rows, setRows] = useState<Record<string, IntegrationRow>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  // Supabase connection comes from the BACKEND (user_integrations via the MCP
  // server), not the local `integrations` table — its PAT is encrypted server
  // side and verified against https://mcp.supabase.com/mcp.
  const [supa, setSupa] = useState<{ id: string; projectRef: string | null; supabaseUrl: string | null } | null>(null);

  const loadSupabase = async () => {
    try {
      const res = await apiGet<{ integrations: Array<{ id: string; provider: string; status: string; meta: { supabaseUrl: string | null; projectRef: string | null } }> }>(
        "/api/integrations",
        { silent: true },
      );
      const row = res.integrations.find((i) => i.provider === "supabase" && i.status === "connected");
      setSupa(row ? { id: row.id, projectRef: row.meta.projectRef, supabaseUrl: row.meta.supabaseUrl } : null);
    } catch {
      /* not connected / not signed in */
    }
  };
  useEffect(() => { if (user?.id) void loadSupabase(); }, [user?.id]);

  const connectSupabaseMcp = async (accessToken: string, projectRef: string) => {
    const res = await apiPost<{ toolCount: number; supabaseUrl: string | null; anonKeyResolved: boolean }>(
      "/api/integrations/supabase/mcp",
      { accessToken, projectRef: projectRef || undefined },
      { silent: true },
    );
    await loadSupabase();
    return res;
  };

  const disconnectSupabaseMcp = async () => {
    if (!supa) return;
    await apiDelete(`/api/integrations/${supa.id}`, { silent: true });
    setSupa(null);
    toast.success("Supabase disconnected");
  };

  // Load all MCP integrations for this user from the DB
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("connection_type", "mcp")
      .then(({ data, error }) => {
        if (error) { console.error("[mcp] load error", error); }
        else {
          const map: Record<string, IntegrationRow> = {};
          for (const row of (data ?? []) as IntegrationRow[]) {
            map[row.provider] = row;
          }
          setRows(map);
        }
        setLoadingRows(false);
      });
  }, [user?.id]);

  // Upsert a row (insert or update config + status → connected)
  const connectMcp = async (def: McpDef, config: Record<string, string>) => {
    if (!user?.id) return;
    const existing = rows[def.provider];
    if (existing) {
      const { data, error } = await supabase
        .from("integrations")
        .update({ status: "connected", config, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      setRows(r => ({ ...r, [def.provider]: data as IntegrationRow }));
    } else {
      const { data, error } = await supabase
        .from("integrations")
        .insert({
          user_id: user.id,
          provider: def.provider,
          provider_type: def.providerType,
          connection_type: "mcp",
          status: "connected",
          config,
        })
        .select()
        .single();
      if (error) throw error;
      setRows(r => ({ ...r, [def.provider]: data as IntegrationRow }));
    }
  };

  const disconnectMcp = async (provider: string) => {
    const existing = rows[provider];
    if (!existing) return;
    const { data, error } = await supabase
      .from("integrations")
      .update({ status: "disconnected", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { toast.error("Failed to disconnect"); return; }
    setRows(r => ({ ...r, [provider]: data as IntegrationRow }));
    toast.success(`${provider} disconnected`);
  };

  const filtered = (cat: string) =>
    SERVERS.filter(
      (s) =>
        (cat === "All" || s.category === cat) &&
        (s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.desc.toLowerCase().includes(query.toLowerCase())),
    );

  const addCustom = () => {
    if (!customName.trim() || !customUrl.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    toast.success(`${customName} added to your MCP servers`);
    setCustomName(""); setCustomUrl(""); setCustomDesc("");
    setCustomOpen(false);
  };

  const connectedCount = Object.values(rows).filter(r => r.status === "connected").length;

  return (
    <RequireAuth>
      <Shell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">MCP Store</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {SERVERS.length} integrations available
                {connectedCount > 0 && ` — ${connectedCount} connected`}
              </p>
            </div>
            <Dialog open={customOpen} onOpenChange={setCustomOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
                  <Plus className="h-4 w-4" /> Custom MCP
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Add Custom MCP Server
                  </DialogTitle>
                  <DialogDescription>Bring your own Model Context Protocol server.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-name">Name</Label>
                    <Input id="mcp-name" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="My MCP" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-url">Server URL</Label>
                    <Input id="mcp-url" value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://my-mcp.example.com/mcp" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-desc">Description (optional)</Label>
                    <Textarea id="mcp-desc" value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="What does this MCP do?" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addCustom} className="w-full">Add MCP</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search MCPs..."
              className="pl-9 bg-card/60 border-border/60 backdrop-blur"
            />
          </div>

          <Tabs defaultValue="All" className="w-full">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card/60 backdrop-blur h-auto p-1">
              {CATEGORIES.map(c => (
                <TabsTrigger key={c} value={c} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(c => (
              <TabsContent key={c} value={c} className="mt-4">
                {loadingRows ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered(c).map(s =>
                        s.provider === "supabase" ? (
                          <SupabaseMcpCard
                            key={s.name}
                            def={s}
                            connected={supa}
                            onConnect={connectSupabaseMcp}
                            onDisconnect={disconnectSupabaseMcp}
                          />
                        ) : (
                          <McpCard
                            key={s.name}
                            def={s}
                            row={rows[s.provider] ?? null}
                            onConnect={connectMcp}
                            onDisconnect={disconnectMcp}
                          />
                        ),
                      )}
                    </div>
                    {filtered(c).length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                        No MCPs match your search.
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Shell>
    </RequireAuth>
  );
}

/* ─── MCP Card ────────────────────────────────────────────────────────────── */

function McpCard({
  def,
  row,
  onConnect,
  onDisconnect,
}: {
  def: McpDef;
  row: IntegrationRow | null;
  onConnect: (def: McpDef, config: Record<string, string>) => Promise<void>;
  onDisconnect: (provider: string) => Promise<void>;
}) {
  const isConnected = row?.status === "connected";
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await onDisconnect(def.provider);
    setDisconnecting(false);
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-lg">
            {def.emoji}
          </div>
          <div>
            <div className="font-semibold leading-tight">{def.name}</div>
            <div className="text-xs text-muted-foreground">{def.category}</div>
          </div>
        </div>
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className={isConnected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
        >
          {isConnected ? "● Connected" : "Available"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{def.desc}</p>

      {isConnected ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-auto w-full"
          disabled={disconnecting}
          onClick={handleDisconnect}
        >
          {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="default"
          className="mt-auto w-full"
          onClick={() => toast(`${def.name} MCP — launching soon!`, { description: "We're building OAuth flows for all providers." })}
        >
          Connect
        </Button>
      )}
    </div>
  );
}

/* ─── Supabase MCP card (backend-wired, PAT-based) ────────────────────────── */

function SupabaseMcpCard({
  def,
  connected,
  onConnect,
  onDisconnect,
}: {
  def: McpDef;
  connected: { id: string; projectRef: string | null; supabaseUrl: string | null } | null;
  onConnect: (accessToken: string, projectRef: string) => Promise<{ toolCount: number; anonKeyResolved: boolean }>;
  onDisconnect: () => Promise<void>;
}) {
  const isConnected = !!connected;
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) { toast.error("Access token is required"); return; }
    setSaving(true);
    try {
      const res = await onConnect(token.trim(), projectRef.trim());
      setToken(""); setProjectRef("");
      setOpen(false);
      toast.success(`Supabase connected — ${res.toolCount} MCP tools available${res.anonKeyResolved ? ", preview keys resolved" : ""}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try { await onDisconnect(); } finally { setBusy(false); }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-lg">{def.emoji}</div>
          <div>
            <div className="font-semibold leading-tight">{def.name}</div>
            <div className="text-xs text-muted-foreground">{def.category}</div>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
          {isConnected ? "● Connected" : "Available"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{def.desc}</p>
      {isConnected && connected?.supabaseUrl && (
        <p className="truncate text-xs text-muted-foreground/70">{connected.supabaseUrl}</p>
      )}

      {isConnected ? (
        <Button size="sm" variant="outline" className="mt-auto w-full" disabled={busy} onClick={handleDisconnect}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" className="mt-auto w-full">Connect</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><span className="text-lg">⚡</span> Connect Supabase</DialogTitle>
              <DialogDescription>
                Paste a Supabase Personal Access Token. We verify it against Supabase's MCP server and your apps run on your own database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sb-pat">Personal Access Token</Label>
                <Input id="sb-pat" type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="sbp_..." />
                <p className="text-xs text-muted-foreground">
                  Create one at Supabase → Account → <span className="font-medium text-foreground/70">Access Tokens</span>.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sb-ref">Project Ref (recommended)</Label>
                <Input id="sb-ref" value={projectRef} onChange={e => setProjectRef(e.target.value)} placeholder="abcdefghijklmnop" />
                <p className="text-xs text-muted-foreground">
                  The 20-char ref in your project URL (https://<span className="font-medium text-foreground/70">&lt;ref&gt;</span>.supabase.co). Lets us scope tools + fetch your anon key for previews.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300/80">
                Your token is encrypted on our server and never sent to the browser, the AI, or the preview sandbox. Only your project's public anon key is used in previews.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !token.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
