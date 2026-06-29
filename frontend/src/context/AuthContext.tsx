import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { User } from '../api/auth';
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
} from '../api/auth';
import { getAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: Record<string, unknown>;
  hasPerm: (...keys: string[]) => boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string): Promise<User> => {
      const u = await apiLogin(username, password);
      setUser(u);
      return u;
    },
    [],
  );

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const hasPerm = useCallback(
    (...keys: string[]) => {
      if (!user) return false;
      if (user.is_admin || ADMIN_ROLES.has(user.role)) return true;
      const perms = user.permissions ?? {};
      if (perms.full_access) return true;
      return keys.every((k) => Boolean(perms[k]));
    },
    [user],
  );

  const value: AuthState = useMemo(() => {
    const isAdminVal = user ? (user.is_admin || ADMIN_ROLES.has(user.role)) : false;
    return {
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: isAdminVal,
      permissions: user?.permissions ?? {},
      hasPerm,
      login,
      logout,
      refreshUser,
    };
  }, [user, loading, hasPerm, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
