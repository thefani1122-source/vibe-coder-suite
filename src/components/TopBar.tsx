import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LifeBuoy, Zap, Settings, LogOut, User, CreditCard, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBack = pathname !== "/" && pathname !== "/dashboard";

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <SidebarTrigger />
        {showBack && (
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground font-semibold hover:opacity-90"
        >
          <Link to="/pricing">
            <Zap className="h-3.5 w-3.5" />
            Upgrade
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <LifeBuoy className="h-4 w-4" />
          Support
        </Button>

        {!user ? (
          <Button size="sm" variant="outline" className="ml-1" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full p-1 transition hover:bg-secondary">
              <Avatar className="h-8 w-8 ring-2 ring-primary/40">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-semibold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard"><User className="mr-2 h-4 w-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/billing"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  );
}