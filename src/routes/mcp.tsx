import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sparkles, Loader2, ArrowLeft, Check, ShieldCheck, Link, Info, Zap, Lightbulb } from "lucide-react";
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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiDelete, getConnectedMcps, connectMcp, disconnectMcp } from "@/lib/api";
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

type ConnectMode = "supabase_form" | "registry_form" | "coming_soon";
type Category = "Deploy" | "Database" | "Design" | "Dev Tools" | "Productivity";

interface CustomMcp {
  slug: string;
  meta: Record<string, string>;
  connectedAt: string;
}

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
  provider: string;
  providerType: ProviderType;
  connectMode: ConnectMode;
  fields?: ProviderField[];
  features?: string[];
}

/* ─── Provider catalogue ─────────────────────────────────────────────────── */

const SERVERS: McpDef[] = [
  // ── Deploy ────────────────────────────────────────────────────────────────
  {
    name: "Vercel", desc: "Deploy projects, manage domains, and view deployments via the Vercel MCP server.",
    category: "Deploy", emoji: "▲", provider: "vercel", providerType: "deploy", connectMode: "registry_form",
    fields: [{ key: "vercel_token", label: "Vercel Account Token", type: "password", placeholder: "...", help: "Create at vercel.com/account/tokens" }],
  },
  { name: "Netlify", desc: "One-click deploys with previews and serverless functions.", category: "Deploy", emoji: "◆", provider: "netlify", providerType: "deploy", connectMode: "coming_soon" },
  {
    name: "Railway", desc: "Deploy to Railway from generated apps via the Railway GraphQL API.",
    category: "Deploy", emoji: "🚂", provider: "railway", providerType: "deploy", connectMode: "registry_form",
    fields: [{ key: "api_token", label: "Railway API Token", type: "password", placeholder: "...", help: "Create at railway.app/account/tokens" }],
  },
  {
    name: "Cloudflare", desc: "Manage Workers, KV, R2, and DNS records via the Cloudflare MCP server.",
    category: "Deploy", emoji: "🌥️", provider: "cloudflare", providerType: "deploy", connectMode: "registry_form",
    fields: [{ key: "cf_token", label: "Cloudflare API Token", type: "password", placeholder: "...", help: "Create at dash.cloudflare.com/profile/api-tokens" }],
  },

  // ── Database ──────────────────────────────────────────────────────────────
  { name: "Supabase", desc: "Provision Postgres databases with auth, storage and RLS.", category: "Database", emoji: "⚡", provider: "supabase", providerType: "database", connectMode: "supabase_form" },
  {
    name: "MongoDB Atlas", desc: "MongoDB Atlas database for generated apps — connect via connection string.",
    category: "Database", emoji: "🍃", provider: "mongodb", providerType: "database", connectMode: "registry_form",
    fields: [{ key: "connection_string", label: "Atlas Connection String", type: "password", placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/db", help: "Get from cloud.mongodb.com → Database → Connect → Drivers" }],
  },
  {
    name: "Shopify", desc: "Manage Shopify store products, orders, and customers via the Admin GraphQL API.",
    category: "Database", emoji: "🛍️", provider: "shopify", providerType: "database", connectMode: "registry_form",
    fields: [
      { key: "shopify_store_domain", label: "Shopify Store Domain", type: "text", placeholder: "yourstore.myshopify.com", help: "Your Shopify store domain (without https://)" },
      { key: "shopify_admin_token", label: "Admin API Access Token", type: "password", placeholder: "shpat_...", help: "Shopify Admin → Settings → Apps → Develop apps → Create app → Admin API access token" },
    ],
  },

  // ── Design ────────────────────────────────────────────────────────────────
  {
    name: "Figma", desc: "Read Figma files, components, and design tokens via the Figma MCP server.",
    category: "Design", emoji: "🎨", provider: "figma", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "figma_access_token", label: "Figma Personal Access Token", type: "password", placeholder: "figd_...", help: "Create at figma.com → Account → Personal Access Tokens" }],
  },
  {
    name: "Framer", desc: "Import animated components and layouts via the Framer API.",
    category: "Design", emoji: "🖼️", provider: "framer", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "framer_api_token", label: "Framer API Token", type: "password", placeholder: "...", help: "Create at framer.com/developers → API Tokens" }],
  },
  {
    name: "Google Stitch", desc: "Generate UI designs from prompts and extract production-ready code.",
    category: "Design", emoji: "🧵", provider: "google-stitch", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "stitch_api_key", label: "Google Stitch API Key", type: "password", placeholder: "AIza...", help: "console.cloud.google.com → APIs → Enable Stitch API → Credentials → Create API Key" }],
  },

  // ── Dev Tools ─────────────────────────────────────────────────────────────
  {
    name: "GitHub", desc: "Create repos, manage issues, open pull requests, and more via the GitHub MCP server.",
    category: "Dev Tools", emoji: "🐙", provider: "github", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "github_token", label: "Personal Access Token", type: "password", placeholder: "ghp_...", help: "Create at github.com/settings/tokens — needs repo and workflow scopes" }],
  },
  {
    name: "Sentry", desc: "Query errors, manage issues, and view performance data via the Sentry MCP server.",
    category: "Dev Tools", emoji: "🪲", provider: "sentry", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "sentry_token", label: "Sentry Internal Integration Token", type: "password", placeholder: "...", help: "Create an Internal Integration at sentry.io/settings/ → Integrations" }],
  },

  // ── Productivity ──────────────────────────────────────────────────────────
  {
    name: "Linear", desc: "Read and update issues, projects and cycles via the Linear MCP server.",
    category: "Productivity", emoji: "📋", provider: "linear", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "linear_key", label: "Linear API Key", type: "password", placeholder: "lin_api_...", help: "Create at linear.app/settings/api under Personal API Keys" }],
  },
  {
    name: "Notion", desc: "Read and write pages, databases, and blocks via the Notion MCP server.",
    category: "Productivity", emoji: "📝", provider: "notion", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "notion_token", label: "Notion Integration Token", type: "password", placeholder: "secret_...", help: "Create an integration at notion.com/profile/integrations and share pages with it" }],
  },
  {
    name: "Stripe", desc: "Manage payments, customers, subscriptions, and products via the Stripe MCP server.",
    category: "Productivity", emoji: "💳", provider: "stripe", providerType: "payment", connectMode: "registry_form",
    fields: [{ key: "stripe_key", label: "Stripe API Key", type: "password", placeholder: "sk_live_... or rk_live_...", help: "Use a Restricted Key from dashboard.stripe.com/apikeys for least privilege" }],
  },
  {
    name: "WordPress", desc: "Create and manage WordPress posts, pages, and media via the REST API.",
    category: "Productivity", emoji: "📰", provider: "wordpress", providerType: "code", connectMode: "registry_form",
    fields: [
      { key: "wordpress_site_url", label: "WordPress Site URL", type: "url", placeholder: "https://yoursite.com", help: "The root URL of your WordPress site" },
      { key: "wordpress_app_password", label: "Application Password", type: "password", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx", help: "WordPress Admin → Users → Profile → Application Passwords → Generate" },
    ],
  },
  {
    name: "Make", desc: "Run Make scenarios using your personal Make MCP endpoint.",
    category: "Productivity", emoji: "🔧", provider: "make", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "make_mcp_url", label: "Make MCP URL", type: "url", placeholder: "https://eu2.make.com/mcp/api/v1/u/YOUR_TOKEN/sse", help: "Go to Make.com → Profile → API → MCP → Copy your zone URL" }],
  },
  {
    name: "n8n", desc: "Trigger and manage n8n workflows via your self-hosted n8n MCP endpoint.",
    category: "Productivity", emoji: "⚙️", provider: "n8n", providerType: "code", connectMode: "registry_form",
    fields: [
      { key: "instance_url", label: "n8n Instance URL", type: "url", placeholder: "https://n8n.yourdomain.com", help: "The public URL of your n8n instance (must be accessible from the internet)" },
      { key: "api_key", label: "n8n API Key", type: "password", placeholder: "n8n_...", help: "Create at your n8n instance → Settings → API" },
    ],
  },
  {
    name: "Zapier", desc: "Trigger Zapier actions using your personal Zapier MCP endpoint.",
    category: "Productivity", emoji: "⚡", provider: "zapier", providerType: "code", connectMode: "registry_form",
    fields: [{ key: "zapier_mcp_url", label: "Zapier MCP URL", type: "url", placeholder: "https://mcp.zapier.com/api/mcp/s/YOUR_TOKEN/mcp", help: "Go to zapier.com/mcp → Create MCP → Copy your unique URL" }],
  },
  {
    name: "Mailchimp", desc: "Manage audiences, campaigns, and subscribers via the Mailchimp API.",
    category: "Productivity", emoji: "🐵", provider: "mailchimp", providerType: "email", connectMode: "registry_form",
    fields: [{ key: "api_key", label: "Mailchimp API Key", type: "password", placeholder: "xxxxxxxxxxxxxxxx-us1", help: "Find at mailchimp.com/account → Extras → API keys" }],
  },
  {
    name: "Resend", desc: "Transactional email sending via the Resend API.",
    category: "Productivity", emoji: "📨", provider: "resend", providerType: "email", connectMode: "registry_form",
    fields: [{ key: "api_key", label: "Resend API Key", type: "password", placeholder: "re_...", help: "Create an API key at resend.com/api-keys" }],
  },
  {
    name: "Twilio", desc: "Send SMS, WhatsApp messages, and make calls via the Twilio API.",
    category: "Productivity", emoji: "📱", provider: "twilio", providerType: "code", connectMode: "registry_form",
    fields: [
      { key: "account_sid", label: "Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxx", help: "Found on your Twilio Console dashboard" },
      { key: "auth_token", label: "Auth Token", type: "password", placeholder: "...", help: "Found on your Twilio Console dashboard" },
      { key: "phone_number", label: "Twilio Phone Number", type: "text", placeholder: "+15551234567", optional: true, help: "Your Twilio phone number in E.164 format (optional)" },
    ],
  },
  {
    name: "SendGrid", desc: "Send transactional and marketing email via the SendGrid API.",
    category: "Productivity", emoji: "📧", provider: "sendgrid", providerType: "email", connectMode: "registry_form",
    fields: [{ key: "api_key", label: "SendGrid API Key", type: "password", placeholder: "SG...", help: "Create at app.sendgrid.com/settings/api_keys" }],
  },
];

