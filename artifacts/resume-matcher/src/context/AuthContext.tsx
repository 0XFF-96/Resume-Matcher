import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { withAppBase } from "@/lib/api-base";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  const text = await res.text();
  let data: Record<string, unknown> = {};

  if (text.trim()) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {
        error: `Server returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
      };
    }
  } else {
    data = {
      error:
        res.status === 404
          ? "API not reachable (empty response). In local dev: run `make dev-api` in another terminal so the backend is on port 3001; Vite proxies /api to it."
          : `Empty response from server (HTTP ${res.status})`,
    };
  }

  return { ok: res.ok, status: res.status, data };
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const e = data.error;
  return typeof e === "string" && e.length > 0 ? e : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isFetching = useRef(false);

  const refetchUser = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const { data } = await fetchJson(withAppBase("/api/auth/user"));
      setUser(
        data.authenticated === true && data.user != null
          ? (data.user as AuthUser)
          : null,
      );
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data } = await fetchJson(withAppBase("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!ok) throw new Error(apiErrorMessage(data, "Login failed"));
    setUser(data.user as AuthUser);
    setIsAuthModalOpen(false);
  }, []);

  const register = useCallback(async (email: string, password: string, firstName?: string) => {
    const { ok, data } = await fetchJson(withAppBase("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName }),
    });
    if (!ok) throw new Error(apiErrorMessage(data, "Registration failed"));
    setUser(data.user as AuthUser);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    await fetchJson(withAppBase("/api/auth/logout"), { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
