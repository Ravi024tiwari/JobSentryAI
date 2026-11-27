'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  type User,
  type LoginInput,
  type RegisterInput,
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage immediately on mount to prevent any UI flicker
  useEffect(() => {
    try {
      const cached = localStorage.getItem('jobsentry_user');
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch {}

    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('jobsentry_user', JSON.stringify(currentUser));
      } else {
        setUser(null);
        localStorage.removeItem('jobsentry_user');
      }
    } catch {
      // Keep optimistic user or clear if session invalid
    } finally {
      setLoading(false);
    }
  };

  const login = async (input: LoginInput) => {
    const res = await loginUser(input);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('jobsentry_user', JSON.stringify(res.user));
    } else {
      await refreshUser();
    }
  };

  const register = async (input: RegisterInput) => {
    const res = await registerUser(input);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('jobsentry_user', JSON.stringify(res.user));
    } else {
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      localStorage.removeItem('jobsentry_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
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
