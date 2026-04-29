import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getUserSelf, login as loginApi, register as registerApi, logout as logoutApi } from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh user data — used after login, redeem, subscribe, etc.
  const refreshUser = useCallback(async (config = {}) => {
    try {
      const res = await getUserSelf(config);
      if (res.data.success) {
        setUser(res.data.data);
        return res.data.data;
      }
    } catch (e) { /* handled by interceptor */ }
    return null;
  }, []);

  // Try to restore session on mount (server uses cookies, so just try fetching self)
  useEffect(() => {
    const userId = localStorage.getItem('dist_user_id');
    if (userId) {
      getUserSelf()
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data);
          } else {
            localStorage.removeItem('dist_user_id');
          }
        })
        .catch(() => {
          localStorage.removeItem('dist_user_id');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for 401 events from API interceptor to clear React state
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await loginApi({ username, password });
    if (res.data.success) {
      // Server sets session cookie automatically
      // Store user ID for New-Api-User header
      const userData = res.data.data;
      if (userData?.id) {
        localStorage.setItem('dist_user_id', String(userData.id));
      }
      // Fetch full user info (login response may not have quota/usage)
      const userRes = await getUserSelf();
      if (userRes.data.success) {
        setUser(userRes.data.data);
      } else {
        setUser(userData); // fallback to login response data
      }
      return { success: true };
    }
    // success:false is already toasted by the response interceptor
    return { success: false, message: res.data.message };
  }, []);

  const register = useCallback(async (data) => {
    const res = await registerApi(data);
    if (res.data.success) {
      // Registration succeeds — but user needs to login separately
      // (backend register does NOT set session)
      return { success: true, needsLogin: true };
    }
    return { success: false, message: res.data.message };
  }, []);

  const logout = useCallback(async () => {
    try { await logoutApi(); } catch (e) { /* ok */ }
    localStorage.removeItem('dist_user_id');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
