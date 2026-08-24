import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  FolderGit2,
  Settings,
  CreditCard,
  Plug,
  BarChart3,
  Tag,
  Lamp,
  Sparkles,
  FileText,
  Lock,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const workspaceNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Projects", url: "/projects", icon: FolderGit2 },
  { title: "MCP", url: "/mcp", icon: Plug },
];

const accountNav = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Usage", url: "/usage", icon: BarChart3 },
  { title: "Pricing", url: "/pricing", icon: Tag },
];

const legalNav = [
  { title: "Docs", url: "/docs", icon: FileText },
  { title: "Privacy", url: "/privacy", icon: Lock },
  { title: "Terms", url: "/terms", icon: ScrollText },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) => currentPath === path;
  const { isAuthenticated } = useAuth();
  // Real shape from GET /api/users/me/billing (Lampcode's billing.ts) — usage
  // is billed in real USD, not an integer credit count.
  const { data } = useQuery({
    queryKey: ["billing"],
    queryFn: () =>
      apiGet<{
        billing: {
          plan: string;
          monthlyLimitUsd: number;
          rolloverUsd: number;
          usageUsd: number;
          remainingUsd: number;
        };
      }>("/api/users/me/billing"),
    staleTime: 60_000,
    retry: false,
    enabled: isAuthenticated,
  });
  const billing = data?.billing;
  const planLabel = billing?.plan
    ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)
    : "Free";
  const availableUsd = (billing?.monthlyLimitUsd ?? 3) + (billing?.rolloverUsd ?? 0);
  const remainingUsd = billing?.remainingUsd ?? availableUsd;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[var(--shadow-glow)]">
            <Lamp className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">Lampcode</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              vibe coder
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Link
          to="/usage"
          className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 p-2 transition hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="flex-1 text-xs">
            <div className="font-medium">{planLabel}</div>
            <div className="text-muted-foreground">
              ${remainingUsd.toFixed(2)} / ${availableUsd.toFixed(2)} left
            </div>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
