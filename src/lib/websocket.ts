import { io, Socket } from "socket.io-client";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  "";

// Legacy WS_URL export kept for logging
export const WS_URL = BACKEND_URL;

// ─── Global singleton (used by PlanInterview and other non-build flows) ────────

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(BACKEND_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  socket.on("connect_error", (err) => {
    if (import.meta.env.DEV) console.warn("[ws] connect_error", err.message);
  });

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

export { socket };

// ─── Per-session build socket ──────────────────────────────────────────────────

/**
 * Creates a dedicated Socket.IO socket for a single build session.
 * Connects to the /build namespace with sessionId in the handshake query
 * so the backend can immediately route to the right room without waiting
 * for a join event.
 *
 * The caller is responsible for calling socket.disconnect() on cleanup.
 */
export function createBuildSocket(sessionId: string | undefined): Socket {
  const base = BACKEND_URL;
  console.log("[WS] createBuildSocket — base:", base || "(empty — check VITE_BACKEND_URL)", "sessionId:", sessionId);

  // withCredentials is intentionally false — /build namespace is auth-free.
  // Sending cookies causes UNAUTHORIZED from the backend auth middleware.
  return io(`${base}/build`, {
    query: { sessionId: sessionId ?? "" },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: false,
    autoConnect: true,
  });
}
