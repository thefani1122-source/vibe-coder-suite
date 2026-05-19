import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Users,
  Shield,
  CreditCard,
  Database,
  Zap,
  Link as LinkIcon,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Sparkles,
  Loader2,
  Brain,
  Palette,
  Rocket,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { connectSocket } from "@/lib/websocket";
import type { Socket } from "socket.io-client";

type Option = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  custom?: boolean;
};

type Question = {
  id: string;
  title: string;
  description: string;
  columns?: 1 | 2;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    id: "audience",
    title: "App kiske liye hai?",
    description: "This decides the overall UX, onboarding and pricing model.",
    options: [
      { id: "b2b", label: "B2B", description: "Teams, companies, workspaces", icon: Users },
      { id: "b2c", label: "B2C", description: "Individual consumers", icon: Users },
      { id: "internal", label: "Internal Tool", description: "Just for your team", icon: Settings2 },
      { id: "custom", label: "Custom", description: "Describe your own", icon: Sparkles, custom: true },
    ],
  },
  {
    id: "roles",
    title: "User types?",
    description: "Defines auth, permissions and dashboards.",
    options: [
      { id: "single", label: "Single Role", description: "Everyone is equal", icon: Users },
      { id: "rbac", label: "Role Based", description: "Admin + User", icon: Shield },
      { id: "multi", label: "Multi-tenant", description: "Orgs with members", icon: Users },
      { id: "custom", label: "Custom", description: "Describe roles", icon: Sparkles, custom: true },
    ],
  },
  {
    id: "isolation",
    title: "Data isolation?",
    description: "How user/tenant data is separated.",
    options: [
      { id: "row", label: "Row Level Security", description: "Per-user rows via RLS", icon: Database },
      { id: "schema", label: "Per-tenant schema", description: "Separate schemas", icon: Database },
      { id: "shared", label: "Shared", description: "All users see same data", icon: Database },
      { id: "custom", label: "Custom", description: "Describe isolation", icon: Sparkles, custom: true },
    ],
  },
  {
    id: "payments",
    title: "Payments?",
    description: "Monetisation strategy.",
    options: [
      { id: "none", label: "No payments", description: "Free product", icon: X },
      { id: "subs", label: "Subscriptions", description: "Stripe recurring", icon: CreditCard },
      { id: "onetime", label: "One-time", description: "Pay per purchase", icon: CreditCard },
      { id: "custom", label: "Custom", description: "Describe billing", icon: Sparkles, custom: true },
    ],
  },
  {
    id: "sensitive",
    title: "Sensitive data?",
    description: "Affects encryption, audit logs and compliance.",
    options: [
      { id: "none", label: "None", description: "Public-ish content", icon: X },
      { id: "pii", label: "PII", description: "Names, emails, addresses", icon: Shield },
      { id: "financial", label: "Financial", description: "Cards, invoices", icon: Shield },
      { id: "health", label: "Health / Legal", description: "HIPAA / GDPR scope", icon: Shield },
    ],
  },
  {
    id: "scale",
    title: "Expected scale?",
    description: "Drives infra choices and caching.",
    options: [
      { id: "mvp", label: "MVP", description: "<1k users", icon: Zap },
      { id: "growth", label: "Growth", description: "1k–100k users", icon: Zap },
      { id: "scale", label: "Scale", description: "100k+ users", icon: Zap },
      { id: "custom", label: "Custom", description: "Describe load", icon: Sparkles, custom: true },
    ],
  },
  {
    id: "integrations",
    title: "Integrations needed?",
    description: "Third party services to wire up.",
    columns: 1,
    options: [
      { id: "email", label: "Email (Resend)", description: "Transactional email", icon: LinkIcon },
      { id: "storage", label: "File Storage", description: "Supabase storage / S3", icon: LinkIcon },
      { id: "ai", label: "AI Gateway", description: "LLM features", icon: Brain },
      { id: "custom", label: "Custom", description: "List integrations", icon: Sparkles, custom: true },
    ],
  },
];

