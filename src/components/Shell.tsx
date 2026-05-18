import { ReactNode, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) {
      const stored = localStorage.getItem("lampcode_user");
      if (!stored) navigate({ to: "/login", replace: true });
    }
  }, [user, pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[120px]" />
        </div>
        <AppSidebar />
        <div className="relative flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-6 py-10">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
