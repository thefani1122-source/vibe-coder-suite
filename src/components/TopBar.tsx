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
import { LifeBuoy, Zap, Settings, LogOut, User, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function TopBar() {
  const { user, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSignIn = () => {
    const n = name.trim() || "Vibe Coder";
    const e = email.trim() || "vibe@lampcode.dev";
    const initials = n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "VC";
    signIn({ name: n, email: e, initials });
    setOpen(false);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-3 backdrop-blur-xl">
      <SidebarTrigger />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground font-semibold hover:opacity-90"
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <LifeBuoy className="h-4 w-4" />
          Support
        </Button>

        {!user ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="ml-1"
              onClick={() => setOpen(true)}
            >
              Sign in
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Sign in to Lampcode</DialogTitle>
                  <DialogDescription>Welcome back, vibe coder.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="signin-name">Name</Label>
                    <Input id="signin-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vibe Coder" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lampcode.dev" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSignIn} className="w-full bg-gradient-to-r from-primary to-[oklch(0.72_0.20_35)] text-primary-foreground">
                    Sign in
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
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
            <DropdownMenuItem><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem><CreditCard className="mr-2 h-4 w-4" /> Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  );
}