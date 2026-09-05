import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('sentinel_user')); } catch { return null; }
  });
  const [token, setToken]     = useState(() => localStorage.getItem('sentinel_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (token) {
      authService.me()
        .then(data => {
          setUser(data.user);
          localStorage.setItem('sentinel_user', JSON.stringify(data.user));
        })
        .catch((err) => {
          // Only clear session if server explicitly returns 401 Unauthorized
          if (err.response?.status === 401) {
            setToken(null);
            setUser(null);
            localStorage.removeItem('sentinel_token');
            localStorage.removeItem('sentinel_user');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('sentinel_token', data.token);
    localStorage.setItem('sentinel_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);
    localStorage.setItem('sentinel_token', data.token);
    localStorage.setItem('sentinel_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('sentinel_user', JSON.stringify(userData));
  }, []);

  const value = { user, token, loading, isAuthenticated: !!token, login, register, logout, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
