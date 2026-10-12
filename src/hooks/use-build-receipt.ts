import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BuildReceiptOutcome } from "@/lib/build-receipt";

interface BuildStatusResponse {
  status: string;
  buildOutcome?: BuildReceiptOutcome | null;
}

const isTerminal = (status?: string) =>
  ["complete", "completed", "error", "failed", "cancelled", "canceled"].includes(status ?? "");

/** Session-keyed cache and cancellation keep old responses out of a new
 * build. This also works for historical sessions with an existing preview. */
export function useBuildReceipt(sessionId: string | undefined, isBuilding: boolean) {
  const { data, refetch } = useQuery({
    queryKey: ["build-receipt", sessionId],
    enabled: Boolean(sessionId),
    queryFn: ({ signal }) =>
      apiGet<BuildStatusResponse>(`/api/build/${sessionId}/status`, { signal, silent: true }),
    refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : 3000),
    retry: 1,
  });
  // The completion event can arrive between polling ticks. Fetch persisted
  // evidence then; do not assume the socket summary includes the audit.
  useEffect(() => {
    if (sessionId && !isBuilding) void refetch();
  }, [sessionId, isBuilding, refetch]);
  return isTerminal(data?.status) ? data?.buildOutcome : undefined;
}
