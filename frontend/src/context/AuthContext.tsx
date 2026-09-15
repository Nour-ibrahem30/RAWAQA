'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  isAdmin: false,
  login: () => { },
  logout: async () => { },
  refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await authApi.me();
      // Backend returns { data: { user: {...} } } or { data: {...} }
      const userData = (res.data as any)?.user ?? res.data;
      // Normalize name field
      if (userData && !userData.name && (userData.firstName || userData.lastName)) {
        userData.name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      }
      setUser(userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rawaqa_user', JSON.stringify(userData));
      }
    } catch (err: any) {
      // Only wipe credentials on genuine 401/403 auth failures, not transient network errors
      if (err?.status === 401 || err?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('rawaqa_user');
        }
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rawaqa_user');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch { /* ignore */ }
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Normalize: backend returns firstName+lastName, frontend expects name
    const normalized = { ...userData } as any;
    if (!normalized.name && (normalized.firstName || normalized.lastName)) {
      normalized.name = `${normalized.firstName || ''} ${normalized.lastName || ''}`.trim();
    }
    localStorage.setItem('rawaqa_user', JSON.stringify(normalized));
    setUser(normalized);
    // Trigger cart merge after login — imported lazily to avoid circular dep
    import('@/context/CartContext').then(() => {
      // mergeWithBackend is called from AuthContext via a custom event
    }).catch(() => { });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('rawaqa:login'));
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rawaqa_user');
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isLoggedIn: !!user,
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
