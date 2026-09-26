import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from '../lib/api';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;
    let cancelled = false;
    void api<AuthUser>('/api/auth/me')
      .then((me) => {
        if (cancelled) return;
        const refreshToken = getRefreshToken();
        if (access && refreshToken) {
          saveSession({ accessToken: access, refreshToken }, me);
        }
        setUser(me);
      })
      .catch(() => {
        /* sessão inválida */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      data.user,
    );
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    saveSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      data.user,
    );
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      /* ignore */
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
