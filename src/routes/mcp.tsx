import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sparkles, Loader2, ArrowLeft, Check, ShieldCheck, Zap, Lightbulb, Info } from "lucide-react";
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

type ConnectMode = "supabase_form" | "backend_form" | "coming_soon";
type Category = "Deploy" | "Database" | "Design" | "AI Tools" | "Dev Tools" | "Productivity";

interface ProviderField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  optional?: boolean;
  help?: string;
}

interface McpDef {
  name: string;
  desc: string;
  category: Category;
  emoji: string;
  provider: string;          // lowercase key stored in DB
  providerType: ProviderType;
  connectMode: ConnectMode;
  fields?: ProviderField[];  // for backend_form providers
  features?: string[];       // shown on the detail page
}

/* ─── Static server catalogue ────────────────────────────────────────────── */

const SERVERS: McpDef[] = [
  { name: "Vercel",        desc: "Deploy and manage your apps on Vercel's global edge network.", category: "Deploy",       emoji: "▲",  provider: "vercel",      providerType: "deploy",   connectMode: "coming_soon",
    features: ["One-click deploys from Git", "Preview URLs for every branch", "Serverless & edge functions", "Global CDN with instant rollback"] },
  { name: "Netlify",       desc: "One-click deploys with previews and serverless functions.",    category: "Deploy",       emoji: "◆",  provider: "netlify",     providerType: "deploy",   connectMode: "coming_soon",
    features: ["Continuous deploys from Git", "Deploy previews per PR", "Edge functions & forms", "Custom domains with HTTPS"] },
  { name: "Railway",       desc: "Deploy backends, databases, and cron jobs in minutes.",        category: "Deploy",       emoji: "🚂", provider: "railway",     providerType: "deploy",   connectMode: "coming_soon",
    features: ["Backend & worker hosting", "Managed Postgres / Redis", "Scheduled cron jobs", "Env vars & secrets management"] },
  { name: "Cloudflare",    desc: "Workers, R2 storage, and global CDN at the edge.",             category: "Deploy",       emoji: "☁︎", provider: "cloudflare",  providerType: "deploy",   connectMode: "coming_soon",
    features: ["Workers at the edge", "R2 object storage", "KV & D1 databases", "DNS, CDN and DDoS protection"] },

  { name: "Supabase",      desc: "Provision Postgres databases with auth, storage and RLS.",     category: "Database",     emoji: "⚡", provider: "supabase",    providerType: "database", connectMode: "supabase_form" },
  { name: "Neon",          desc: "Serverless Postgres with branching for every PR.",             category: "Database",     emoji: "🌿", provider: "neon",        providerType: "database", connectMode: "coming_soon",
    features: ["Serverless Postgres", "Branch a DB like Git", "Autoscaling compute", "Bottomless storage"] },
  { name: "PlanetScale",   desc: "Serverless MySQL with branching workflows.",                   category: "Database",     emoji: "🪐", provider: "planetscale", providerType: "database", connectMode: "coming_soon",
    features: ["MySQL-compatible at scale", "Schema branching & deploy requests", "Non-blocking schema changes", "Global read replicas"] },
  { name: "MongoDB Atlas", desc: "Managed document database with global clusters.",              category: "Database",     emoji: "🍃", provider: "mongodb",     providerType: "database", connectMode: "coming_soon",
    features: ["Managed document DB", "Global, multi-region clusters", "Atlas Search & Vector Search", "Built-in backups & monitoring"] },

  { name: "Figma",         desc: "Pull designs, components and tokens straight from Figma.",    category: "Design",       emoji: "🎨", provider: "figma",       providerType: "code",     connectMode: "coming_soon",
    features: ["Import frames as components", "Sync design tokens & variables", "Export images & SVG assets", "Read comments and selections"] },
  { name: "Framer",        desc: "Import animated layouts and components from Framer.",         category: "Design",       emoji: "✦",  provider: "framer",      providerType: "code",     connectMode: "coming_soon",
    features: ["Import Framer layouts", "Animated component presets", "CMS collections sync", "Responsive breakpoints"] },

  { name: "OpenAI",             desc: "GPT, embeddings, and vision tools for your agents.",                    category: "AI Tools",     emoji: "✺",  provider: "openai",           providerType: "ai",   connectMode: "coming_soon",
    features: ["GPT chat & completions", "Embeddings for search/RAG", "Vision & image generation", "Function & tool calling"] },
  { name: "Anthropic",          desc: "Claude models for long-context reasoning.",                             category: "AI Tools",     emoji: "✶",  provider: "anthropic",        providerType: "ai",   connectMode: "coming_soon",
    features: ["Claude Sonnet & Opus models", "200K+ token context", "Tool use & JSON mode", "Vision input support"] },
  { name: "Sequential Thinking",desc: "Step-by-step reasoning helper for complex tasks.",                     category: "AI Tools",     emoji: "🧠", provider: "sequential_think", providerType: "ai",   connectMode: "coming_soon",
    features: ["Structured chain-of-thought", "Plan / act / reflect loop", "Branch & revise reasoning", "Better multi-step accuracy"] },
  { name: "Context7",           desc: "Up-to-date library docs piped right into the agent.",                  category: "AI Tools",     emoji: "📚", provider: "context7",         providerType: "ai",   connectMode: "coming_soon",
    features: ["Live docs for popular libs", "Version-aware snippets", "Fewer hallucinated APIs", "Cited code references"] },

  { name: "GitHub",   desc: "Read repos, open PRs, and manage issues from chat.",    category: "Dev Tools",    emoji: "",  provider: "github",   providerType: "code", connectMode: "coming_soon",
    features: ["Read repos & files", "Open & review pull requests", "Create and triage issues", "Manage Actions workflows"] },
  { name: "GitLab",   desc: "Repos, MRs, CI pipelines and registries.",             category: "Dev Tools",    emoji: "🦊", provider: "gitlab",   providerType: "code", connectMode: "coming_soon",
    features: ["Repo & merge request access", "CI/CD pipeline triggers", "Issue tracking", "Container & package registries"] },
  { name: "Sentry",   desc: "Track errors and performance across your stack.",       category: "Dev Tools",    emoji: "🛡",  provider: "sentry",   providerType: "code", connectMode: "coming_soon",
    features: ["Real-time error tracking", "Performance & traces", "Release health & alerts", "Source-mapped stack traces"] },
  { name: "PostHog",  desc: "Product analytics, feature flags, and session replay.", category: "Dev Tools",    emoji: "📊", provider: "posthog",  providerType: "analytics", connectMode: "coming_soon",
    features: ["Product analytics events", "Feature flags & A/B tests", "Session replay", "Funnels & retention"] },

  { name: "Linear",  desc: "Read and update issues, projects and cycles.", category: "Productivity", emoji: "📐", provider: "linear",  providerType: "code",    connectMode: "coming_soon",
    features: ["Read & create issues", "Update cycles and projects", "Comment from chat", "Triage by team / label"] },
  { name: "Notion",  desc: "Search pages, append blocks and create databases.", category: "Productivity", emoji: "📝", provider: "notion",  providerType: "code",    connectMode: "coming_soon",
    features: ["Search across pages", "Append & edit blocks", "Create databases & rows", "Use docs as agent context"] },
  { name: "Slack",   desc: "Post messages and read channels for context.", category: "Productivity", emoji: "💬", provider: "slack",   providerType: "code",    connectMode: "coming_soon",
    features: ["Post to channels & DMs", "Read recent messages", "React & thread replies", "Trigger workflows on events"] },
  { name: "Stripe",  desc: "Create payments, subscriptions and customer portals.", category: "Productivity", emoji: "💳", provider: "stripe",  providerType: "payment", connectMode: "coming_soon",
    features: ["Checkout & payment links", "Subscriptions & invoicing", "Customer portal", "Webhooks for events"] },

  // ── Live, backend-wired provider integrations ──────────────────────────────
  {
    name: "WordPress", desc: "Read/write posts, pages, media & WooCommerce via the WordPress REST API.",
    category: "Productivity", emoji: "📝", provider: "wordpress", providerType: "code", connectMode: "backend_form",
    features: ["Posts & pages (get/create)", "Media library", "WooCommerce products & orders", "Application-password auth"],
    fields: [
      { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://myblog.com" },
      { key: "username", label: "Username", type: "text", placeholder: "admin" },
      { key: "appPassword", label: "Application Password", type: "password", placeholder: "xxxx xxxx xxxx xxxx", help: "WP Admin → Users → Profile → Application Passwords." },
    ],
  },
  {
    name: "Shopify", desc: "Products, carts & checkout (Storefront) + orders & webhooks (Admin).",
    category: "Database", emoji: "🛍️", provider: "shopify", providerType: "database", connectMode: "backend_form",
    features: ["Product catalog", "Cart & checkout", "Orders (Admin token)", "Webhooks"],
    fields: [
      { key: "shopDomain", label: "Shop Domain", type: "text", placeholder: "my-store.myshopify.com" },
      { key: "storefrontAccessToken", label: "Storefront Access Token", type: "password", placeholder: "shpsa_..." },
      { key: "adminApiAccessToken", label: "Admin API Token (optional)", type: "password", placeholder: "shpat_...", optional: true, help: "Needed for orders & webhooks." },
    ],
  },
  {
    name: "Make.com", desc: "Trigger Make scenarios (automations) from your app via webhook.",
    category: "Productivity", emoji: "🔗", provider: "make", providerType: "code", connectMode: "backend_form",
    features: ["Trigger scenarios", "Pass data to workflows", "Async fire-and-forget", "Status via API key"],
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hook.eu1.make.com/xxxxxxxx" },
      { key: "apiKey", label: "API Key (optional)", type: "password", optional: true, help: "Only for scenario status." },
    ],
  },
  {
    name: "n8n", desc: "Trigger n8n workflows from your app, sync or fire-and-forget.",
    category: "Productivity", emoji: "⚙️", provider: "n8n", providerType: "code", connectMode: "backend_form",
    features: ["Trigger workflows", "Synchronous responses", "Self-hosted or cloud", "Poll executions"],
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://your-n8n.app/webhook/xxxx" },
      { key: "apiKey", label: "API Key (optional)", type: "password", optional: true, help: "Only to poll execution results." },
    ],
  },
  {
    name: "Zapier", desc: "Send data to 5000+ apps by triggering Zapier Zaps via Catch Hook.",
    category: "Productivity", emoji: "⚡", provider: "zapier", providerType: "code", connectMode: "backend_form",
    features: ["Trigger Zaps", "5000+ app integrations", "Async fire-and-forget", "Run history via API key"],
    fields: [
      { key: "webhookUrl", label: "Catch Hook URL", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/xxxx/yyyy/" },
      { key: "apiKey", label: "API Key (optional)", type: "password", optional: true, help: "Only for run history." },
    ],
  },
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
  // When set, show that integration's detail/connect page instead of the grid.
  const [selected, setSelected] = useState<McpDef | null>(null);

  // Backend-wired connections (user_integrations): supabase + the provider
  // registry (wordpress/shopify/make/n8n/zapier). Creds are encrypted server
  // side; the frontend only ever sees connected-status + non-secret meta.
  const [backendConns, setBackendConns] = useState<Record<string, { id: string; meta: Record<string, string> }>>({});

  const loadBackendConns = async () => {
    try {
      const res = await apiGet<{ integrations: Array<{ id: string; provider: string; status: string; meta: Record<string, string> }> }>(
        "/api/integrations",
        { silent: true },
      );
      const map: Record<string, { id: string; meta: Record<string, string> }> = {};
      for (const i of res.integrations) {
        if (i.status === "connected") map[i.provider] = { id: i.id, meta: i.meta ?? {} };
      }
      setBackendConns(map);
    } catch {
      /* not signed in / none connected */
    }
  };
  useEffect(() => { if (user?.id) void loadBackendConns(); }, [user?.id]);

  // Supabase uses its dedicated MCP endpoint; everything else the generic one.
  const connectSupabaseMcp = async (accessToken: string, projectRef: string) => {
    const res = await apiPost<{ toolCount: number; anonKeyResolved: boolean }>(
      "/api/integrations/supabase/mcp",
      { accessToken, projectRef: projectRef || undefined },
      { silent: true },
    );
    await loadBackendConns();
    return res;
  };

  const connectProvider = async (providerId: string, params: Record<string, string>) => {
    await apiPost(`/api/integrations/provider/${providerId}`, params, { silent: true });
    await loadBackendConns();
  };

  const disconnectProvider = async (providerId: string) => {
    const conn = backendConns[providerId];
    if (!conn) return;
    await apiDelete(`/api/integrations/${conn.id}`, { silent: true });
    setBackendConns((m) => { const n = { ...m }; delete n[providerId]; return n; });
    toast.success(`${providerId} disconnected`);
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

  if (selected) {
    return (
      <RequireAuth>
        <Shell>
          <McpDetail
            def={selected}
            onBack={() => setSelected(null)}
            connected={!!backendConns[selected.provider]}
            onConnectSupabase={connectSupabaseMcp}
            onConnectProvider={connectProvider}
            onDisconnect={() => disconnectProvider(selected.provider)}
          />
        </Shell>
      </RequireAuth>
    );
  }

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
                      {filtered(c).map(s => {
                        const connected =
                          s.connectMode === "supabase_form" || s.connectMode === "backend_form"
                            ? !!backendConns[s.provider]
                            : rows[s.provider]?.status === "connected";
                        return (
                          <McpStoreCard
                            key={s.name}
                            def={s}
                            connected={connected}
                            onClick={() => setSelected(s)}
                          />
                        );
                      })}
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

/* ─── Store card (clickable → opens detail page) ──────────────────────────── */

function McpStoreCard({
  def,
  connected,
  onClick,
}: {
  def: McpDef;
  connected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 text-left backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
    >
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
          variant={connected ? "default" : "secondary"}
          className={connected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
        >
          {connected ? "● Connected" : "Available"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{def.desc}</p>
      <span className="mt-auto text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
        View details →
      </span>
    </button>
  );
}

/* ─── Per-provider "what it unlocks" features ─────────────────────────────── */

const FEATURES: Record<string, { title: string; desc: string }[]> = {
  supabase: [
    { title: "Database (PostgreSQL)", desc: "Store and query your app data with full SQL. Tables and schema are generated from your prompts." },
    { title: "User Authentication", desc: "Email/password sign-up, login and access control added to your app." },
    { title: "Row Level Security", desc: "Each user only sees their own data — policies generated automatically." },
    { title: "File Storage & Realtime", desc: "Upload images/files and stream live data changes to your app." },
  ],
};

/* ─── Per-provider rich metadata for the detail page ──────────────────────── */

interface McpMeta {
  longDesc: string;
  inputs: { name: string; type: string; desc: string }[];
  useCases: string[];
}

const META: Record<string, McpMeta> = {
  vercel: {
    longDesc: "Vercel hosts your frontend and serverless functions on a global edge network. Connect it so the agent can deploy projects, manage environments, and roll back releases on your behalf.",
    inputs: [
      { name: "projectName", type: "string", desc: "Vercel project slug to deploy or inspect." },
      { name: "environment", type: "'production' | 'preview' | 'development'", desc: "Target environment for the action." },
      { name: "envVars", type: "Record<string,string>", desc: "Env vars to set before deploy." },
    ],
    useCases: ["Ship every prompt to a preview URL", "Promote a preview to production", "Sync env vars across environments"],
  },
  netlify: {
    longDesc: "Netlify builds, previews, and serves your site with deploy previews per pull request. Use it to publish static sites and edge functions straight from chat.",
    inputs: [
      { name: "siteId", type: "string", desc: "Netlify site identifier." },
      { name: "branch", type: "string", desc: "Branch to build & deploy." },
    ],
    useCases: ["Publish a marketing landing page", "Spin up deploy previews for review", "Wire forms to a serverless function"],
  },
  railway: {
    longDesc: "Railway runs your backend services, databases, and cron jobs in seconds. The agent can provision services, set variables, and tail logs.",
    inputs: [
      { name: "serviceName", type: "string", desc: "Service to deploy or inspect." },
      { name: "schedule", type: "string (cron)", desc: "Cron schedule for jobs." },
    ],
    useCases: ["Host a Node/Python API", "Run nightly cron jobs", "Spin up a managed Postgres"],
  },
  cloudflare: {
    longDesc: "Cloudflare runs your code at the edge with Workers, KV, D1, and R2. Use it for global low-latency apps and asset delivery.",
    inputs: [
      { name: "workerName", type: "string", desc: "Worker script to deploy." },
      { name: "bucket", type: "string", desc: "R2 bucket for asset uploads." },
    ],
    useCases: ["Globally-distributed API at the edge", "Image & file storage on R2", "DNS and CDN for a custom domain"],
  },
  supabase: {
    longDesc: "Supabase gives your app a Postgres database, auth, storage, and realtime. Lampcode generates tables, RLS policies, and edge functions for you.",
    inputs: [
      { name: "accessToken", type: "string (secret)", desc: "Supabase personal access token (sbp_...)." },
      { name: "projectRef", type: "string", desc: "20-char project ref from Settings → General." },
    ],
    useCases: ["Add user sign-up & login", "Persist data with row-level security", "Upload files and stream realtime updates"],
  },
  neon: {
    longDesc: "Neon is serverless Postgres with database branching for every PR. Great for preview environments with isolated data.",
    inputs: [
      { name: "projectId", type: "string", desc: "Neon project identifier." },
      { name: "branch", type: "string", desc: "Branch name to query or create." },
    ],
    useCases: ["Per-PR database branches", "Scale-to-zero dev databases", "Snapshot & restore data"],
  },
  planetscale: {
    longDesc: "PlanetScale is a MySQL-compatible serverless database with branching and deploy requests for safe schema changes.",
    inputs: [
      { name: "database", type: "string", desc: "PlanetScale database name." },
      { name: "branch", type: "string", desc: "Schema branch to use." },
    ],
    useCases: ["Safe online schema migrations", "Branching workflows for schema reviews", "High-throughput MySQL at scale"],
  },
  mongodb: {
    longDesc: "MongoDB Atlas is a managed document database with global clusters, Search, and Vector Search built in.",
    inputs: [
      { name: "clusterUri", type: "string (secret)", desc: "Atlas connection string." },
      { name: "database", type: "string", desc: "Database name to operate on." },
    ],
    useCases: ["Flexible document storage", "Full-text and vector search", "Globally distributed reads"],
  },
  figma: {
    longDesc: "Figma exposes your design files, components, and tokens so the agent can build pixel-accurate UI from your designs.",
    inputs: [
      { name: "fileKey", type: "string", desc: "Figma file key from the URL." },
      { name: "nodeId", type: "string", desc: "Specific frame or component to import." },
    ],
    useCases: ["Import a hero section as React", "Sync design tokens to Tailwind", "Export icons and SVG assets"],
  },
  framer: {
    longDesc: "Framer provides animated layouts, CMS collections, and responsive components you can pull into your app.",
    inputs: [
      { name: "projectId", type: "string", desc: "Framer project identifier." },
      { name: "componentId", type: "string", desc: "Component or page to import." },
    ],
    useCases: ["Animated marketing sections", "CMS-driven landing pages", "Responsive layout starters"],
  },
  openai: {
    longDesc: "OpenAI provides GPT chat, embeddings, vision, and image generation. Wire it in to give your app AI capabilities.",
    inputs: [
      { name: "apiKey", type: "string (secret)", desc: "OpenAI API key (sk-...)." },
      { name: "model", type: "string", desc: "Model id, e.g. gpt-4o-mini." },
    ],
    useCases: ["Chatbot and Q&A assistant", "Semantic search with embeddings", "Image generation and vision"],
  },
  anthropic: {
    longDesc: "Anthropic's Claude models excel at long-context reasoning, tool use, and careful instruction following.",
    inputs: [
      { name: "apiKey", type: "string (secret)", desc: "Anthropic API key." },
      { name: "model", type: "string", desc: "Model id, e.g. claude-sonnet-4." },
    ],
    useCases: ["Summarize long documents", "Structured tool-using agents", "Vision + text analysis"],
  },
  sequential_think: {
    longDesc: "Sequential Thinking adds a structured plan/act/reflect loop to your agent, improving accuracy on multi-step tasks.",
    inputs: [
      { name: "thought", type: "string", desc: "Next reasoning step from the agent." },
      { name: "branchId", type: "string", desc: "Optional branch label for alternative paths." },
    ],
    useCases: ["Complex debugging workflows", "Multi-step research tasks", "Plan-then-act tool agents"],
  },
  context7: {
    longDesc: "Context7 streams version-aware library documentation into the agent so generated code uses real, current APIs.",
    inputs: [
      { name: "library", type: "string", desc: "Library name, e.g. 'react-query'." },
      { name: "version", type: "string", desc: "Optional semver to pin docs." },
    ],
    useCases: ["Avoid hallucinated SDK calls", "Pin a library to a specific version", "Cite snippets in PR descriptions"],
  },
  github: {
    longDesc: "GitHub gives the agent read/write access to repos, pull requests, issues, and Actions for any account you authorize.",
    inputs: [
      { name: "repo", type: "string", desc: "Repository in 'owner/name' format." },
      { name: "ref", type: "string", desc: "Branch, tag, or commit SHA." },
    ],
    useCases: ["Open PRs from chat", "Triage and label issues", "Inspect CI logs"],
  },
  gitlab: {
    longDesc: "GitLab access for repos, merge requests, pipelines, and the container/package registries.",
    inputs: [
      { name: "projectId", type: "string", desc: "GitLab project id or path." },
      { name: "ref", type: "string", desc: "Branch, tag, or SHA." },
    ],
    useCases: ["Create merge requests", "Trigger CI pipelines", "Manage registries"],
  },
  sentry: {
    longDesc: "Sentry pulls your runtime errors, performance traces, and release health into the agent for triage and fixes.",
    inputs: [
      { name: "org", type: "string", desc: "Sentry organization slug." },
      { name: "project", type: "string", desc: "Sentry project slug." },
    ],
    useCases: ["Diagnose a crashing release", "Group errors by component", "Track regressions across releases"],
  },
  posthog: {
    longDesc: "PostHog brings product analytics, feature flags, A/B tests, and session replay to your app.",
    inputs: [
      { name: "projectApiKey", type: "string", desc: "PostHog project API key." },
      { name: "flagKey", type: "string", desc: "Feature flag to read or toggle." },
    ],
    useCases: ["Track funnels and retention", "Roll out behind feature flags", "Watch session replays"],
  },
  linear: {
    longDesc: "Linear connects issues, projects, and cycles so the agent can plan work and update tickets.",
    inputs: [
      { name: "teamId", type: "string", desc: "Linear team identifier." },
      { name: "issueId", type: "string", desc: "Issue id to read or update." },
    ],
    useCases: ["Auto-create issues from bug reports", "Move tickets across states", "Plan a cycle from chat"],
  },
  notion: {
    longDesc: "Notion lets the agent search pages, append blocks, and create database rows — perfect for docs-driven workflows.",
    inputs: [
      { name: "pageId", type: "string", desc: "Notion page id." },
      { name: "databaseId", type: "string", desc: "Notion database id for rows." },
    ],
    useCases: ["Use docs as agent context", "Append meeting notes", "Create entries in a CRM database"],
  },
  slack: {
    longDesc: "Slack integration to post messages, read channel context, and react inside threads.",
    inputs: [
      { name: "channel", type: "string", desc: "Channel id or name (#general)." },
      { name: "text", type: "string", desc: "Message body to post." },
    ],
    useCases: ["Notify a channel on deploy", "Summarize a thread", "Trigger workflows on a reaction"],
  },
  stripe: {
    longDesc: "Stripe powers payments, subscriptions, customer portals, and webhook events in your app.",
    inputs: [
      { name: "secretKey", type: "string (secret)", desc: "Stripe secret key (sk_...)." },
      { name: "priceId", type: "string", desc: "Price id for checkout or subscriptions." },
    ],
    useCases: ["One-off checkout", "Recurring subscriptions", "Send users to a billing portal"],
  },
  wordpress: {
    longDesc: "WordPress REST API access for posts, pages, media, and WooCommerce store data.",
    inputs: [
      { name: "siteUrl", type: "string (url)", desc: "Your WordPress site root." },
      { name: "username", type: "string", desc: "WP user with API access." },
      { name: "appPassword", type: "string (secret)", desc: "Application Password from WP profile." },
    ],
    useCases: ["Publish posts from chat", "Sync products and orders", "Upload to the media library"],
  },
  shopify: {
    longDesc: "Shopify Storefront and Admin APIs for catalog, carts, checkout, orders, and webhooks.",
    inputs: [
      { name: "shopDomain", type: "string", desc: "Your store's myshopify domain." },
      { name: "storefrontAccessToken", type: "string (secret)", desc: "Public Storefront token." },
      { name: "adminApiAccessToken", type: "string (secret)", desc: "Admin token for orders/webhooks." },
    ],
    useCases: ["Build a custom storefront", "Sync orders into a dashboard", "Listen for order webhooks"],
  },
  make: {
    longDesc: "Make.com runs automations triggered by webhooks. The agent fires scenarios with structured payloads.",
    inputs: [
      { name: "webhookUrl", type: "string (url)", desc: "Make scenario webhook URL." },
      { name: "payload", type: "Record<string,unknown>", desc: "JSON body sent to the scenario." },
    ],
    useCases: ["Sync to Google Sheets", "Send branded emails", "Cross-app automations"],
  },
  n8n: {
    longDesc: "n8n workflows triggered via webhook — synchronously or fire-and-forget. Self-hosted or cloud.",
    inputs: [
      { name: "webhookUrl", type: "string (url)", desc: "n8n webhook endpoint." },
      { name: "payload", type: "Record<string,unknown>", desc: "JSON body for the workflow." },
    ],
    useCases: ["Background processing pipelines", "ETL between SaaS tools", "AI agent post-processing"],
  },
  zapier: {
    longDesc: "Zapier Catch Hooks let the agent push data into 5000+ apps without writing integrations.",
    inputs: [
      { name: "webhookUrl", type: "string (url)", desc: "Zapier Catch Hook URL." },
      { name: "payload", type: "Record<string,unknown>", desc: "JSON body for the Zap." },
    ],
    useCases: ["Fan out events to many apps", "Notify Slack + email + CRM at once", "Trigger no-code workflows"],
  },
};

/* ─── MCP detail / connect page ───────────────────────────────────────────── */

function McpDetail({
  def,
  onBack,
  connected,
  onConnectSupabase,
  onConnectProvider,
  onDisconnect,
}: {
  def: McpDef;
  onBack: () => void;
  connected: boolean;
  onConnectSupabase: (accessToken: string, projectRef: string) => Promise<{ toolCount: number; anonKeyResolved: boolean }>;
  onConnectProvider: (providerId: string, params: Record<string, string>) => Promise<void>;
  onDisconnect: () => Promise<void>;
}) {
  const isSupabase = def.connectMode === "supabase_form";
  const isBackendForm = def.connectMode === "backend_form";

  // Feature bullets: prefer def.features (strings) else the supabase FEATURES map.
  const featureBullets: string[] =
    def.features ?? (FEATURES[def.provider]?.map((f) => `${f.title} — ${f.desc}`) ?? []);

  // Supabase PAT form
  const [token, setToken] = useState("");
  const [projectRef, setProjectRef] = useState("");
  // Generic backend_form values keyed by field
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSupabase = async () => {
    if (!token.trim()) { toast.error("Access token is required"); return; }
    setSaving(true);
    try {
      const res = await onConnectSupabase(token.trim(), projectRef.trim());
      setToken(""); setProjectRef("");
      toast.success(`Supabase connected — ${res.toolCount} MCP tools available${res.anonKeyResolved ? ", preview keys resolved" : ""}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally { setSaving(false); }
  };

  const handleGeneric = async () => {
    const required = (def.fields ?? []).filter((f) => !f.optional);
    for (const f of required) {
      if (!values[f.key]?.trim()) { toast.error(`${f.label} is required`); return; }
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of def.fields ?? []) {
        const v = values[f.key]?.trim();
        if (v) payload[f.key] = v;
      }
      await onConnectProvider(def.provider, payload);
      setValues({});
      toast.success(`${def.name} connected`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally { setSaving(false); }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try { await onDisconnect(); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to MCP Store
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl">{def.emoji}</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{def.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{def.desc}</p>
          </div>
        </div>
        <Badge variant={connected ? "default" : "secondary"} className={connected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
          {connected ? "● Connected" : "Available"}
        </Badge>
      </div>

      {/* Features */}
      {featureBullets.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">What this unlocks</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureBullets.map((f) => (
              <div key={f} className="flex gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect / manage */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Connected — credentials are encrypted on our server.
            </div>
            <Button variant="outline" disabled={busy} onClick={handleDisconnect}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
            </Button>
          </div>
        ) : isSupabase ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connect {def.name}</h2>
            <div className="space-y-2">
              <Label htmlFor="sb-pat">Personal Access Token</Label>
              <Input id="sb-pat" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="sbp_..." />
              <p className="text-xs text-muted-foreground">
                Create one at Supabase → Account → <span className="font-medium text-foreground/70">Access Tokens</span>. Stored encrypted on our server.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb-ref">Project Ref</Label>
              <Input id="sb-ref" value={projectRef} onChange={(e) => setProjectRef(e.target.value)} placeholder="abcdefghijklmnop" />
              <p className="text-xs text-muted-foreground">The 20-char ref from your project (Settings → General).</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300/80">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Encrypted and never sent to the browser, the AI, or the preview. Only the public anon key is used in previews.</span>
            </div>
            <Button onClick={handleSupabase} disabled={saving || !token.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Connect"}
            </Button>
          </div>
        ) : isBackendForm ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connect {def.name}</h2>
            {(def.fields ?? []).map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <Input
                  id={`f-${f.key}`}
                  type={f.type === "password" ? "password" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            ))}
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300/80">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>We verify the credentials, then store them encrypted. They never reach the browser, the AI, or the preview sandbox.</span>
            </div>
            <Button onClick={handleGeneric} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Connect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connect {def.name}</h2>
            <p className="text-sm text-muted-foreground">
              {def.name} integrates with Lampcode through the Model Context Protocol. Connect your
              account to let the agent use {def.name} tools while building your app.
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-primary/80">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>One-click connect for {def.name} is rolling out soon. Join the waitlist and we'll enable it on your workspace.</span>
            </div>
            <Button
              className="w-full"
              onClick={() => toast.success(`We'll notify you when ${def.name} is ready to connect`)}
            >
              Connect {def.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
