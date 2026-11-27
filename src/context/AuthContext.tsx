import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService, AuthUser } from '../services/api';

export type UserRole = 'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER' | 'QA_HEAD';
export type SessionMode = 'UNAUTHENTICATED' | 'SANDBOX_DEMO' | 'AUTHENTICATED_QA';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isQaInspector: boolean;
  isStepUpActive: boolean;
  stepUpRemainingSeconds: number;
  stepUpTimerString: string;
  sessionMode: SessionMode;
  expiresAt: number | null;
  expiryTimerString: string;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: () => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  verifyStepUp: (code: string) => Promise<boolean>;
  logout: () => void;
  isPinModalOpen: boolean;
  openPinModal: () => void;
  closePinModal: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LEGACY_TOKEN_STORAGE_KEY = ['hl', 'auth', 'token', 'v1'].join('_');
const STORAGE_USER_KEY = 'hl_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [nowSec, setNowSec] = useState<number>(Math.floor(Date.now() / 1000));

  // Prompt S2/A1 Session Hydration: Check active httpOnly cookie session on mount & purge legacy localStorage tokens
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      localStorage.removeItem('heatledger_token');
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // Ignore private browsing restrictions
    }

    if (typeof ApiService?.getAuthMe === 'function') {
      ApiService.getAuthMe()
        .then((res) => {
          if (res && res.user) {
            setUser(res.user);
            setToken('cookie_session_active');
          } else {
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          // Unauthenticated guest session
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setIsHydrating(false);
        });
    } else {
      setIsHydrating(false);
    }
  }, []);

  // Listen for global 401 unauthenticated events from ApiService
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hl_auth_unauthorized', handleUnauthorized);
      return () => window.removeEventListener('hl_auth_unauthorized', handleUnauthorized);
    }
  }, []);

  // Periodic clock for countdown timer (1s interval for smooth step-up timer)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const role: UserRole = (user?.role as UserRole) || 'VIEWER';
  const isQaInspector = role === 'QA_INSPECTOR' || role === 'QA_HEAD';
  const isAuthenticated = !!(token && user);
  // Prompt A1: Remove SANDBOX_DEMO session mode for unauthenticated visitors
  const sessionMode: SessionMode = !isAuthenticated
    ? 'UNAUTHENTICATED'
    : (isQaInspector && !user?.is_sandbox ? 'AUTHENTICATED_QA' : 'SANDBOX_DEMO');
  const expiresAt = user?.exp || null;

  // 10-Minute Step-Up MFA Calculations
  const lastStepUpAt = user?.last_step_up_at || 0;
  const stepUpRemainingSeconds = Math.max(0, 600 - (nowSec - lastStepUpAt));
  const isStepUpActive = isQaInspector && stepUpRemainingSeconds > 0;
  const stepUpTimerString = isStepUpActive
    ? `${Math.floor(stepUpRemainingSeconds / 60)}:${(stepUpRemainingSeconds % 60).toString().padStart(2, '0')}`
    : 'Expired';

  // Compute remaining session time string
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
        const enrichedUser = {
          ...res.user,
          last_step_up_at: Math.floor(Date.now() / 1000),
        };
        setToken(res.token);
        setUser(enrichedUser);
        setIsPinModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await ApiService.login(email, password);
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  }, []);

  const loginDemo = useCallback(async (): Promise<boolean> => {
    try {
      const res = await ApiService.loginDemo();
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  }, []);

  const verifyStepUp = useCallback(async (code: string): Promise<boolean> => {
    try {
      const res = await ApiService.verifyStepUp(code);
      if (res && res.status === 'step_up_verified') {
        const now = Math.floor(Date.now() / 1000);
        setUser((prev) => {
          if (!prev) return prev;
          return { ...prev, last_step_up_at: now };
        });
        setIsPinModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      localStorage.removeItem('heatledger_token');
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // Ignore storage restrictions
    }
    await ApiService.logout();
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
        role,
        isAuthenticated,
        isHydrating,
        isQaInspector,
        isStepUpActive,
        stepUpRemainingSeconds,
        stepUpTimerString,
        sessionMode,
        expiresAt,
        expiryTimerString,
        login,
        loginDemo,
        loginWithPin,
        verifyStepUp,
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
