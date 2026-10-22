import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type AuthValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: (returnTo?: string) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      const data = (await response.json()) as { user: AuthUser | null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  const value = useMemo<AuthValue>(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login: (returnTo = window.location.pathname) => { window.location.assign(`/api/login?returnTo=${encodeURIComponent(returnTo)}`); },
    logout: (returnTo = window.location.pathname) => { window.location.assign(`/api/logout?returnTo=${encodeURIComponent(returnTo)}`); },
    refresh,
  }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}