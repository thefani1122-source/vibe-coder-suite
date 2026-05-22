import { useEffect, useState, type ReactNode } from "react";
import { create } from "zustand";
import type { Session, User as SupabaseUser, Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
};

function deriveInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function toUser(su: SupabaseUser): User {
  const meta = (su.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string };
  const name = meta.full_name ?? meta.name ?? su.email ?? "User";
  return {
    id: su.id,
    name,
    email: su.email ?? "",
    initials: deriveInitials(name),
    avatarUrl: meta.avatar_url,
  };
}

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (b: boolean) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  setSession: (s) =>
    set({
      session: s,
      user: s?.user ? toUser(s.user) : null,
      isAuthenticated: !!s,
      loading: false,
    }),
  setLoading: (b) => set({ loading: b }),
  signOut: () => set({ session: null, user: null, isAuthenticated: false, loading: false }),
}));

let authSubscribed = false;

function initAuthListener() {
  if (authSubscribed || typeof window === "undefined") return;
  authSubscribed = true;
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}

/** Hook exposing Supabase Auth state + actions. */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    initAuthListener();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
  };

  const socialSignIn = async (provider: Provider) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  // Back-compat aliases for legacy callers
  const login = (email: string, password: string) => signIn(email, password);
  const register = (payload: { email: string; password: string; name: string }) =>
    signUp(payload.email, payload.password, payload.name);
  const logout = () => signOut();
  const fetchUser = async () => {
    const { data } = await supabase.auth.getSession();
    useAuthStore.getState().setSession(data.session);
    return useAuthStore.getState().user;
  };

  return {
    session,
    user,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    socialSignIn,
    // legacy
    login,
    register,
    logout,
    fetchUser,
  };
}

/** Get the current access token for authenticated API calls. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, force] = useState(0);
  useEffect(() => {
    initAuthListener();
    force((n) => n + 1);
  }, []);
  return <>{children}</>;
}