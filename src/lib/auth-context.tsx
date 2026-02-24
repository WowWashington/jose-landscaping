"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AppUser } from "@/types";

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (name: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isOwner: boolean;
  isCoordinator: boolean;
  isWorker: boolean;
  canEdit: boolean; // owner or coordinator
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: async () => {},
  refresh: async () => {},
  isOwner: false,
  isCoordinator: false,
  isWorker: false,
  canEdit: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(name: string, pin: string) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return { ok: true };
      } else {
        const data = await res.json();
        return { ok: false, error: data.error ?? "Login failed" };
      }
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
  }

  const role = user?.role ?? "worker";
  const isOwner = role === "owner";
  const isCoordinator = role === "coordinator";
  const isWorker = role === "worker";
  const canEdit = isOwner || isCoordinator;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refresh,
        isOwner,
        isCoordinator,
        isWorker,
        canEdit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
