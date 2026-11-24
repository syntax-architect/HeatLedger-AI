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
  requireStrictAuth = true,
}) => {
  // Disallow preview mode bypass in production builds
  const isUiPreview = !import.meta.env.PROD && import.meta.env.VITE_UI_PREVIEW_MODE === 'true';
  const { user, token, isHydrating } = useAuth();
  const location = useLocation();

  // If in offline AI Studio UI preview mode (development only), bypass auth checks
  if (isUiPreview) {
    return <>{children}</>;
  }

  // While checking active cookie session, render loading skeleton and do not render protected app
  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono tracking-wider text-slate-300">AUTHENTICATING SESSION...</span>
        </div>
      </div>
    );
  }

  // Mandatory Login: Redirect to login if user is not authenticated and render nothing from the app first
  if (requireStrictAuth && (!token || !user)) {
    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  // Check role authorization if specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-6 text-center">
        <div className="max-w-md p-6 sm:p-8 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-4 shadow-xl">
          <div className="text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            403 · INSUFFICIENT PERMISSIONS
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-300">
            Your current role (<span className="font-mono text-amber-400">{user.role}</span>) does
            not have authorization to access this view.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors border border-slate-700"
          >
            ← Return to Previous Screen
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{ children: React.ReactNode; roles: string[] }> = ({
  children,
  roles,
}) => {
  return <RequireAuth allowedRoles={roles}>{children}</RequireAuth>;
};

export default RequireAuth;
