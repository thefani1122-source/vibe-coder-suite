import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/plan/$sessionId")({
  validateSearch: (search: Record<string, unknown>) => ({
    projectId: typeof search.projectId === "string" ? search.projectId : "",
  }),
  component: PlanPage,
});

function PlanPage() {
  const { sessionId } = Route.useParams();
  const { projectId } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <ClipboardList className="h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">Plan Mode — Interview coming soon</h1>
        <p className="text-sm text-muted-foreground">
          Session: {sessionId} · Project: {projectId}
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </RequireAuth>
  );
}
