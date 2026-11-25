import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldCheck,
  FileCheck2,
  Lock,
  Globe,
  Play,
  Eye,
  EyeOff,
  CheckCircle2,
  Building2,
  UserPlus,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { Logo } from '../components/brand/Logo';
import { sanitizeReturnUrl } from '../utils/safeRedirect';

export type AuthView = 'signin' | 'signup' | 'verify-email' | 'forgot' | 'reset-link';

interface LoginPageProps {
  initialView?: AuthView;
}

interface RolePreset {
  role: string;
  label: string;
  name: string;
  email: string;
  password: string;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const ROLE_PRESETS: RolePreset[] = [
  {
    role: 'OWNER',
    label: 'Owner',
    name: 'P. K. Banerjee',
    email: 'owner@howrahsteel.in',
    password: 'OwnerSecretPassword2026!',
  },
  {
    role: 'QA_INSPECTOR',
    label: 'QA Inspector',
    name: 'R. K. Chatterjee',
    email: 'inspector@howrahsteel.in',
    password: 'InspectorPassword2026!',
  },
  {
    role: 'DISPATCH',
    label: 'Dispatch',
    name: 'A. K. Sen',
    email: 'dispatch@howrahsteel.in',
    password: 'DispatchPassword2026!',
  },
  {
    role: 'VIEWER',
    label: 'Customs Auditor',
    name: 'Customs Auditor',
    email: 'auditor@howrahsteel.in',
    password: 'AuditorPassword2026!',
  },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'bg-[#18181A]/10' };
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length < 12) return { score: 1, label: `${pw.length}/12 chars minimum`, color: 'bg-[#DC2626]' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-[#D97706]' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-[#059669]' };
  return { score: 4, label: 'Strong', color: 'bg-[#047857]' };
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialView }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));
  const urlToken = searchParams.get('token') || '';

  const resolveInitialView = (): AuthView => {
    if (initialView) return initialView;
    if (location.pathname === '/signup') return 'signup';
    if (location.pathname === '/forgot-password') return 'forgot';
    if (location.pathname === '/reset-password') return urlToken ? 'reset-link' : 'forgot';
    if (location.pathname === '/verify-email') return 'verify-email';
    return 'signin';
  };

  const { loginWithPin, login, loginDemo } = useAuth();

  const [view, setView] = useState<AuthView>(resolveInitialView);
  const [authTab, setAuthTab] = useState<'credentials' | 'pin'>('credentials');

  // Shared Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsVerificationEmail, setNeedsVerificationEmail] = useState<string | null>(null);

  // Sign In State
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPw, setShowSignInPw] = useState(false);

  // Create Account State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupGstin, setSignupGstin] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);

  // Email Verification OTP State
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot / Reset Password State
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  // Sync view when route path changes
  useEffect(() => {
    setView(resolveInitialView());
    setErrorMsg(null);
    setInfoMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, initialView]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Automatic token verification if landed on /verify-email?token=...
  useEffect(() => {
    if (location.pathname === '/verify-email' && urlToken) {
      setIsLoading(true);
      setErrorMsg(null);
      ApiService.verifyEmailToken(urlToken)
        .then((res) => {
          setInfoMsg(res.message || 'Email verified successfully. You may now sign in.');
          setView('signin');
          setAuthTab('credentials');
        })
        .catch((err: any) => {
          setErrorMsg(err?.message || 'Verification link is invalid or expired. Request a new code below.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [location.pathname, urlToken]);

  const switchView = (next: AuthView) => {
    setView(next);
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsVerificationEmail(null);
    if (next === 'forgot') {
      setResetStep('email');
      if (email && !resetEmail) setResetEmail(email);
    }
  };

  // --- Sign In Handlers ---
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ok = await loginWithPin(pin);
      if (ok) {
        navigate(returnUrl);
      } else {
        setErrorMsg('Invalid inspector code. Enter your 6-digit authenticator code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Work email and password are required.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsVerificationEmail(null);
    try {
      const ok = await login(email.trim().toLowerCase(), password);
      if (ok) {
        navigate(returnUrl);
      } else {
        setErrorMsg('Invalid email or password.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication error.';
      if (err?.code === 'EMAIL_NOT_VERIFIED' || msg.toLowerCase().includes('not verified')) {
        setNeedsVerificationEmail(email.trim().toLowerCase());
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRolePreset = (pEmail: string, pPass: string) => {
    setView('signin');
    setAuthTab('credentials');
    setEmail(pEmail);
    setPassword(pPass);
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsVerificationEmail(null);
  };

  const handleDemoAccess = async () => {
    setIsLoading(true);
    try {
      await loginDemo();
      navigate(returnUrl);
    } catch {
      navigate('/app/shipments');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Create Account Handler ---
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanGstin = signupGstin.trim().toUpperCase();

    if (!signupName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('A valid work email address is required.');
      return;
    }
    if (!signupCompany.trim()) {
      setErrorMsg('Company or plant name is required.');
      return;
    }
    if (cleanGstin.length !== 15 || !GSTIN_REGEX.test(cleanGstin)) {
      setErrorMsg('Enter a valid 15-character Indian GSTIN (e.g. 19AABCH1234A1Z5).');
      return;
    }
    if (signupPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.signup({
        name: signupName.trim(),
        email: cleanEmail,
        company_name: signupCompany.trim(),
        gstin: cleanGstin,
        password: signupPassword,
      });

      setVerifyEmailAddr(cleanEmail);
      setVerifyOtp('');
      setResendCooldown(30);
      setView('verify-email');
      setInfoMsg(
        res.message ||
          `We sent a 6-digit verification code to ${cleanEmail}. Enter it below to activate your account.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not create account. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Email Verification OTP Handlers ---
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanEmail = verifyEmailAddr.trim().toLowerCase();
    const cleanOtp = verifyOtp.trim();
    if (!cleanEmail || cleanOtp.length !== 6) {
      setErrorMsg('Enter your email and the 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.verifyEmailOtp(cleanEmail, cleanOtp);
      setEmail(cleanEmail);
      setView('signin');
      setAuthTab('credentials');
      setInfoMsg(res.message || 'Email verified! Sign in with your password to continue.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired 6-digit verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = (verifyEmailAddr || needsVerificationEmail || email).trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiService.resendVerification(cleanEmail);
      setResendCooldown(30);
      setInfoMsg(res.message || `A new 6-digit code was sent to ${cleanEmail}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Forgot / Reset Password Handlers ---
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Enter your registered work email.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.requestPasswordReset(cleanEmail);
      setResetEmail(cleanEmail);
      setResetOtp('');
      setResetStep('otp');
      setResendCooldown(30);
      setInfoMsg(
        res.message || `If ${cleanEmail} is registered, a 6-digit reset code has been sent.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (resetOtp.trim().length !== 6) {
      setErrorMsg('Enter the 6-digit reset code sent to your email.');
      return;
    }
    setIsLoading(true);
    try {
      await ApiService.verifyResetOtp(resetEmail.trim().toLowerCase(), resetOtp.trim());
      setResetStep('password');
      setInfoMsg('Code verified. Choose a strong new password (minimum 12 characters).');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired 6-digit reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (newPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.resetPasswordWithOtp(
        resetEmail.trim().toLowerCase(),
        resetOtp.trim(),
        newPassword
      );
      setEmail(resetEmail.trim().toLowerCase());
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetOtp('');
      setView('signin');
      setAuthTab('credentials');
      setInfoMsg(res.message || 'Password reset successfully. Sign in with your new password.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordFromLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (newPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiService.resetPassword(urlToken, newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setView('signin');
      setAuthTab('credentials');
      setInfoMsg(res.message || 'Password reset successfully. Sign in with your new password.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Reset link is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const signupStrength = getPasswordStrength(signupPassword);
  const resetStrength = getPasswordStrength(newPassword);
  const isGstinValid = GSTIN_REGEX.test(signupGstin.trim().toUpperCase());

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18181A] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Column: Mill Parchment Authentication Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-14 bg-[#FCFBF8]">
        {/* Top Brand Row */}
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="HeatLedger AI Home">
            <Logo isLight size="sm" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#55544E] hover:text-[#18181A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Center Auth Container */}
        <div className="w-full max-w-sm mx-auto py-8 space-y-5">
          {/* Primary Top-Level Switcher: Sign In vs Create Account */}
          {(view === 'signin' || view === 'signup') && (
            <div className="grid grid-cols-2 p-1 bg-[#EFECE5] rounded-lg border border-[#18181A]/[0.08]">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className={`relative py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  view === 'signin' ? 'text-[#18181A]' : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                {view === 'signin' && (
                  <motion.span
                    layoutId="auth-primary-pill"
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded bg-[#FCFBF8] border border-[#18181A]/[0.08] shadow-xs"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Sign in</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchView('signup')}
                className={`relative py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  view === 'signup' ? 'text-[#18181A]' : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                {view === 'signup' && (
                  <motion.span
                    layoutId="auth-primary-pill"
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded bg-[#FCFBF8] border border-[#18181A]/[0.08] shadow-xs"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Create account</span>
                </span>
              </button>
            </div>
          )}

          {/* Contextual Header */}
          <div className="space-y-1.5">
            {view === 'signin' && (
              <>
                <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                  Sign in to HeatLedger
                </h1>
                <p className="text-sm text-[#55544E] leading-relaxed">
                  Access plant QA dossiers, heat ledgers, and Clause 6 signing.
                </p>
              </>
            )}
            {view === 'signup' && (
              <>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#047857]">
                  <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>New Plant Onboarding</span>
                </div>
                <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                  Create your plant account
                </h1>
                <p className="text-sm text-[#55544E] leading-relaxed">
                  Provision an isolated workspace for your steel works or exporting plant.
                </p>
              </>
            )}
            {view === 'verify-email' && (
              <>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#047857]">
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Email Verification</span>
                </div>
                <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                  Enter verification code
                </h1>
                <p className="text-sm text-[#55544E] leading-relaxed">
                  Enter the 6-digit OTP sent to{' '}
                  <span className="font-medium text-[#18181A]">{verifyEmailAddr || 'your email'}</span>.
                </p>
              </>
            )}
            {view === 'forgot' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#047857]">
                    <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>
                      Password Recovery · Step{' '}
                      {resetStep === 'email' ? '1 of 3' : resetStep === 'otp' ? '2 of 3' : '3 of 3'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="text-xs font-medium text-[#55544E] hover:text-[#18181A] cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
                <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                  {resetStep === 'email' && 'Reset your password'}
                  {resetStep === 'otp' && 'Enter 6-digit OTP'}
                  {resetStep === 'password' && 'Set a new password'}
                </h1>
                <p className="text-sm text-[#55544E] leading-relaxed">
                  {resetStep === 'email' &&
                    'Enter your registered work email and we will send a 6-digit reset code.'}
                  {resetStep === 'otp' && (
                    <>
                      Enter the 6-digit code sent to{' '}
                      <span className="font-medium text-[#18181A]">{resetEmail}</span>.
                    </>
                  )}
                  {resetStep === 'password' &&
                    'Choose a strong password (at least 12 characters). All old sessions will be signed out.'}
                </p>
              </>
            )}
            {view === 'reset-link' && (
              <>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#047857]">
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Reset Password</span>
                </div>
                <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                  Set a new password
                </h1>
                <p className="text-sm text-[#55544E] leading-relaxed">
                  Enter a strong new password (minimum 12 characters) for your account.
                </p>
              </>
            )}
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                role="alert"
                className="px-4 py-3 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/20 text-xs text-[#DC2626] font-medium space-y-2"
              >
                <div>{errorMsg}</div>
                {needsVerificationEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyEmailAddr(needsVerificationEmail);
                      setVerifyOtp('');
                      setView('verify-email');
                      setErrorMsg(null);
                      setInfoMsg(`Enter the 6-digit code sent to ${needsVerificationEmail}, or click Resend.`);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
                  >
                    <span>Verify email with 6-digit OTP →</span>
                  </button>
                )}
              </motion.div>
            )}
            {infoMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="px-4 py-3 rounded-lg bg-[#ECFDF5] border border-[#059669]/20 text-xs text-[#047857] font-medium flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= VIEW: SIGN IN ================= */}
          {view === 'signin' && (
            <>
              {/* Sub-method switcher: Email & Password vs Floor PIN */}
              <div className="grid grid-cols-2 p-1 bg-[#F7F5F0] rounded-lg border border-[#18181A]/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('credentials');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    authTab === 'credentials'
                      ? 'bg-[#FFFFFF] text-[#18181A] border border-[#18181A]/[0.08]'
                      : 'text-[#55544E] hover:text-[#18181A]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Email &amp; password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('pin');
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    authTab === 'pin'
                      ? 'bg-[#FFFFFF] text-[#18181A] border border-[#18181A]/[0.08]'
                      : 'text-[#55544E] hover:text-[#18181A]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Floor PIN (QA)</span>
                </button>
              </div>

              {authTab === 'pin' ? (
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="inspector-pin-input"
                      className="block text-xs font-medium text-[#18181A]"
                    >
                      Factory floor inspector PIN
                    </label>
                    <input
                      id="inspector-pin-input"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      autoFocus
                      className="w-full h-11 px-4 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-center font-mono text-lg tracking-[0.4em] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                    />
                    <div className="flex items-center justify-between text-xs text-[#55544E] pt-1">
                      <span>10-minute step-up signing session</span>
                      <span className="font-mono tabular-nums text-xs text-[#78766E]">
                        RFC 6238 TOTP
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || pin.length < 4}
                    className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Verifying PIN...</span>
                    ) : (
                      <>
                        <span>Authenticate inspector</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="work-email-input"
                      className="block text-xs font-medium text-[#18181A]"
                    >
                      Work email
                    </label>
                    <input
                      id="work-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourplant.in"
                      required
                      className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="account-password-input"
                        className="block text-xs font-medium text-[#18181A]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchView('forgot')}
                        className="text-xs font-medium text-[#047857] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="account-password-input"
                        type={showSignInPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPw((s) => !s)}
                        aria-label={showSignInPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
                      >
                        {showSignInPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Signing in...</span>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Quick Role Presets & Sandbox */}
              <div className="relative pt-1">
                <div className="absolute inset-0 flex items-center pt-1" aria-hidden="true">
                  <div className="w-full border-t border-[#18181A]/[0.08]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#FCFBF8] px-3 text-xs text-[#78766E]">
                    Quick role access &amp; sandbox
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ROLE_PRESETS.map((preset) => {
                  const isSelected = email === preset.email;
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => handleSelectRolePreset(preset.email, preset.password)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EFECE5] border-[#059669]'
                          : 'bg-[#F7F5F0] hover:bg-[#EFECE5]/70 border-[#18181A]/[0.08]'
                      }`}
                    >
                      <span className="inline-block text-[11px] font-mono text-[#55544E] mb-0.5">
                        {preset.label}
                      </span>
                      <span className="block text-xs font-medium text-[#18181A] truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={isLoading}
                className="w-full h-10 px-4 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
                <span>Launch sandbox plant workspace</span>
              </button>
            </>
          )}

          {/* ================= VIEW: CREATE ACCOUNT (SIGN UP) ================= */}
          {view === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="signup-name" className="block text-xs font-medium text-[#18181A]">
                  Full name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="P. K. Banerjee"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-email" className="block text-xs font-medium text-[#18181A]">
                  Work email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="owner@yourplant.in"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-company" className="block text-xs font-medium text-[#18181A]">
                  Company / Plant name
                </label>
                <input
                  id="signup-company"
                  type="text"
                  value={signupCompany}
                  onChange={(e) => setSignupCompany(e.target.value)}
                  placeholder="Howrah Precision Forgings Pvt. Ltd."
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-gstin" className="block text-xs font-medium text-[#18181A]">
                    Indian GSTIN
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      signupGstin.length === 0
                        ? 'text-[#78766E]'
                        : isGstinValid
                          ? 'text-[#047857]'
                          : 'text-[#D97706]'
                    }`}
                  >
                    {signupGstin.length === 0
                      ? '15 chars'
                      : isGstinValid
                        ? 'Valid GSTIN ✓'
                        : `${signupGstin.length}/15`}
                  </span>
                </div>
                <input
                  id="signup-gstin"
                  type="text"
                  maxLength={15}
                  value={signupGstin}
                  onChange={(e) => setSignupGstin(e.target.value.toUpperCase())}
                  placeholder="19AABCH1234A1Z5"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg font-mono text-sm uppercase text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-medium text-[#18181A]"
                  >
                    Password
                  </label>
                  {signupStrength.label && (
                    <span className="text-[11px] font-mono text-[#55544E]">
                      {signupStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignupPw ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 12 characters"
                    minLength={12}
                    required
                    className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPw((s) => !s)}
                    aria-label={showSignupPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
                  >
                    {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupPassword.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1 rounded-full transition-colors ${
                          signupStrength.score >= lvl ? signupStrength.color : 'bg-[#18181A]/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-confirm" className="block text-xs font-medium text-[#18181A]">
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type={showSignupPw ? 'text' : 'password'}
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  minLength={12}
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 px-4 mt-1 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Creating organization...</span>
                ) : (
                  <>
                    <span>Create plant account</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyEmailAddr(signupEmail.trim().toLowerCase());
                    switchView('verify-email');
                  }}
                  className="text-xs text-[#55544E] hover:text-[#18181A] underline cursor-pointer"
                >
                  Already signed up and have a 6-digit verification code?
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW: VERIFY EMAIL OTP ================= */}
          {view === 'verify-email' && (
            <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="verify-email-input" className="block text-xs font-medium text-[#18181A]">
                  Work email
                </label>
                <input
                  id="verify-email-input"
                  type="email"
                  value={verifyEmailAddr}
                  onChange={(e) => setVerifyEmailAddr(e.target.value)}
                  placeholder="owner@yourplant.in"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="verify-otp-input" className="block text-xs font-medium text-[#18181A]">
                  6-digit verification code
                </label>
                <input
                  id="verify-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full h-11 px-4 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-center font-mono text-lg tracking-[0.4em] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || verifyOtp.length !== 6}
                className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Verifying code...</span>
                ) : (
                  <>
                    <span>Verify email &amp; continue</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleResendVerification}
                  className="inline-flex items-center gap-1.5 font-medium text-[#047857] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend 6-digit code'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => switchView('signin')}
                  className="text-[#55544E] hover:text-[#18181A] font-medium cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW: FORGOT / RESET PASSWORD (OTP FLOW) ================= */}
          {view === 'forgot' && (
            <>
              {/* Step progress bar */}
              <div className="grid grid-cols-3 gap-1.5">
                {(['email', 'otp', 'password'] as const).map((st, idx) => {
                  const activeIdx =
                    resetStep === 'email' ? 0 : resetStep === 'otp' ? 1 : 2;
                  return (
                    <div
                      key={st}
                      className={`h-1 rounded-full transition-colors ${
                        idx <= activeIdx ? 'bg-[#059669]' : 'bg-[#18181A]/10'
                      }`}
                    />
                  );
                })}
              </div>

              {resetStep === 'email' && (
                <form onSubmit={handleRequestResetOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email-input" className="block text-xs font-medium text-[#18181A]">
                      Registered work email
                    </label>
                    <input
                      id="reset-email-input"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="owner@yourplant.in"
                      required
                      autoFocus
                      className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Sending reset code...</span>
                    ) : (
                      <>
                        <span>Send 6-digit reset code</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {resetStep === 'otp' && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-otp-input" className="block text-xs font-medium text-[#18181A]">
                      6-digit reset code
                    </label>
                    <input
                      id="reset-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full h-11 px-4 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-center font-mono text-lg tracking-[0.4em] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || resetOtp.length !== 6}
                    className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Verifying code...</span>
                    ) : (
                      <>
                        <span>Verify code</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isLoading}
                      onClick={async () => {
                        if (resendCooldown > 0) return;
                        setIsLoading(true);
                        setErrorMsg(null);
                        try {
                          await ApiService.requestPasswordReset(resetEmail);
                          setResendCooldown(30);
                          setInfoMsg(`A new 6-digit reset code was sent to ${resetEmail}.`);
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Could not resend code.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 font-medium text-[#047857] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetStep('email')}
                      className="text-[#55544E] hover:text-[#18181A] font-medium cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>
                </form>
              )}

              {resetStep === 'password' && (
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="new-pw-input" className="block text-xs font-medium text-[#18181A]">
                        New password
                      </label>
                      {resetStrength.label && (
                        <span className="text-[11px] font-mono text-[#55544E]">
                          {resetStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="new-pw-input"
                        type={showResetPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 12 characters"
                        minLength={12}
                        required
                        autoFocus
                        className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPw((s) => !s)}
                        aria-label={showResetPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
                      >
                        {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 rounded-full transition-colors ${
                              resetStrength.score >= lvl ? resetStrength.color : 'bg-[#18181A]/10'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-new-pw-input" className="block text-xs font-medium text-[#18181A]">
                      Confirm new password
                    </label>
                    <input
                      id="confirm-new-pw-input"
                      type={showResetPw ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      minLength={12}
                      required
                      className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Updating password...</span>
                    ) : (
                      <>
                        <span>Update password &amp; sign in</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ================= VIEW: RESET PASSWORD FROM EMAIL LINK ================= */}
          {view === 'reset-link' && (
            <form onSubmit={handleResetPasswordFromLink} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="link-new-pw" className="block text-xs font-medium text-[#18181A]">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="link-new-pw"
                    type={showResetPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 12 characters"
                    minLength={12}
                    required
                    autoFocus
                    className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
                  >
                    {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="link-confirm-pw" className="block text-xs font-medium text-[#18181A]">
                  Confirm new password
                </label>
                <input
                  id="link-confirm-pw"
                  type={showResetPw ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={12}
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-lg bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <span>Resetting password...</span> : <span>Reset password</span>}
              </button>
            </form>
          )}
        </div>

        {/* Bottom Security Footnote */}
        <div className="flex items-center justify-between text-xs text-[#78766E] border-t border-[#18181A]/[0.08] pt-4">
          <span>OWASP ASVS 4.0 · Rate-limited</span>
          <Link to="/verify" className="text-[#047857] hover:underline font-medium">
            Public verifier →
          </Link>
        </div>
      </div>

      {/* Right Column: Forged Graphite Architectural Proof Panel */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#121316] text-[#EAEAEA] flex-col justify-between p-12 xl:p-16 border-l border-[#EAEAEA]/[0.08]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#9FA3AD]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
            <span>EN 10204:2004 · EU Reg 2026/1963</span>
          </div>
          <span className="font-mono tabular-nums text-xs text-[#10B981] px-2 py-0.5 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            #IN-WB-HOWRAH-01
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg space-y-8 my-auto"
        >
          <div className="space-y-3">
            <h2 className="text-3xl font-medium tracking-[-0.025em] leading-[1.15] text-[#EAEAEA]">
              Cryptographic proof for every melt, heat, and customs dossier
            </h2>
            <p className="text-sm leading-relaxed text-[#9FA3AD]">
              Built for Indian metallurgical QA teams exporting under the EU Carbon Border
              Adjustment Mechanism definitive regime. Preserve upstream mill certificates byte-for-byte
              and seal every dispatch with verifiable Ed25519 signatures.
            </p>
          </div>

          <div className="rounded-xl bg-[#181A1F] border border-[#EAEAEA]/10 divide-y divide-[#EAEAEA]/[0.08]">
            <div className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-[#EAEAEA]">
                  EN 10204 Clause 6 preservation
                </div>
                <p className="text-xs text-[#9FA3AD] leading-relaxed">
                  Byte-identical original preservation of upstream mill Type 3.1 certificates
                  bundled as Annex A alongside signed exporter covers.
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-[#EAEAEA]">
                  Ed25519 and tamper-evident SHA-256
                </div>
                <p className="text-xs text-[#9FA3AD] leading-relaxed">
                  Every signed cover sheet and Annex A hash is sealed with 10-minute step-up QA
                  Inspector PIN authorization.
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
                <Globe className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-[#EAEAEA]">
                  EU and UK CBAM customs readiness
                </div>
                <p className="text-xs text-[#9FA3AD] leading-relaxed">
                  Automated CN-code scoping, Melt-and-Pour crude steel attribution, and structured
                  XML communication templates for European importers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#EAEAEA]/[0.08] text-xs">
          <div>
            <div className="text-[#6F7480]">Signature standard</div>
            <div className="font-mono text-[#EAEAEA] mt-1">Ed25519 / SHA-256</div>
          </div>
          <div>
            <div className="text-[#6F7480]">Traceability</div>
            <div className="font-mono text-[#EAEAEA] mt-1">Heat-to-Container</div>
          </div>
          <div>
            <div className="text-[#6F7480]">Customs export</div>
            <div className="font-mono text-[#EAEAEA] mt-1">EU CBAM XML + ZIP</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
