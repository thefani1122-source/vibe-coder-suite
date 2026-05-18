import { Link, useRouterState } from "@tanstack/react-router";
import {
  Plus,
  LayoutDashboard,
  FolderGit2,
  Settings,
  CreditCard,
  Plug,
  BarChart3,
  Tag,
  Lamp,
  Sparkles,
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
import { Button } from "@/components/ui/button";

const workspaceNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Projects", url: "/projects", icon: FolderGit2 },
  { title: "MCP", url: "/mcp", icon: Plug },
];

const accountNav = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Usage", url: "/usage", icon: BarChart3 },
  { title: "Pricing", url: "/pricing", icon: Tag },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) => currentPath === path;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
            <Lamp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">Lampcode</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">vibe coder</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 pt-2">
            <Button asChild className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground font-semibold hover:opacity-90 shadow-[var(--shadow-glow)]">
              <Link to="/dashboard">
                <Plus className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">New App</span>
              </Link>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:hidden">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="flex-1 text-xs">
            <div className="font-medium">Free plan</div>
            <div className="text-muted-foreground">12 / 50 credits</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}