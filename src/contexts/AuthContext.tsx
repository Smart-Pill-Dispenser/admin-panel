import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { adminEnsureFreshAccessToken, setAuthTokenGetter, setOnUnauthorized } from "@/api/client";
import { adminApi } from "@/api/admin";
import { AdminApiError } from "@/api/client";

const TOKEN_KEY = "admin_access_token";
const REFRESH_KEY = "admin_refresh_token";
const USER_KEY = "admin_user";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function loadStoredAuth(): { token: string | null; user: AuthContextType["user"] } {
  const token = localStorage.getItem(TOKEN_KEY);
  const stored = localStorage.getItem(USER_KEY);
  const user = stored ? (JSON.parse(stored) as AuthContextType["user"]) : null;
  return { token, user };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType["user"]>(null);

  // Set token getter immediately so the first API request (e.g. Dashboard) has the token
  setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    void (async () => {
      await adminEnsureFreshAccessToken();
      const { token, user: u } = loadStoredAuth();
      if (token && u) {
        setIsAuthenticated(true);
        setUser(u);
      }
    })();
  }, []);

  const logoutAndClear = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    setOnUnauthorized(logoutAndClear);
    return () => setOnUnauthorized(() => {});
  }, [logoutAndClear]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await adminApi.login(email, password);
      // API Gateway Cognito authorizers commonly accept the ID token for app-level authorization.
      // Prefer idToken when available; fall back to accessToken.
      const token = res.idToken ?? res.accessToken;
      if (!token) return false;
      const displayName = email.split("@")[0] || "Admin";
      const u = { email, name: displayName, role: "admin" };
      localStorage.setItem(TOKEN_KEY, token);
      if (res.refreshToken) localStorage.setItem(REFRESH_KEY, res.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "UNAUTHENTICATED") {
        return false;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    logoutAndClear();
  }, [logoutAndClear]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
