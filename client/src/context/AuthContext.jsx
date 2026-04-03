import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sevasetu_token';
const ROLE_KEY = 'sevasetu_role';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        const u = data.data;
        setUser({
          token,
          role: u.role_name || u.role,
          fullName: u.name || u.fullName || '',
          userId: u.id || (u._id && String(u._id)) || '',
        });
        localStorage.setItem(ROLE_KEY, u.role_name || u.role);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback((userData) => {
    const next = {
      token: userData.token,
      role: userData.role,
      fullName: userData.fullName ?? '',
      userId: userData.userId ?? '',
    };
    localStorage.setItem(TOKEN_KEY, next.token);
    localStorage.setItem(ROLE_KEY, next.role);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isAuthenticated = !!user?.token;

  const hasRole = useCallback((role) => user?.role === role, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated,
      hasRole,
    }),
    [user, loading, login, logout, isAuthenticated, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
