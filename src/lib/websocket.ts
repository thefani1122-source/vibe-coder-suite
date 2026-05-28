import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth";

const WS_URL = import.meta.env.VITE_WS_URL ?? "";

let socket: Socket | null = null;

/** Returns the singleton socket, creating + connecting it on first call. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(WS_URL, {
    autoConnect: false,
    transports: ["websocket"],
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

/** Idempotent connect with the current auth token attached. */
export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Disconnect without destroying the singleton (so listeners survive). */
export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

export { socket };

/**
 * Creates a per-session Socket.IO connection for a build session.
 * Unlike the singleton getSocket(), each call returns a new socket so
 * multiple workspace tabs can coexist without sharing state.
 */
export function createBuildSocket(sessionId: string): Socket {
  const token = useAuthStore.getState().session?.access_token ?? "";
  const s = io(WS_URL, {
    autoConnect: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
    auth: { token },
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    query: sessionId ? { sessionId } : {},
  });
  return s;
}
