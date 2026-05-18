import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "";

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
 * Fetch wrapper that injects the auth bearer token, redirects to /login on 401,
 * and surfaces errors via toast notifications.
 */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { silent, baseUrl, headers, ...rest } = options;
  const token = useAuthStore.getState().token;
  const h = new Headers(headers);
  if (token) h.set("Authorization", `Bearer ${token}`);
  if (rest.body && !h.has("Content-Type") && !(rest.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${baseUrl ?? API_URL}${path}`;

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
export const apiDelete = <T = unknown>(path: string, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "DELETE" });