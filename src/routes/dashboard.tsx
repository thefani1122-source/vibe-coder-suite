import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { PromptComposer } from "@/components/PromptComposer";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  return (
    <RequireAuth>
      <Shell>
        <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
          <PromptComposer />
        </div>
      </Shell>
    </RequireAuth>
  );
}
