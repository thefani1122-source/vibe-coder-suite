import { Link } from "@tanstack/react-router";
import { Plus, Clock, BarChart3, Tag, Lamp, Sparkles, Folder } from "lucide-react";
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

const recent = [
  { name: "Neon Portfolio", url: "#" },
  { name: "Crypto Tracker", url: "#" },
  { name: "AI Notes App", url: "#" },
  { name: "Lo-fi Player", url: "#" },
];

const nav = [
  { title: "Usage", url: "/usage", icon: BarChart3 },
  { title: "Pricing", url: "/pricing", icon: Tag },
];

export function AppSidebar() {
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
            <Button className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground font-semibold hover:opacity-90 shadow-[var(--shadow-glow)]">
              <Plus className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">New App</span>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" /> Recent Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recent.map((p) => (
                <SidebarMenuItem key={p.name}>
                  <SidebarMenuButton asChild>
                    <a href={p.url} className="group/item">
                      <Folder className="h-4 w-4 text-muted-foreground group-hover/item:text-primary" />
                      <span className="truncate">{p.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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