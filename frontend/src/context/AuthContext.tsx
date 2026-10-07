'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

/**
 * AuthContext - Authentication state management
 * 
 * SECURITY FIX (MED-06): Refresh tokens are now stored in httpOnly cookies only.
 * - Access tokens: still in localStorage (short-lived, needed for Authorization header)
 * - Refresh tokens: httpOnly cookie only (server sets/clears via Set-Cookie)
 * - User data: localStorage for quick hydration (non-sensitive, for UX only)
 */

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
          // SECURITY FIX (MED-06): No longer storing refreshToken in localStorage
          // It's now in httpOnly cookie, cleared by backend on logout
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

  /**
   * SECURITY FIX (MED-06): Login now only stores access token in localStorage.
   * The refresh token is automatically stored in an httpOnly cookie by the backend
   * via the Set-Cookie header. We ignore the refreshToken param here.
   */
  const login = useCallback((accessToken: string, _refreshToken: string, userData: User) => {
    // Only store access token (short-lived) in localStorage
    localStorage.setItem('accessToken', accessToken);
    // SECURITY: refreshToken is now in httpOnly cookie, not localStorage
    // The _refreshToken param is kept for API compatibility but not stored
    
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
    // SECURITY FIX (MED-06): Logout no longer needs to send refreshToken from localStorage
    // The backend reads it from the httpOnly cookie
    try { 
      // Call logout endpoint - backend will read refresh token from cookie
      // and clear both cookies
      await authApi.logout(); // No args needed, backend uses cookie
    } catch { /* ignore */ }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      // SECURITY: refreshToken is cleared by backend via cookie expiration
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
