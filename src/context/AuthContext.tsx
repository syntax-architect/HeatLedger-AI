import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService, AuthUser } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionMode: 'SANDBOX_DEMO' | 'AUTHENTICATED_QA';
  expiresAt: number | null;
  expiryTimerString: string;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  isPinModalOpen: boolean;
  openPinModal: () => void;
  closePinModal: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_TOKEN_KEY = 'hl_auth_token_v1';
const STORAGE_USER_KEY = 'hl_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [nowSec, setNowSec] = useState<number>(Math.floor(Date.now() / 1000));

  // Periodic clock for countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const isAuthenticated = !!(token && user && user.role === 'QA_HEAD');
  const sessionMode: 'SANDBOX_DEMO' | 'AUTHENTICATED_QA' = isAuthenticated ? 'AUTHENTICATED_QA' : 'SANDBOX_DEMO';
  const expiresAt = user?.exp || null;

  // Compute remaining time string
  const expiryTimerString = (() => {
    if (!isAuthenticated || !expiresAt) return 'Session: Active';
    const remainingSec = expiresAt - nowSec;
    if (remainingSec <= 0) return 'Session Expired';
    const hours = Math.floor(remainingSec / 3600);
    const mins = Math.floor((remainingSec % 3600) / 60);
    return `${hours}h ${mins.toString().padStart(2, '0')}m left`;
  })();

  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await ApiService.verifyInspectorPin(pin);
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem(STORAGE_TOKEN_KEY, res.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.user));
        setIsPinModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  const openPinModal = useCallback(() => {
    setIsPinModalOpen(true);
  }, []);

  const closePinModal = useCallback(() => {
    setIsPinModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        sessionMode,
        expiresAt,
        expiryTimerString,
        loginWithPin,
        logout,
        isPinModalOpen,
        openPinModal,
        closePinModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