const CATEGORIES = ["All", "Deploy", "Database", "Design", "Dev Tools", "Productivity"] as const;

/* ─── Feature bullets for Supabase detail page ───────────────────────────── */

const FEATURES: Record<string, { title: string; desc: string }[]> = {
  supabase: [
    { title: "Database (PostgreSQL)", desc: "Store and query your app data with full SQL. Tables and schema are generated from your prompts." },
    { title: "User Authentication", desc: "Email/password sign-up, login and access control added to your app." },
    { title: "Row Level Security", desc: "Each user only sees their own data — policies generated automatically." },
    { title: "File Storage & Realtime", desc: "Upload images/files and stream live data changes to your app." },
  ],
  vercel: [
    { title: "One-click Deploys", desc: "Push generated apps to Vercel with preview URLs for every build." },
    { title: "Custom Domains", desc: "Attach domains and verify DNS records straight from chat." },
    { title: "Environment Variables", desc: "Sync env vars across preview and production environments." },
    { title: "Build Logs", desc: "Inspect deployment status and tail build logs in real time." },
  ],
  netlify: [
    { title: "Instant Previews", desc: "Every change ships a preview URL you can share with reviewers." },
    { title: "Build Hooks", desc: "Trigger rebuilds from chat or external services." },
    { title: "Serverless Functions", desc: "Deploy Netlify Functions alongside your static site." },
    { title: "DNS & Domains", desc: "Manage custom domains and SSL certificates." },
  ],
  railway: [
    { title: "Service Provisioning", desc: "Spin up Postgres, Redis, and Node services from a prompt." },
    { title: "Log Streaming", desc: "Tail production logs directly inside chat." },
    { title: "Environment Promotion", desc: "Promote builds between staging and production." },
    { title: "Database Migrations", desc: "Run migrations against managed Postgres safely." },
  ],
  cloudflare: [
    { title: "Workers Deploy", desc: "Ship edge functions to Cloudflare Workers from a prompt." },
    { title: "DNS Management", desc: "Add, update and verify DNS records on your zones." },
    { title: "R2 & KV Storage", desc: "Create buckets, namespaces and read/write objects." },
    { title: "Cache Purge", desc: "Invalidate cached assets after a deploy." },
  ],
  mongodb: [
    { title: "Managed Cluster", desc: "Connect any app to a managed MongoDB Atlas cluster." },
    { title: "Full CRUD", desc: "Read and write collections through the official driver." },
    { title: "Aggregation Pipelines", desc: "Run aggregations and analytics queries from chat." },
    { title: "Seed & Migrate", desc: "Seed sample data and migrate document shapes." },
  ],
  shopify: [
    { title: "Products & Orders", desc: "Read and update products, variants, and orders via the Admin API." },
    { title: "Customer Data", desc: "Build dashboards and segments around your customer base." },
    { title: "Custom Storefronts", desc: "Power headless storefronts with live Shopify data." },
    { title: "Inventory Sync", desc: "Keep inventory aligned across systems automatically." },
  ],
  figma: [
    { title: "Read Design Files", desc: "Pull frames, components, and pages directly from Figma." },
    { title: "Design Tokens", desc: "Extract colors, typography, and spacing into your code." },
    { title: "Figma-to-React", desc: "Translate selected frames into React components." },
    { title: "Stay in Sync", desc: "Keep code components aligned with the source of truth." },
  ],
  framer: [
    { title: "Motion Components", desc: "Import Framer's animated layouts into your React app." },
    { title: "Layout Starting Points", desc: "Pull Framer pages as launchpads for new builds." },
    { title: "Brand Assets", desc: "Sync logos, colors, and typography from Framer." },
    { title: "Iterate Faster", desc: "Use Framer prototypes as the spec for generated code." },
  ],
  "google-stitch": [
    { title: "Prompt → UI", desc: "Generate UI directions from a written description." },
    { title: "Production Code Export", desc: "Drop generated layouts into your app as real components." },
    { title: "Variant Exploration", desc: "Compare layout variants side-by-side." },
    { title: "Design Iteration", desc: "Refine and re-prompt until the layout fits." },
  ],
  github: [
    { title: "Repo Management", desc: "Create repositories, branches, and tags from chat." },
    { title: "Pull Requests", desc: "Open PRs with the generated diff and review summaries." },
    { title: "Issues & Triage", desc: "File, label, and close issues without leaving the build." },
    { title: "Code Search", desc: "Search across your repos for context the agent can use." },
  ],
  sentry: [
    { title: "Error Insights", desc: "Pull the top errors and their stack traces for any release." },
    { title: "Release Health", desc: "See crash-free sessions and adoption per release." },
    { title: "Issue Workflow", desc: "Assign, resolve, and link issues to PRs." },
    { title: "Performance Data", desc: "Inspect slow transactions and regressions." },
  ],
  linear: [
    { title: "Issue Tracking", desc: "Read and update issues, projects, and cycles." },
    { title: "Ticket → PR", desc: "Turn a Linear issue into a working pull request." },
    { title: "State Transitions", desc: "Move tickets across workflow states automatically." },
    { title: "Cycle Summaries", desc: "Summarize progress for any active cycle." },
  ],
  notion: [
    { title: "Pages & Databases", desc: "Read and write pages, databases, and blocks." },
    { title: "Docs as Context", desc: "Use a spec page as build context for the agent." },
    { title: "Release Notes", desc: "Append changelogs to a shared release page." },
    { title: "Two-way Sync", desc: "Mirror Notion data into your app and back." },
  ],
  stripe: [
    { title: "Payments & Checkout", desc: "Add Checkout, Payment Links, and one-time charges." },
    { title: "Subscriptions", desc: "Manage plans, customers, and recurring billing." },
    { title: "Refunds & Disputes", desc: "Issue refunds and respond to disputes from chat." },
    { title: "Product Catalog", desc: "Create and update products and prices programmatically." },
  ],
  wordpress: [
    { title: "Posts & Pages", desc: "Publish, update, and schedule content via the REST API." },
    { title: "Media Uploads", desc: "Upload images and attachments straight from chat." },
    { title: "Bulk SEO Updates", desc: "Update titles, slugs, and meta in bulk." },
    { title: "Custom Post Types", desc: "Work with any CPT exposed via REST." },
  ],
  make: [
    { title: "Run Scenarios", desc: "Trigger Make scenarios from chat with custom payloads." },
    { title: "1000+ App Connectors", desc: "Pipe data between every SaaS app Make supports." },
    { title: "No-code Automations", desc: "Build automations without leaving the build flow." },
    { title: "Personal MCP Endpoint", desc: "Uses your Make profile MCP URL — no shared keys." },
  ],
  n8n: [
    { title: "Self-hosted Workflows", desc: "Trigger and manage workflows on your own n8n instance." },
    { title: "Custom Payloads", desc: "Pass structured data into any workflow run." },
    { title: "Ops Console", desc: "Build a chat-driven ops console on top of n8n." },
    { title: "Scheduled Runs", desc: "Schedule automations and review their results." },
  ],
  zapier: [
    { title: "Fire Any Zap", desc: "Kick off any Zap action from chat using your MCP URL." },
    { title: "5000+ Apps", desc: "Reach every SaaS app supported by Zapier." },
    { title: "Personal Endpoint", desc: "Uses your private Zapier MCP URL — never shared." },
    { title: "Multi-step Flows", desc: "Chain multiple Zaps for complex workflows." },
  ],
  mailchimp: [
    { title: "Audience Management", desc: "Add, segment, and update subscribers from a signup form." },
    { title: "Campaigns", desc: "Create and send email campaigns from chat." },
    { title: "Automations", desc: "Trigger Mailchimp journeys on app events." },
    { title: "Reporting", desc: "Pull open, click, and bounce rates for any campaign." },
  ],
  resend: [
    { title: "Transactional Email", desc: "Send welcome, receipt, and notification emails reliably." },
    { title: "React Email Templates", desc: "Use React components as email templates." },
    { title: "Magic Links", desc: "Power magic-link and passwordless auth flows." },
    { title: "Domain Verification", desc: "Verify sending domains with SPF, DKIM, and DMARC." },
  ],
  twilio: [
    { title: "SMS Messaging", desc: "Send SMS for OTPs, alerts, and notifications." },
    { title: "WhatsApp Business", desc: "Reach users on WhatsApp from your app." },
    { title: "Voice Calls", desc: "Place automated voice calls and IVR flows." },
    { title: "Number Provisioning", desc: "Buy and configure Twilio phone numbers." },
  ],
  sendgrid: [
    { title: "Transactional Email", desc: "Send order confirmations, receipts, and alerts." },
    { title: "Marketing Campaigns", desc: "Run drip campaigns and broadcast sends." },
    { title: "Delivery Tracking", desc: "Track opens, clicks, bounces, and unsubscribes." },
    { title: "Template Library", desc: "Reuse dynamic templates across your sends." },
  ],
};

