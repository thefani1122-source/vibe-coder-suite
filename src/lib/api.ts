import { toast } from "sonner";
import { useAuthStore, getAccessToken } from "@/lib/auth";

const API_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "";

if (!API_URL) {
  console.error(
    "[Lampcode] VITE_BACKEND_URL is not set — all API calls will fail. " +
    "Set this env var in Vercel (Settings → Environment Variables → Production) and redeploy.",
  );
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type ApiOptions = RequestInit & {
  /** Suppress the automatic error toast. */
  silent?: boolean;
  /** Override base URL (defaults to VITE_API_URL). */
  baseUrl?: string;
};

/**
 * Fetch wrapper that sends cookies (credentials: 'include') for Better Auth
 * sessions, redirects to /login on 401, and surfaces errors via toast notifications.
 */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { silent, baseUrl, headers, ...rest } = options;
  const h = new Headers(headers);
  if (rest.body && !h.has("Content-Type") && !(rest.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${baseUrl ?? API_URL}${path}`;

  // Attach Supabase access token if available
  const token = await getAccessToken();
  if (token && !h.has("Authorization")) {
    h.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: h });
  } catch (err) {
    if (!silent) toast.error("Network error. Please try again.");
    throw err;
  }

  if (res.status === 401) {
    useAuthStore.getState().signOut();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError("Unauthorized", 401);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (isJson && payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : typeof payload === "string" && payload
        ? payload
        : `Request failed (${res.status})`);
    if (!silent) toast.error(message);
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export const apiGet = <T = unknown>(path: string, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "GET" });
export const apiPost = <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "POST", body: body == null ? undefined : JSON.stringify(body) });
export const apiPut = <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "PUT", body: body == null ? undefined : JSON.stringify(body) });
export const apiPatch = <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "PATCH", body: body == null ? undefined : JSON.stringify(body) });
export const apiDelete = <T = unknown>(path: string, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "DELETE" });

// ── MCP Connection helpers ────────────────────────────────────────────────────

export type ConnectedMcp = { providerSlug: string; connectedAt: string };

export async function getConnectedMcps(): Promise<ConnectedMcp[]> {
  const res = await apiGet<{ connected: ConnectedMcp[] }>("/api/integrations/mcp");
  return res.connected;
}

export async function connectMcp(slug: string, creds: Record<string, string>): Promise<void> {
  await apiPost(`/api/integrations/mcp/${slug}/connect`, { creds });
}

export async function disconnectMcp(slug: string): Promise<void> {
  await apiDelete(`/api/integrations/mcp/${slug}`);
}
