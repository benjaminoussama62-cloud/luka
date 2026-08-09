"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AyebaUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  provider: "email" | "google" | "github" | "microsoft" | "apple";
};

type AuthState = {
  user: AyebaUser | null;
  ready: boolean;
  loginOpen: boolean;
  setLoginOpen: (v: boolean) => void;
  loginWithEmail: (email: string, password: string, name?: string) => Promise<string | null>;
  loginWithGoogle: () => void;
  loginWithProvider: (provider: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AyebaUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AyebaUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshSession().finally(() => setReady(true));
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (!auth) return;
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    if (auth === "ok") {
      void refreshSession();
      setLoginOpen(false);
    } else if (auth === "failed" || auth === "config") {
      setLoginOpen(true);
    }
  }, [refreshSession]);

  const loginWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      const mode = name ? "register" : "login";
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, mode }),
      });
      const data = (await res.json()) as { user?: AyebaUser; error?: string };
      if (!res.ok || data.error) return data.error ?? "Erreur de connexion.";
      setUser(data.user ?? null);
      setLoginOpen(false);
      return null;
    },
    [],
  );

  const loginWithGoogle = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const loginWithProvider = useCallback((provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      loginOpen,
      setLoginOpen,
      loginWithEmail,
      loginWithGoogle,
      loginWithProvider,
      logout,
      refreshSession,
    }),
    [user, ready, loginOpen, loginWithEmail, loginWithGoogle, loginWithProvider, logout, refreshSession],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
