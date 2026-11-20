import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  addToast: (message: string, type?: ToastType) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      showToast({ type, title: message });
    },
    [showToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, addToast, success, warning, error, info }}>
      {children}

      {/* Toast Notification Stack (Bottom-Right, Accessible) */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-200 dark:border-emerald-500/30',
              iconColor: 'text-[#047857] dark:text-emerald-400',
              Icon: CheckCircle2,
            },
            warning: {
              border: 'border-[#FDE68A] dark:border-amber-500/30',
              iconColor: 'text-[#D97706] dark:text-amber-400',
              Icon: AlertTriangle,
            },
            error: {
              border: 'border-[#FECACA] dark:border-red-500/30',
              iconColor: 'text-[#DC2626] dark:text-red-400',
              Icon: AlertOctagon,
            },
            info: {
              border: 'border-blue-200 dark:border-blue-500/30',
              iconColor: 'text-[#2563EB] dark:text-blue-400',
              Icon: Info,
            },
          }[t.type];

          const { Icon, border, iconColor } = typeConfig;

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto p-3.5 rounded-xl bg-surface text-text border shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-start gap-3 transition-all duration-150 ${border}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold font-sans text-text">{t.title}</div>
                {t.message && (
                  <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{t.message}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text p-1 rounded-md hover:bg-surface-2 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

const noopToastContext: ToastContextValue = {
  showToast: () => {},
  addToast: () => {},
  success: () => {},
  warning: () => {},
  error: () => {},
  info: () => {},
};

export const useToast = () => {
  const context = useContext(ToastContext);
  return context || noopToastContext;
};
