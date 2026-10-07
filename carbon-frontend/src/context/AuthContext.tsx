import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { User } from "../types";
import { auth } from "../services/api";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (u: any): User | null => {
  if (!u) return null;
  const name = u.full_name || u.fullName || u.email?.split("@")[0] || "Authenticated User";
  const orgId = u.organization_id || u.organizationId || 1;
  return {
    ...u,
    full_name: name,
    fullName: name,
    organization_id: orgId,
    organizationId: orgId,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (token) {
      auth.me()
        .then((response) => {
          if (response && response.success && response.data) {
            setUser(normalizeUser(response.data));
          } else {
            localStorage.removeItem("access_token");
            setUser(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const loginRes = await auth.login(email, password);
    if (!loginRes || !loginRes.success) {
      throw new Error(loginRes?.message || "Invalid email address or password.");
    }

    const meRes = await auth.me();
    if (meRes && meRes.success && meRes.data) {
      setUser(normalizeUser(meRes.data));
    } else if (loginRes.data?.user) {
      setUser(normalizeUser(loginRes.data.user));
    } else {
      throw new Error("Failed to load user profile.");
    }
  };

  const logout = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}