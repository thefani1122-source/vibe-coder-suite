import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReactNode } from "react";
import { authClient, dashboardCallbackURL } from "@/lib/auth-client";

export type User = { id?: string; name: string; email: string; initials: string; avatarUrl?: string };

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  /** Load current session from server (Better Auth cookie). */
  fetchUser: () => Promise<User | null>;
  /** Email + password login via Better Auth. */
  login: (email: string, password: string) => Promise<User>;
  /** Register new account via Better Auth. */
  register: (payload: { email: string; password: string; name: string }) => Promise<void>;
  /** Server-side logout (clears Better Auth cookie). */
  logout: () => Promise<void>;
  /** Local-only sign-in helper (used by mocked /login flow or social redirects). */
  signIn: (u?: Partial<User>) => void;
  /** Alias of `logout` (sync, no network). */
  signOut: () => void;
  setSession: (user: User | null) => void;
};

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
      isAuthenticated: false,

      setSession: (user) => set({ user, isAuthenticated: !!user }),

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
        set({ user: next, isAuthenticated: true });
      },

      signOut: () => set({ user: null, isAuthenticated: false }),

      login: async (email, password) => {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
          callbackURL: dashboardCallbackURL,
        });
        if (error) throw new Error(error.message || "Login failed");
        const u = data?.user;
        const name = u?.name ?? email;
        const user: User = {
          id: u?.id,
          name,
          email: u?.email ?? email,
          initials: deriveInitials(name),
          avatarUrl: (u as { image?: string } | undefined)?.image,
        };
        set({ user, isAuthenticated: true });
        return user;
      },

      register: async (payload) => {
        const { error } = await authClient.signUp.email({
          email: payload.email,
          password: payload.password,
          name: payload.name,
          callbackURL: dashboardCallbackURL,
        });
        if (error) throw new Error(error.message || "Registration failed");
      },

      logout: async () => {
        try {
          await authClient.signOut();
        } catch {
          /* ignore network errors on logout */
        }
        set({ user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const { data, error } = await authClient.getSession();
        if (error || !data?.user) {
          set({ user: null, isAuthenticated: false });
          return null;
        }
        const u = data.user;
        const user: User = {
          id: u.id,
          name: u.name ?? u.email,
          email: u.email,
          initials: deriveInitials(u.name ?? u.email),
          avatarUrl: (u as { image?: string }).image,
        };
        set({ user, isAuthenticated: true });
        return user;
      },
    }),
    {
      name: "lampcode_auth",
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

/** Drop-in replacement for the previous Context API. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const register = useAuthStore((s) => s.register);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  return { user, isAuthenticated, login, logout, fetchUser, register, signIn, signOut };
}

/** Kept as a no-op pass-through for backwards compatibility with __root.tsx. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
