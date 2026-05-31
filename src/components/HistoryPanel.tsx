import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Session = {
  sessionId?: string;
  session_id?: string;
  status: "complete" | "error" | "running" | string;
  /** API may return camelCase or snake_case */
  createdAt?: string;
  created_at?: string;
  prompt?: string;
};

export function HistoryPanel({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: () => void;
}) {
  const navigate = useNavigate();

  const { data, isPending, isError } = useQuery<Session[]>({
    queryKey: ["sessions", projectId],
    queryFn: async () => {
      const res = await apiGet<unknown>(`/api/build/${projectId}/sessions`);
      if (Array.isArray(res)) return res as Session[];
      const wrapped = res as Record<string, unknown>;
      const arr = wrapped.sessions ?? wrapped.data ?? [];
      return Array.isArray(arr) ? (arr as Session[]) : [];
    },
    retry: false,
  });

  const sessions = data ?? [];

  const handleSelect = (s: Session) => {
    const sid = s.sessionId ?? s.session_id ?? "";
    navigate({
      to: "/workspace/$projectId",
      params: { projectId },
      search: { sessionId: sid || undefined, mode: "fast" },
    });
    onSelect();
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading…</span>
      </div>
    );
  }

  if (isError || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <Clock className="h-6 w-6 text-white/20" />
        <p className="text-xs text-white/40">
          {isError ? "Couldn't load sessions" : "No builds yet for this project"}
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {sessions.map((s, i) => {
        const sid = s.sessionId ?? s.session_id ?? String(i);
        const isRunning = s.status === "running";
        const StatusIcon =
          s.status === "complete" ? CheckCircle2 :
          s.status === "error"    ? XCircle      : Loader2;
        const iconColor =
          s.status === "complete" ? "text-emerald-400" :
          s.status === "error"    ? "text-red-400"     : "text-amber-400";

        return (
          <button
            key={sid}
            type="button"
            onClick={() => handleSelect(s)}
            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
          >
            <StatusIcon
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                iconColor,
                isRunning && "animate-spin",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/75">
                {s.prompt ?? `Build ${sid.slice(0, 8)}`}
              </p>
              <p className="mt-0.5 text-[10px] text-white/35">
                {s.createdAt ?? s.created_at
                  ? formatDistanceToNow(new Date((s.createdAt ?? s.created_at)!), { addSuffix: true })
                  : "Recently"
                } · {s.status}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
