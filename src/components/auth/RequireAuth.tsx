import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireStrictAuth?: boolean;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  allowedRoles,
  requireStrictAuth = false
}) => {
  const { user, token, sessionMode } = useAuth();
  const location = useLocation();

  if (requireStrictAuth && (!token || !user)) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-4">
          <div className="text-rose-400 font-mono text-sm font-bold">403 · INSUFFICIENT PERMISSIONS</div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-300">
            Your current role (<span className="font-mono text-amber-400">{user.role}</span>) does not have authorization to access this view.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors"
          >
            ← Return to Previous Screen
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
