import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/mcp")({ component: McpPage });

type Mcp = {
  name: string;
  desc: string;
  category: "Deploy" | "Database" | "Design" | "AI Tools" | "Dev Tools" | "Productivity";
  status: "Connected" | "Available";
  emoji: string;
};

const servers: Mcp[] = [
  { name: "Vercel", desc: "Deploy and manage your apps on Vercel's global edge network.", category: "Deploy", status: "Connected", emoji: "▲" },
  { name: "Netlify", desc: "One-click deploys with previews and serverless functions.", category: "Deploy", status: "Available", emoji: "◆" },
  { name: "Railway", desc: "Deploy backends, databases, and cron jobs in minutes.", category: "Deploy", status: "Available", emoji: "🚂" },
  { name: "Cloudflare", desc: "Workers, R2 storage, and global CDN at the edge.", category: "Deploy", status: "Available", emoji: "☁︎" },

  { name: "Supabase", desc: "Provision Postgres databases with auth, storage and RLS.", category: "Database", status: "Connected", emoji: "⚡" },
  { name: "Neon", desc: "Serverless Postgres with branching for every PR.", category: "Database", status: "Available", emoji: "🌿" },
  { name: "PlanetScale", desc: "Serverless MySQL with branching workflows.", category: "Database", status: "Available", emoji: "🪐" },
  { name: "MongoDB Atlas", desc: "Managed document database with global clusters.", category: "Database", status: "Available", emoji: "🍃" },

  { name: "Figma", desc: "Pull designs, components and tokens straight from Figma.", category: "Design", status: "Available", emoji: "🎨" },
  { name: "Framer", desc: "Import animated layouts and components from Framer.", category: "Design", status: "Available", emoji: "✦" },

  { name: "OpenAI", desc: "GPT, embeddings, and vision tools for your agents.", category: "AI Tools", status: "Connected", emoji: "✺" },
  { name: "Anthropic", desc: "Claude models for long-context reasoning.", category: "AI Tools", status: "Available", emoji: "✶" },
  { name: "Sequential Thinking", desc: "Step-by-step reasoning helper for complex tasks.", category: "AI Tools", status: "Connected", emoji: "🧠" },
  { name: "Context7", desc: "Up-to-date library docs piped right into the agent.", category: "AI Tools", status: "Connected", emoji: "📚" },

  { name: "GitHub", desc: "Read repos, open PRs, and manage issues from chat.", category: "Dev Tools", status: "Connected", emoji: "" },
  { name: "GitLab", desc: "Repos, MRs, CI pipelines and registries.", category: "Dev Tools", status: "Available", emoji: "🦊" },
  { name: "Sentry", desc: "Track errors and performance across your stack.", category: "Dev Tools", status: "Available", emoji: "🛡" },
  { name: "PostHog", desc: "Product analytics, feature flags, and session replay.", category: "Dev Tools", status: "Available", emoji: "📊" },

  { name: "Linear", desc: "Read and update issues, projects and cycles.", category: "Productivity", status: "Available", emoji: "📐" },
  { name: "Notion", desc: "Search pages, append blocks and create databases.", category: "Productivity", status: "Available", emoji: "📝" },
  { name: "Slack", desc: "Post messages and read channels for context.", category: "Productivity", status: "Available", emoji: "💬" },
  { name: "Stripe", desc: "Create payments, subscriptions and customer portals.", category: "Productivity", status: "Available", emoji: "💳" },
];

const categories = ["All", "Deploy", "Database", "Design", "AI Tools", "Dev Tools", "Productivity"] as const;

function McpCard({ s }: { s: Mcp }) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-lg">
            {s.emoji}
          </div>
          <div>
            <div className="font-semibold leading-tight">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.category}</div>
          </div>
        </div>
        <Badge
          variant={s.status === "Connected" ? "default" : "secondary"}
          className={s.status === "Connected" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
        >
          {s.status === "Connected" ? "● Connected" : "Available"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{s.desc}</p>
      <Button
        size="sm"
        variant={s.status === "Connected" ? "outline" : "default"}
        className="mt-auto w-full"
      >
        {s.status === "Connected" ? "Configure" : "Connect"}
      </Button>
    </div>
  );
}

function McpPage() {
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const filtered = (cat: string) =>
    servers.filter(
      (s) =>
        (cat === "All" || s.category === cat) &&
        (s.name.toLowerCase().includes(query.toLowerCase()) || s.desc.toLowerCase().includes(query.toLowerCase())),
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

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MCP Store</h1>
            <p className="mt-1 text-sm text-muted-foreground">{servers.length} integrations available — connect Model Context Protocol servers to extend your agents.</p>
          </div>
          <Dialog open={customOpen} onOpenChange={setCustomOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
                <Plus className="h-4 w-4" /> Custom MCP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Add Custom MCP Server</DialogTitle>
                <DialogDescription>Bring your own Model Context Protocol server.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="mcp-name">Name</Label>
                  <Input id="mcp-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="My MCP" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-url">Server URL</Label>
                  <Input id="mcp-url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://my-mcp.example.com/mcp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-desc">Description (optional)</Label>
                  <Textarea id="mcp-desc" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="What does this MCP do?" />
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search MCPs..." className="pl-9 bg-card/60 border-border/60 backdrop-blur" />
        </div>

        <Tabs defaultValue="All" className="w-full">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card/60 backdrop-blur h-auto p-1">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((c) => (
            <TabsContent key={c} value={c} className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered(c).map((s) => <McpCard key={s.name} s={s} />)}
              </div>
              {filtered(c).length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No MCPs match your search.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Shell>
  );
}
