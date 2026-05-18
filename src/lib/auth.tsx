import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReactNode } from "react";

export type User = { id?: string; name: string; email: string; initials: string; avatarUrl?: string };

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<User | null>;
  /** Local-only sign-in helper (used by mocked /login flow). */
  signIn: (u?: Partial<User>) => void;
  /** Alias of `logout` (sync, no network). */
  signOut: () => void;
  setSession: (user: User | null, token: string | null) => void;
};

const API_URL = import.meta.env.VITE_API_URL ?? "";

function deriveInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setSession: (user, token) =>
        set({ user, token, isAuthenticated: !!user }),

      signIn: (u) => {
        const name = u?.name ?? "Vibe Coder";
        const email = u?.email ?? "vibe@lampcode.dev";
        const next: User = {
          name,
          email,
          initials: u?.initials ?? deriveInitials(name),
          avatarUrl: u?.avatarUrl,
          id: u?.id,
        };
        const token = `lc.${btoa(email)}.${Date.now().toString(36)}`;
        set({ user: next, token, isAuthenticated: true });
      },

      signOut: () => set({ user: null, token: null, isAuthenticated: false }),

      login: async (email, password) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Login failed");
          throw new Error(msg || "Login failed");
        }
        const data = (await res.json()) as { token: string; user: Partial<User> & { name: string; email: string } };
        const user: User = {
          ...data.user,
          name: data.user.name,
          email: data.user.email,
          initials: data.user.initials ?? deriveInitials(data.user.name),
        };
        set({ user, token: data.token, isAuthenticated: true });
        return user;
      },

      logout: async () => {
        const { token } = get();
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        } catch {
          /* ignore network errors on logout */
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const { token } = get();
        if (!token) return null;
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          set({ user: null, token: null, isAuthenticated: false });
          return null;
        }
        if (!res.ok) return get().user;
        const data = (await res.json()) as Partial<User> & { name: string; email: string };
        const user: User = {
          ...data,
          initials: data.initials ?? deriveInitials(data.name),
        };
        set({ user, isAuthenticated: true });
        return user;
      },
    }),
    {
      name: "lampcode_auth",
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

/** Drop-in replacement for the previous Context API. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  return { user, token, isAuthenticated, login, logout, fetchUser, signIn, signOut };
}

/** Kept as a no-op pass-through for backwards compatibility with __root.tsx. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}