type Answer = { questionId: string; optionId: string; custom?: string };

type Phase = "interview" | "loading-contract" | "contract" | "loading-tasks" | "tasks";

type TaskItem = { name: string; agent: string; icon: LucideIcon; time: string };

const TASKS: { phase: string; items: TaskItem[] }[] = [
  {
    phase: "Foundation",
    items: [
      { name: "Project scaffolding", agent: "Planner", icon: Brain, time: "2 min" },
      { name: "Database schema", agent: "DB Agent", icon: Database, time: "4 min" },
    ],
  },
  {
    phase: "Build",
    items: [
      { name: "Auth + roles", agent: "Backend", icon: Shield, time: "6 min" },
      { name: "UI shell + pages", agent: "Frontend", icon: Palette, time: "10 min" },
      { name: "Core features", agent: "Frontend", icon: Settings2, time: "12 min" },
    ],
  },
  {
    phase: "Verify",
    items: [
      { name: "Security checklist", agent: "Security", icon: Shield, time: "5 min" },
      { name: "Smoke tests", agent: "QA", icon: Check, time: "3 min" },
    ],
  },
  {
    phase: "Deploy",
    items: [{ name: "Publish preview", agent: "Deploy", icon: Rocket, time: "3 min" }],
  },
];

export interface PlanInterviewProps {
  open: boolean;
  initialPrompt?: string;
  onClose: () => void;
  onComplete: (payload: { answers: Answer[]; prompt: string }) => void;
}

