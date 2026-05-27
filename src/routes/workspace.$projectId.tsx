import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  return <div>Workspace</div>;
}
