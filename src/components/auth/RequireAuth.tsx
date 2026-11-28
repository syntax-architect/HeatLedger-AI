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
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6 text-[#55544E]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-lg border-2 border-[#059669] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#55544E]">Authenticating session...</span>
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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] p-6 text-center">
        <div className="max-w-md p-6 sm:p-8 rounded-xl bg-[#FCFBF8] border border-[#FECACA] space-y-4">
          <div className="text-[#DC2626] font-mono text-xs font-medium">
            403 · Insufficient Permissions
          </div>
          <h2 className="text-xl font-medium text-[#18181A]">Access Restricted</h2>
          <p className="text-sm text-[#55544E]">
            Your current role (<span className="font-mono text-[#B45309]">{user.role}</span>) does
            not have authorization to access this view.
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="h-9 px-4 rounded-lg bg-[#EFECE5] hover:bg-[#18181A]/10 text-xs font-mono text-[#18181A] transition-colors border border-[#18181A]/15 cursor-pointer"
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