export function PlanInterview({ open, initialPrompt = "", onClose, onComplete }: PlanInterviewProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [phase, setPhase] = useState<Phase>("interview");
  const [changes, setChanges] = useState("");
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [serverContract, setServerContract] = useState<string | null>(null);
  const [serverTasks, setServerTasks] = useState<typeof TASKS | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const progress = Math.round(((step + 1) / total) * 100);

  // Reset state whenever the overlay re-opens.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAnswers([]);
    setSelected(null);
    setCustomText("");
    setPhase("interview");
    setChanges("");
    setRequestingChanges(false);
    setServerContract(null);
    setServerTasks(null);
    const id = `sess-${Math.random().toString(36).slice(2, 10)}`;
    setSessionId(id);
  }, [open]);

  // Wire WebSocket: connect on open, listen for server-driven interview events.
  useEffect(() => {
    if (!open || !sessionId) return;
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setLiveConnected(true);
      socket.emit("interview:start", { sessionId, prompt: initialPrompt });
    };
    const onDisconnect = () => setLiveConnected(false);

    const onQuestion = (payload: { sessionId?: string; index?: number; progress?: number }) => {
      if (payload?.sessionId && payload.sessionId !== sessionId) return;
      if (typeof payload?.index === "number") {
        setStep(Math.max(0, Math.min(QUESTIONS.length - 1, payload.index)));
      }
      setPhase("interview");
    };
    const onContract = (payload: { sessionId?: string; contract?: string }) => {
      if (payload?.sessionId && payload.sessionId !== sessionId) return;
      if (payload?.contract) setServerContract(payload.contract);
      setPhase("contract");
    };
    const onApproved = (payload: { sessionId?: string; tasks?: typeof TASKS }) => {
      if (payload?.sessionId && payload.sessionId !== sessionId) return;
      if (payload?.tasks) setServerTasks(payload.tasks);
      setPhase("tasks");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("interview:question", onQuestion);
    socket.on("interview:contract", onContract);
    socket.on("interview:approved", onApproved);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("interview:question", onQuestion);
      socket.off("interview:contract", onContract);
      socket.off("interview:approved", onApproved);
    };
  }, [open, sessionId, initialPrompt]);

  // Restore the previously selected option when navigating back/forward.
  useEffect(() => {
    if (phase !== "interview") return;
    const existing = answers.find((a) => a.questionId === q.id);
    setSelected(existing?.optionId ?? null);
    setCustomText(existing?.custom ?? "");
  }, [step, phase, answers, q.id]);

  // Keyboard nav inside the modal.
  useEffect(() => {
    if (!open || phase !== "interview") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selected) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        const idx = q.options.findIndex((o) => o.id === selected);
        const nextIdx = Math.min(q.options.length - 1, idx + 1);
        setSelected(q.options[Math.max(0, nextIdx)].id);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        const idx = q.options.findIndex((o) => o.id === selected);
        const prevIdx = Math.max(0, idx - 1);
        setSelected(q.options[prevIdx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, selected, step]);

  const saveCurrent = (optionId: string, custom?: string): Answer[] => {
    const updated = [...answers.filter((a) => a.questionId !== q.id), { questionId: q.id, optionId, custom }];
    setAnswers(updated);
    return updated;
  };

  const next = () => {
    if (!selected) return;
    const updated = saveCurrent(selected, customText.trim() || undefined);
    socketRef.current?.emit("interview:answer", {
      sessionId,
      questionId: q.id,
      optionId: selected,
      custom: customText.trim() || undefined,
      index: step,
      answers: updated,
    });
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      setPhase("loading-contract");
      // Fallback if server doesn't push interview:contract within 4s.
      const t = setTimeout(() => setPhase("contract"), 4000);
      socketRef.current?.once("interview:contract", () => clearTimeout(t));
    }
  };

  const skip = () => {
    const def = q.options[0].id;
    const updated = saveCurrent(def);
    socketRef.current?.emit("interview:answer", {
      sessionId,
      questionId: q.id,
      optionId: def,
      skipped: true,
      index: step,
      answers: updated,
    });
    if (step < total - 1) setStep(step + 1);
    else {
      setPhase("loading-contract");
      const t = setTimeout(() => setPhase("contract"), 4000);
      socketRef.current?.once("interview:contract", () => clearTimeout(t));
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const approve = () => {
    socketRef.current?.emit("interview:approve", { sessionId, approved: true });
    setPhase("loading-tasks");
    const t = setTimeout(() => setPhase("tasks"), 4000);
    socketRef.current?.once("interview:approved", () => clearTimeout(t));
  };

  const startBuild = () => {
    onComplete({ answers, prompt: initialPrompt });
  };

  const contract = useMemo(
    () => serverContract ?? buildContract(answers, initialPrompt),
    [serverContract, answers, initialPrompt],
  );
  const tasks = serverTasks ?? TASKS;
  const totalMinutes = tasks.reduce(
    (sum, p) => sum + p.items.reduce((s, t) => s + parseInt(t.time, 10), 0),
    0,
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-[90vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              Project Planning Interview
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Answer 7 questions so AI can build exactly what you need
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        {phase === "interview" && (
          <div className="border-b border-border px-6 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Step {step + 1} of {total}
              </span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="flex gap-1">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i < step
                      ? "bg-primary"
                      : i === step
                      ? "bg-primary/70"
                      : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {phase === "interview" && (
              <motion.div
                key={`q-${step}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="h-full overflow-y-auto px-6 py-6"
              >
                <h3 className="text-2xl font-bold tracking-tight">{q.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{q.description}</p>

                <div
                  className={cn(
                    "mt-6 grid gap-3",
                    (q.columns ?? 2) === 2 ? "sm:grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {q.options.map((opt) => {
                    const Icon = opt.icon ?? Sparkles;
                    const isSelected = selected === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelected(opt.id)}
                        className={cn(
                          "group flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-[0_0_0_3px_oklch(0.65_0.20_280/0.15)]"
                            : "border-border bg-card/40 hover:border-primary/40 hover:bg-primary/5",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{opt.label}</span>
                          {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </div>
                        {opt.description && (
                          <p className="pl-10 text-xs text-muted-foreground">{opt.description}</p>
                        )}
                        {opt.custom && isSelected && (
                          <Input
                            autoFocus
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Describe your own..."
                            className="mt-2 h-8 text-xs"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {(phase === "loading-contract" || phase === "loading-tasks") && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">
                  {phase === "loading-contract" ? "Drafting your project contract..." : "Dividing tasks across agents..."}
                </p>
              </motion.div>
            )}

            {phase === "contract" && (
              <motion.div
                key="contract"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col"
              >
                <ScrollArea className="flex-1 px-6 py-6">
                  <h3 className="text-xl font-bold">Project Contract</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Review what AI understood. Approve to start the build.
                  </p>
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-foreground/90">
{contract}
                  </pre>

                  <h4 className="mt-6 text-sm font-semibold">Mandatory Security Checklist</h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {[
                      "Row-level security on all user tables",
                      "Auth tokens stored httpOnly",
                      "Input validation on every endpoint",
                      "Secrets stored in Lovable Cloud secrets",
                      "Rate limiting on auth endpoints",
                    ].map((c) => (
                      <li key={c} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> {c}
                      </li>
                    ))}
                  </ul>

                  {requestingChanges && (
                    <div className="mt-4">
                      <label className="text-xs font-medium">Requested changes</label>
                      <Textarea
                        value={changes}
                        onChange={(e) => setChanges(e.target.value)}
                        placeholder="What should we change?"
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2 border-t border-border bg-card/60 px-6 py-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRequestingChanges((v) => !v)}
                  >
                    ✏️ Request Changes
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-600/90"
                    onClick={approve}
                  >
                    <Check className="h-4 w-4" /> Approve &amp; Start Build
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col"
              >
                <ScrollArea className="flex-1 px-6 py-6">
                  <h3 className="text-xl font-bold">Task Plan</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Agents are ready. Build will start automatically.
                  </p>
                  <div className="mt-5 space-y-5">
                    {TASKS.map((p) => (
                      <div key={p.phase}>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {p.phase}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {p.items.map((t) => {
                            const Icon = t.icon;
                            return (
                              <div
                                key={t.name}
                                className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm font-medium">{t.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{t.agent}</div>
                                </div>
                                <span className="text-[11px] text-muted-foreground">{t.time}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center gap-3 border-t border-border bg-card/60 px-6 py-4">
                  <div className="text-xs text-muted-foreground">
                    Estimated: ~{totalMinutes} minutes
                  </div>
                  <Button className="ml-auto" onClick={startBuild}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Build Starting...
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer (interview only) */}
        {phase === "interview" && (
          <div className="flex items-center justify-between gap-2 border-t border-border bg-card/60 px-6 py-3">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={skip}>
                <SkipForward className="h-4 w-4" /> Skip for now
              </Button>
              <Button size="sm" onClick={next} disabled={!selected}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Loading progress bar in interview phase */}
        {phase === "interview" && (
          <Progress value={progress} className="absolute bottom-0 left-0 h-0.5 w-full rounded-none bg-transparent" />
        )}
      </motion.div>
    </div>
  );
}

function buildContract(answers: Answer[], prompt: string): string {
  const lookup = (qId: string) => {
    const a = answers.find((x) => x.questionId === qId);
    if (!a) return "—";
    const q = QUESTIONS.find((q) => q.id === qId);
    const opt = q?.options.find((o) => o.id === a.optionId);
    return a.custom ? `${opt?.label ?? a.optionId} (${a.custom})` : opt?.label ?? a.optionId;
  };
  return [
    `Prompt:        ${prompt || "—"}`,
    `App Type:      ${lookup("audience")}`,
    `User Roles:    ${lookup("roles")}`,
    `Data Isolation:${lookup("isolation")}`,
    `Payments:      ${lookup("payments")}`,
    `Sensitive Data:${lookup("sensitive")}`,
    `Scale:         ${lookup("scale")}`,
    `Integrations:  ${lookup("integrations")}`,
  ].join("\n");
}