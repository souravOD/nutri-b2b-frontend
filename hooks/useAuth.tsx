"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/appwrite";

type User = { $id: string; name?: string | null; email: string } | null;
type Ctx = {
  user: User; loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};
const C = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try { const u = await account.get(); setUser({ $id: u.$id, name: u.name, email: u.email }); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const signIn = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password); await refresh();
  };
  const signUp = async (name: string, email: string, password: string) => {
    await account.create("unique()", email, password, name);
    await account.createEmailPasswordSession(email, password); await refresh();
  };
  const signOut = async () => { await account.deleteSession("current"); await refresh(); };

  const v = useMemo(() => ({ user, loading, signIn, signUp, signOut, refresh }), [user, loading]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useAuth() { const v = useContext(C); if (!v) throw new Error("useAuth outside provider"); return v; }
