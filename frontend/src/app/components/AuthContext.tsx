import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getToken, setToken, ApiError } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'alumni' | 'faculty' | 'representative';
  department?: string;
  batchYear?: number;
  program?: string;
  profileImage?: string;
  assignedBatchYear?: number; // For batch representatives
  assignedDepartment?: string; // For batch representatives
  assignedProgram?: string; // For batch representatives
}

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  studentId: string;
  department: string;
  program: string;
  batchYear: number;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: RegistrationData) => Promise<boolean>;
  lastError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // On first load, if a token is stored, validate it against the API and
  // restore the session instead of forcing the person to log in again.
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLastError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.token);
      setUser(res.user);
      return true;
    } catch (err) {
      setLastError(err instanceof ApiError ? err.message : 'Login failed.');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    api.post('/auth/logout').catch(() => {});
  };

  const register = async (data: RegistrationData): Promise<boolean> => {
    setLastError(null);
    try {
      await api.post('/auth/register', data);
      // Registration is submitted for admin approval; it does not log the
      // person in immediately. The Sign-Up form's success screen already
      // communicates this ("pending admin approval").
      return true;
    } catch (err) {
      setLastError(err instanceof ApiError ? err.message : 'Registration failed.');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, lastError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