/* ─── Rich per-provider metadata (About / Inputs / Use-cases) ────────────── */

interface McpMeta {
  longDesc: string;
  inputs: { name: string; type: string; desc: string }[];
  useCases: string[];
}

const META: Record<string, McpMeta> = {
  vercel: {
    longDesc: "Vercel MCP lets the agent deploy, inspect, and manage projects on your Vercel account — from creating deployments to wiring custom domains.",
    inputs: [
      { name: "vercel_token", type: "secret", desc: "Account-scoped token used to authenticate against Vercel's REST API." },
    ],
    useCases: ["Ship preview deploys for every build", "Promote a build to production", "Attach a custom domain and verify DNS"],
  },
  netlify: {
    longDesc: "Netlify MCP automates site deploys, build hooks, and environment variables on your Netlify team.",
    inputs: [{ name: "auth_token", type: "secret", desc: "Personal access token from app.netlify.com." }],
    useCases: ["Deploy a static site with previews", "Trigger build hooks from chat", "Rotate environment variables"],
  },
  railway: {
    longDesc: "Railway MCP provisions services, runs migrations, and tails logs on your Railway projects via the GraphQL API.",
    inputs: [{ name: "api_token", type: "secret", desc: "Railway account token with project access." }],
    useCases: ["Spin up Postgres + a Node service", "Stream production logs into chat", "Promote a build between environments"],
  },
  cloudflare: {
    longDesc: "Cloudflare MCP manages Workers, KV namespaces, R2 buckets, and DNS records on your Cloudflare account.",
    inputs: [{ name: "cf_token", type: "secret", desc: "Scoped API token with Workers / DNS edit permissions." }],
    useCases: ["Deploy a Worker from a prompt", "Add or edit DNS records", "Manage R2 storage buckets"],
  },
  supabase: {
    longDesc: "Supabase MCP gives the agent direct access to your Postgres database, auth, storage, and edge functions — schema and RLS policies are generated as you prompt.",
    inputs: [
      { name: "access_token", type: "secret", desc: "Personal access token from Supabase → Account → Access Tokens." },
      { name: "project_ref", type: "text", desc: "20-character project reference from Settings → General." },
    ],
    useCases: ["Create tables with RLS in one prompt", "Wire up email + Google sign-in", "Generate edge functions and call them from the UI"],
  },
  mongodb: {
    longDesc: "MongoDB Atlas MCP connects your app to a managed Mongo cluster with full CRUD via the official driver.",
    inputs: [{ name: "connection_string", type: "secret", desc: "mongodb+srv:// URI including credentials and database." }],
    useCases: ["Persist user data in collections", "Run aggregation pipelines from chat", "Seed and migrate documents"],
  },
  shopify: {
    longDesc: "Shopify MCP reads and writes products, orders, and customers through the Admin GraphQL API.",
    inputs: [
      { name: "shopify_store_domain", type: "text", desc: "yourstore.myshopify.com — without https://." },
      { name: "shopify_admin_token", type: "secret", desc: "Admin API access token from a custom app." },
    ],
    useCases: ["Sync products into a custom storefront", "Build a back-office dashboard for orders", "Push customer segments into email tools"],
  },
  figma: {
    longDesc: "Figma MCP reads frames, components, and design tokens so the agent can rebuild your designs in code.",
    inputs: [{ name: "figma_access_token", type: "secret", desc: "Personal access token from figma.com → Account." }],
    useCases: ["Translate a Figma frame into React", "Extract color + typography tokens", "Keep components in sync with design"],
  },
  framer: {
    longDesc: "Framer MCP imports motion-rich components and layouts straight from Framer projects.",
    inputs: [{ name: "framer_api_token", type: "secret", desc: "Token from framer.com/developers." }],
    useCases: ["Reuse Framer animations in React", "Pull layouts as starting points", "Sync brand assets"],
  },
  "google-stitch": {
    longDesc: "Google Stitch generates UI designs from prompts and exports production-ready code that the agent can drop into your app.",
    inputs: [{ name: "stitch_api_key", type: "secret", desc: "API key from Google Cloud Console with Stitch enabled." }],
    useCases: ["Brainstorm UI directions from a prompt", "Export Stitch designs as React", "Iterate on layout variants"],
  },
  github: {
    longDesc: "GitHub MCP creates repos, opens PRs, files issues, and reads code so the agent can collaborate inside your workflow.",
    inputs: [{ name: "github_token", type: "secret", desc: "PAT with repo + workflow scopes." }],
    useCases: ["Open a PR with the generated diff", "Triage issues from chat", "Search across your repos for context"],
  },
  sentry: {
    longDesc: "Sentry MCP queries errors, releases, and performance data so the agent can debug against real production signal.",
    inputs: [{ name: "sentry_token", type: "secret", desc: "Internal Integration token from sentry.io." }],
    useCases: ["Pull the top errors for a release", "Find the stack trace for an issue", "Mark issues resolved after a fix"],
  },
  linear: {
    longDesc: "Linear MCP reads and updates issues, projects, and cycles — perfect for turning tickets into shipped features.",
    inputs: [{ name: "linear_key", type: "secret", desc: "Personal API key from linear.app/settings/api." }],
    useCases: ["Convert a Linear issue into a working PR", "Move tickets across states", "Summarize a cycle's progress"],
  },
  notion: {
    longDesc: "Notion MCP reads and writes pages, databases, and blocks so the agent can use your docs as context.",
    inputs: [{ name: "notion_token", type: "secret", desc: "Integration token from notion.com/profile/integrations." }],
    useCases: ["Use a spec page as build context", "Append changelogs to a release page", "Mirror Notion data into the app"],
  },
  stripe: {
    longDesc: "Stripe MCP manages payments, customers, subscriptions, and products through the Stripe API.",
    inputs: [{ name: "stripe_key", type: "secret", desc: "Restricted key from dashboard.stripe.com/apikeys." }],
    useCases: ["Add checkout to a generated app", "Inspect a customer's subscription", "Refund a charge from chat"],
  },
  wordpress: {
    longDesc: "WordPress MCP creates and manages posts, pages, and media via the WP REST API.",
    inputs: [
      { name: "wordpress_site_url", type: "url", desc: "Root URL of your WordPress install." },
      { name: "wordpress_app_password", type: "secret", desc: "Application password generated from Users → Profile." },
    ],
    useCases: ["Publish a blog post from a prompt", "Bulk update SEO meta", "Upload media from chat"],
  },
  make: {
    longDesc: "Make MCP runs Make scenarios from your personal MCP endpoint, perfect for chaining 1000+ apps.",
    inputs: [{ name: "make_mcp_url", type: "url", desc: "Personal Make MCP URL from Profile → API." }],
    useCases: ["Trigger a scenario from chat", "Pipe data between SaaS apps", "Build no-code automations"],
  },
  n8n: {
    longDesc: "n8n MCP triggers and manages workflows on your self-hosted n8n instance.",
    inputs: [
      { name: "instance_url", type: "url", desc: "Public URL of your n8n instance." },
      { name: "api_key", type: "secret", desc: "API key from n8n Settings → API." },
    ],
    useCases: ["Run a workflow with custom payload", "Build a chat-driven ops console", "Schedule automations"],
  },
  zapier: {
    longDesc: "Zapier MCP fires Zap actions from your personal Zapier MCP endpoint.",
    inputs: [{ name: "zapier_mcp_url", type: "url", desc: "Personal Zapier MCP URL from zapier.com/mcp." }],
    useCases: ["Send a Slack message", "Add a row to a Google Sheet", "Kick off any Zap from chat"],
  },
  mailchimp: {
    longDesc: "Mailchimp MCP manages audiences, campaigns, and subscribers via the Mailchimp Marketing API.",
    inputs: [{ name: "api_key", type: "secret", desc: "API key from mailchimp.com → Account → Extras → API keys." }],
    useCases: ["Add subscribers from a signup form", "Send a campaign", "Segment your audience"],
  },
  resend: {
    longDesc: "Resend MCP sends transactional email with React Email templates.",
    inputs: [{ name: "api_key", type: "secret", desc: "API key from resend.com/api-keys." }],
    useCases: ["Send welcome emails", "Magic-link authentication", "Notify users on app events"],
  },
  twilio: {
    longDesc: "Twilio MCP sends SMS, WhatsApp messages, and places voice calls via the Twilio API.",
    inputs: [
      { name: "account_sid", type: "text", desc: "Account SID from Twilio Console." },
      { name: "auth_token", type: "secret", desc: "Auth token from Twilio Console." },
      { name: "phone_number", type: "text", desc: "Optional Twilio phone number in E.164 format." },
    ],
    useCases: ["Send OTP codes by SMS", "Notify users on WhatsApp", "Trigger voice alerts"],
  },
  sendgrid: {
    longDesc: "SendGrid MCP sends transactional and marketing email via the SendGrid v3 API.",
    inputs: [{ name: "api_key", type: "secret", desc: "API key from app.sendgrid.com/settings/api_keys." }],
    useCases: ["Send order confirmations", "Run drip campaigns", "Track delivery and opens"],
  },
};

