import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sevasetu_token';
const ROLE_KEY = 'sevasetu_role';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const rehydrate = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    if (token && role) {
      setUser((prev) => ({
        ...prev,
        token,
        role,
        fullName: prev?.fullName ?? '',
        userId: prev?.userId ?? '',
      }));
    }
  }, []);

    const fetchUser = async (token) => {
        try {
            const response = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        const payload = response.data?.data ?? response.data;
        const token = payload?.token;
        const user =
            payload?.user ??
            (payload?.userId || payload?.role || payload?.fullName
                ? {
                      id: payload.userId,
                      role: payload.role,
                      fullName: payload.fullName,
                  }
                : null);

        if (!token || !user) {
            throw new Error('Login response missing token/user');
        }
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
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

  const hasRole = useCallback(
    (role) => user?.role === role,
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated,
      hasRole,
      rehydrate,
    }),
    [user, loading, login, logout, isAuthenticated, hasRole, rehydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
