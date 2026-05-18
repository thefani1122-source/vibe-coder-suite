import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type User = { name: string; email: string; initials: string };
type AuthCtx = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (u?: Partial<User>) => void;
  signOut: () => void;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
  apiFetch: (input, init) => fetch(input as RequestInfo, init),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lampcode_user");
      if (raw) setUser(JSON.parse(raw));
      const tk = localStorage.getItem("lampcode_token");
      if (tk) setToken(tk);
    } catch {}
  }, []);

  const signIn = (u?: Partial<User>) => {
    const next: User = {
      name: u?.name ?? "Vibe Coder",
      email: u?.email ?? "vibe@lampcode.dev",
      initials: u?.initials ?? "VC",
    };
    const tk = `lc.${btoa(next.email)}.${Date.now().toString(36)}`;
    localStorage.setItem("lampcode_user", JSON.stringify(next));
    localStorage.setItem("lampcode_token", tk);
    setUser(next);
    setToken(tk);
  };

  const signOut = () => {
    localStorage.removeItem("lampcode_user");
    localStorage.removeItem("lampcode_token");
    setUser(null);
    setToken(null);
  };

  const apiFetch: AuthCtx["apiFetch"] = (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input as RequestInfo, { ...init, headers });
  };

  return (
    <Ctx.Provider
      value={{ user, token, isAuthenticated: !!user, signIn, signOut, apiFetch }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);