/* ─── Hint text with clickable URLs ──────────────────────────────────────── */

function HintText({ text }: { text: string }) {
  const urlRe = /https?:\/\/[^\s)]+/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const href = m[0];
    parts.push(
      <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
        <Link className="h-3 w-3" />{href}
      </a>,
    );
    last = urlRe.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className="mt-1 text-xs text-muted-foreground">{parts}</p>;
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

function McpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loadingRows, setLoadingRows] = useState(true);
  const [rows, setRows] = useState<Record<string, IntegrationRow>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "", description: "", mcpServerUrl: "",
    authType: "bearer_token" as "bearer_token" | "api_key" | "none",
    token: "",
  });
  const [customShowToken, setCustomShowToken] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);
  const [customMcps, setCustomMcps] = useState<CustomMcp[]>([]);
  const [customDisconnecting, setCustomDisconnecting] = useState<string | null>(null);
  const [selected, setSelected] = useState<McpDef | null>(null);
  const [backendConns, setBackendConns] = useState<Record<string, { id: string; meta: Record<string, string> }>>({});

  // Registry MCP connection state
  const [connectedSlugs, setConnectedSlugs] = useState<Set<string>>(new Set());
  const [connectTarget, setConnectTarget]   = useState<McpDef | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<McpDef | null>(null);
  const [disconnectBusy,   setDisconnectBusy]   = useState(false);

  const loadConnectedSlugs = async () => {
    try {
      const mcps = await getConnectedMcps();
      setConnectedSlugs(new Set(mcps.map(m => m.providerSlug)));
    } catch { /* not signed in */ }
  };

  const fetchCustomMcps = async () => {
    try {
      const res = await apiGet<{ custom: CustomMcp[] }>("/api/integrations/mcp/custom");
      setCustomMcps(res.custom);
    } catch { /* none */ }
  };

  useEffect(() => {
    if (user?.id) {
      void loadConnectedSlugs();
      void fetchCustomMcps();
    }
  }, [user?.id]);

  const loadBackendConns = async () => {
    try {
      const res = await apiGet<{ integrations: Array<{ id: string; provider: string; status: string; meta: Record<string, string> }> }>(
        "/api/integrations", { silent: true },
      );
      const map: Record<string, { id: string; meta: Record<string, string> }> = {};
      for (const i of res.integrations) {
        if (i.status === "connected") map[i.provider] = { id: i.id, meta: i.meta ?? {} };
      }
      setBackendConns(map);
    } catch { /* none connected */ }
  };
  useEffect(() => { if (user?.id) void loadBackendConns(); }, [user?.id]);

  const connectSupabaseMcp = async (accessToken: string, projectRef: string) => {
    const res = await apiPost<{ toolCount: number; anonKeyResolved: boolean }>(
      "/api/integrations/supabase/mcp",
      { accessToken, projectRef: projectRef || undefined },
      { silent: true },
    );
    await loadBackendConns();
    return res;
  };

  const disconnectProvider = async (providerId: string) => {
    const conn = backendConns[providerId];
    if (!conn) return;
    await apiDelete(`/api/integrations/${conn.id}`, { silent: true });
    setBackendConns(m => { const n = { ...m }; delete n[providerId]; return n; });
    toast.success(`${providerId} disconnected`);
  };

  // Load legacy MCP integrations from Supabase (used for connected-count only)
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
          for (const row of (data ?? []) as IntegrationRow[]) map[row.provider] = row;
          setRows(map);
        }
        setLoadingRows(false);
      });
  }, [user?.id]);

  const handleRegistryConnect = async (creds: Record<string, string>) => {
    if (!connectTarget) return;
    await connectMcp(connectTarget.provider, creds);
    setConnectedSlugs(prev => new Set([...prev, connectTarget.provider]));
    setConnectTarget(null);
    toast.success(`${connectTarget.name} connected!`);
  };

  const handleRegistryDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnectBusy(true);
    try {
      await disconnectMcp(disconnectTarget.provider);
      setConnectedSlugs(prev => { const n = new Set(prev); n.delete(disconnectTarget.provider); return n; });
      toast.success(`${disconnectTarget.name} disconnected`);
      setDisconnectTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnectBusy(false);
    }
  };

  const filtered = (cat: string) =>
    SERVERS.filter(
      (s) =>
        (cat === "All" || s.category === cat) &&
        (s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.desc.toLowerCase().includes(query.toLowerCase())),
    );

  const addCustomMcp = async () => {
    const { name, mcpServerUrl, description, authType, token } = customForm;
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!mcpServerUrl.trim()) { toast.error("MCP Server URL is required"); return; }
    if (!mcpServerUrl.trim().startsWith("https://")) { toast.error("URL must start with https://"); return; }
    if (authType !== "none" && !token.trim()) { toast.error("Token / API Key is required"); return; }

    const slug = "custom-" + name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);

    setCustomSaving(true);
    try {
      await apiPost("/api/integrations/mcp/custom/connect", {
        name: name.trim(), slug, description: description.trim(),
        mcpServerUrl: mcpServerUrl.trim(), authType,
        creds: authType !== "none" ? { token: token.trim() } : {},
      });
      toast.success(`${name} connected!`);
      setCustomForm({ name: "", description: "", mcpServerUrl: "", authType: "bearer_token", token: "" });
      setCustomShowToken(false);
      setCustomOpen(false);
      await fetchCustomMcps();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add MCP");
    } finally {
      setCustomSaving(false);
    }
  };

  const removeCustomMcp = async (slug: string) => {
    setCustomDisconnecting(slug);
    try {
      await apiDelete(`/api/integrations/mcp/custom/${slug}`);
      setCustomMcps(prev => prev.filter(m => m.slug !== slug));
      toast.success("Custom MCP removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setCustomDisconnecting(null);
    }
  };

  const connectedCount = connectedSlugs.size + Object.keys(backendConns).length + customMcps.length;

  if (selected) {
    return (
      <RequireAuth>
        <Shell>
          <McpDetail
            def={selected}
            onBack={() => setSelected(null)}
            connected={!!backendConns[selected.provider]}
            onConnectSupabase={connectSupabaseMcp}
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
                    <Sparkles className="h-4 w-4 text-primary" /> Add Custom MCP
                  </DialogTitle>
                  <DialogDescription>Connect any MCP server to Lampcode</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input
                      value={customForm.name}
                      onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="My Custom MCP"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>MCP Server URL *</Label>
                    <Input
                      value={customForm.mcpServerUrl}
                      onChange={e => setCustomForm(f => ({ ...f, mcpServerUrl: e.target.value }))}
                      placeholder="https://mcp.example.com/sse"
                    />
                    <p className="text-xs text-muted-foreground">Must support SSE or HTTP transport</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      value={customForm.description}
                      onChange={e => setCustomForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="What does this MCP do?"
                      className="min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Authentication</Label>
                    {(["none", "bearer_token", "api_key"] as const).map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="custom-auth-type"
                          value={v}
                          checked={customForm.authType === v}
                          onChange={() => setCustomForm(f => ({ ...f, authType: v }))}
                          className="accent-primary"
                        />
                        {v === "none" ? "None (public server)" : v === "bearer_token" ? "Bearer Token" : "API Key header"}
                      </label>
                    ))}
                  </div>
                  {customForm.authType !== "none" && (
                    <div className="space-y-1.5">
                      <Label>Token / Key *</Label>
                      <div className="relative">
                        <Input
                          type={customShowToken ? "text" : "password"}
                          value={customForm.token}
                          onChange={e => setCustomForm(f => ({ ...f, token: e.target.value }))}
                          placeholder="••••••••••••"
                          className="pr-14"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomShowToken(s => !s)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground"
                        >{customShowToken ? "Hide" : "Show"}</button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300/80">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    🔒 Stored encrypted on our servers
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
                  <Button onClick={() => void addCustomMcp()} disabled={customSaving} className="gap-1">
                    {customSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Add MCP →
                  </Button>
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
                        const isRegistry = s.connectMode === "registry_form";
                        const connected = isRegistry
                          ? connectedSlugs.has(s.provider)
                          : s.connectMode === "supabase_form"
                          ? !!backendConns[s.provider]
                          : rows[s.provider]?.status === "connected";

                        if (isRegistry) {
                          return (
                            <RegistryCard
                              key={s.provider}
                              def={s}
                              connected={connected}
                              onConnect={() => setConnectTarget(s)}
                              onDisconnect={() => setDisconnectTarget(s)}
                            />
                          );
                        }
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

          {/* Custom MCPs */}
          {customMcps.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Custom MCPs</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customMcps.map(m => (
                  <div key={m.slug} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-base">🔌</div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">{m.meta?.["name"] ?? m.slug}</div>
                        <div className="text-xs text-muted-foreground">{m.meta?.["url"] ?? "Custom"}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Connected</Badge>
                      <button
                        type="button"
                        onClick={() => void removeCustomMcp(m.slug)}
                        disabled={customDisconnecting === m.slug}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition"
                      >
                        {customDisconnecting === m.slug ? "Removing…" : "Disconnect"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Registry connect modal */}
        {connectTarget && (
          <RegistryConnectModal
            def={connectTarget}
            open={true}
            onOpenChange={open => { if (!open) setConnectTarget(null); }}
            onConnect={handleRegistryConnect}
          />
        )}

        {/* Registry disconnect confirm */}
        {disconnectTarget && (
          <Dialog open={true} onOpenChange={open => { if (!open) setDisconnectTarget(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disconnect {disconnectTarget.name}?</DialogTitle>
                <DialogDescription>
                  This will stop the AI from using {disconnectTarget.name} tools.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDisconnectTarget(null)}>Cancel</Button>
                <Button variant="destructive" disabled={disconnectBusy} onClick={handleRegistryDisconnect}>
                  {disconnectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </Shell>
    </RequireAuth>
  );
}

/* ─── Store card (supabase / coming_soon) ────────────────────────────────── */

function McpStoreCard({ def, connected, onClick }: { def: McpDef; connected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 text-left backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-lg">{def.emoji}</div>
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
      <span className="mt-auto text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">View details →</span>
    </button>
  );
}

/* ─── Registry card (inline connect/disconnect) ───────────────────────────── */

function RegistryCard({
  def, connected, onConnect, onDisconnect,
}: { def: McpDef; connected: boolean; onConnect: () => void; onDisconnect: () => void }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-primary/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-lg">{def.emoji}</div>
          <div>
            <div className="font-semibold leading-tight">{def.name}</div>
            <div className="text-xs text-muted-foreground">{def.category}</div>
          </div>
        </div>
        {connected ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Connected</Badge>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-[11px] text-muted-foreground transition hover:text-destructive"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onConnect}
            className="h-7 shrink-0 border border-orange-500/30 bg-orange-500/10 px-2.5 text-xs text-orange-400 hover:bg-orange-500/25"
          >
            Connect
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{def.desc}</p>
    </div>
  );
}

/* ─── Registry connect modal ─────────────────────────────────────────────── */

function RegistryConnectModal({
  def, open, onOpenChange, onConnect,
}: {
  def: McpDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (creds: Record<string, string>) => Promise<void>;
}) {
  const [values,   setValues]   = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fields = def.fields ?? [];
  const requiredKeys = fields.filter(f => !f.optional).map(f => f.key);
  const canSubmit = requiredKeys.every(k => (values[k] ?? "").trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const creds: Record<string, string> = {};
      for (const f of fields) {
        const v = values[f.key]?.trim();
        if (v) creds[f.key] = v;
      }
      await onConnect(creds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSaving(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) { setValues({}); setShowPass({}); setError(null); setSaving(false); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{def.emoji}</span> Connect {def.name}
          </DialogTitle>
          <DialogDescription>{def.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map(f => {
            const isPass = f.type === "password";
            const shown  = showPass[f.key] ?? false;
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`mcp-f-${f.key}`}>
                  {f.label}
                  {f.optional && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={`mcp-f-${f.key}`}
                    type={isPass && !shown ? "password" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={isPass ? "pr-14" : ""}
                    name={`mcp-${def.provider}-${f.key}-${Math.random().toString(36).slice(2, 8)}`}
                    autoComplete={isPass ? "new-password" : "off"}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  {isPass && (
                    <button
                      type="button"
                      onClick={() => setShowPass(s => ({ ...s, [f.key]: !s[f.key] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {shown ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                {f.help && <HintText text={f.help} />}
              </div>
            );
          })}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300/80">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Credentials are encrypted server-side. They never reach the browser, the AI reasoning context, or the preview sandbox.</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── MCP detail page (Supabase only) ───────────────────────────────────── */

function McpDetail({
  def, onBack, connected, onConnectSupabase, onDisconnect,
}: {
  def: McpDef;
  onBack: () => void;
  connected: boolean;
  onConnectSupabase: (accessToken: string, projectRef: string) => Promise<{ toolCount: number; anonKeyResolved: boolean }>;
  onDisconnect: () => Promise<void>;
}) {
  const featureBullets: string[] =
    def.features ?? (FEATURES[def.provider]?.map((f) => `${f.title} — ${f.desc}`) ?? []);
  const meta = META[def.provider];

  const [token,      setToken]      = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [busy,       setBusy]       = useState(false);

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

  const handleDisconnect = async () => {
    setBusy(true);
    try { await onDisconnect(); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to MCP Store
      </button>

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

      {meta && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="h-4 w-4 text-primary" /> About
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{meta.longDesc}</p>
        </div>
      )}

      {meta && meta.inputs.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" /> Supported inputs
          </div>
          <div className="divide-y divide-border/50">
            {meta.inputs.map((inp) => (
              <div key={inp.name} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                  <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground/90">{inp.name}</code>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{inp.type}</span>
                </div>
                <p className="text-xs text-muted-foreground sm:flex-1">{inp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta && meta.useCases.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" /> Recommended use-cases
          </div>
          <ul className="space-y-2.5">
            {meta.useCases.map((u) => (
              <li key={u} className="flex items-start gap-2.5 text-sm">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="text-muted-foreground">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        ) : (
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
        )}
      </div>
    </div>
  );
}
