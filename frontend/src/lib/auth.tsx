'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, type AuthResponse, onAuthError } from './api';

interface AuthUser {
  user_id: string;
  email: string;
  role: 'coach' | 'admin';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from HttpOnly cookie by calling /auth/me
  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        setUser({ user_id: data.user_id, email: '', role: (data.role as 'coach' | 'admin') || 'coach' });
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Listen for 401 errors from API layer to auto-logout
  useEffect(() => {
    const unsubscribe = onAuthError(() => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    const authUser: AuthUser = {
      user_id: response.user_id,
      email: response.email,
      role: 'coach', // Default on login/signup; will be refreshed on next me() call
    };
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      handleAuthResponse(response);
      // Fetch actual role from server
      try {
        const me = await authApi.me();
        setUser((prev) => prev ? { ...prev, role: (me.role as 'coach' | 'admin') || 'coach' } : prev);
      } catch {
        // Role will default to coach
      }
    },
    [handleAuthResponse]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.signup(email, password);
      handleAuthResponse(response);
      // Fetch actual role from server
      try {
        const me = await authApi.me();
        setUser((prev) => prev ? { ...prev, role: (me.role as 'coach' | 'admin') || 'coach' } : prev);
      } catch {
        // Role will default to coach
      }
    },
    [handleAuthResponse]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — clear local state regardless
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
