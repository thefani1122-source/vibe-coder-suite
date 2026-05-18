import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type User = { name: string; email: string; initials: string };
type AuthCtx = {
  user: User | null;
  signIn: (u?: Partial<User>) => void;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lampcode_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const signIn = (u?: Partial<User>) => {
    const next: User = {
      name: u?.name ?? "Vibe Coder",
      email: u?.email ?? "vibe@lampcode.dev",
      initials: u?.initials ?? "VC",
    };
    localStorage.setItem("lampcode_user", JSON.stringify(next));
    setUser(next);
  };

  const signOut = () => {
    localStorage.removeItem("lampcode_user");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);