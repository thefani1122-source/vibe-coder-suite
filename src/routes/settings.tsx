import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences.</p>
        </div>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Display name</Label><Input id="name" defaultValue="Vibe Coder" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" defaultValue="vibe@lampcode.dev" /></div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Email notifications</div><div className="text-xs text-muted-foreground">Project updates & weekly digest.</div></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Beta features</div><div className="text-xs text-muted-foreground">Try experimental vibes early.</div></div><Switch /></div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
