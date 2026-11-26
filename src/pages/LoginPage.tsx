import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Lock,
  CheckCircle2,
  Building2,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { Logo } from '../components/brand/Logo';
import { sanitizeReturnUrl } from '../utils/safeRedirect';
import { GSTIN_REGEX } from '../components/auth/authHelpers';
import { LoginSignInView } from '../components/auth/LoginSignInView';
import { LoginSignupView } from '../components/auth/LoginSignupView';
import {
  LoginVerifyEmailView,
  LoginForgotPasswordView,
  LoginResetLinkView,
} from '../components/auth/LoginRecoveryViews';
import { LoginProofPanel } from '../components/auth/LoginProofPanel';

export type AuthView = 'signin' | 'signup' | 'verify-email' | 'forgot' | 'reset-link';

interface LoginPageProps {
  initialView?: AuthView;
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

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsVerificationEmail, setNeedsVerificationEmail] = useState<string | null>(null);

  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPw, setShowSignInPw] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupGstin, setSignupGstin] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);

  const [verifyEmailAddr, setVerifyEmailAddr] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  useEffect(() => {
    setView(resolveInitialView());
    setErrorMsg(null);
    setInfoMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, initialView]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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
          setErrorMsg(
            err?.message || 'Verification link is invalid or expired. Request a new code below.'
          );
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
      if (ok) navigate(returnUrl);
      else setErrorMsg('Invalid inspector code. Enter your 6-digit authenticator code.');
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
      if (ok) navigate(returnUrl);
      else setErrorMsg('Invalid email or password.');
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanGstin = signupGstin.trim().toUpperCase();

    if (!signupName.trim()) return setErrorMsg('Full name is required.');
    if (!cleanEmail || !cleanEmail.includes('@')) return setErrorMsg('A valid work email address is required.');
    if (!signupCompany.trim()) return setErrorMsg('Company or plant name is required.');
    if (cleanGstin.length !== 15 || !GSTIN_REGEX.test(cleanGstin)) {
      return setErrorMsg('Enter a valid 15-character Indian GSTIN (e.g. 19AABCH1234A1Z5).');
    }
    if (signupPassword.length < 12) return setErrorMsg('Password must be at least 12 characters long.');
    if (signupPassword !== signupConfirm) return setErrorMsg('Passwords do not match.');

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

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanEmail = verifyEmailAddr.trim().toLowerCase();
    const cleanOtp = verifyOtp.trim();
    if (!cleanEmail || cleanOtp.length !== 6) {
      return setErrorMsg('Enter your email and the 6-digit verification code.');
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

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return setErrorMsg('Enter your registered work email.');
    setIsLoading(true);
    try {
      const res = await ApiService.requestPasswordReset(cleanEmail);
      setResetEmail(cleanEmail);
      setResetOtp('');
      setResetStep('otp');
      setResendCooldown(30);
      setInfoMsg(res.message || `If ${cleanEmail} is registered, a 6-digit reset code has been sent.`);
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
    if (resetOtp.trim().length !== 6) return setErrorMsg('Enter the 6-digit reset code sent to your email.');
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

  const handleResendResetOtp = async () => {
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
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (newPassword.length < 12) return setErrorMsg('Password must be at least 12 characters long.');
    if (newPassword !== confirmNewPassword) return setErrorMsg('Passwords do not match.');
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
    if (newPassword.length < 12) return setErrorMsg('Password must be at least 12 characters long.');
    if (newPassword !== confirmNewPassword) return setErrorMsg('Passwords do not match.');
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

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18181A] grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-14 bg-[#FCFBF8]">
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

        <div className="w-full max-w-sm mx-auto py-8 space-y-5">
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
                  <span className="font-medium text-[#18181A]">
                    {verifyEmailAddr || 'your email'}
                  </span>
                  .
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
                      setInfoMsg(
                        `Enter the 6-digit code sent to ${needsVerificationEmail}, or click Resend.`
                      );
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

          {view === 'signin' && (
            <LoginSignInView
              authTab={authTab}
              onAuthTabChange={(tab) => {
                setAuthTab(tab);
                setErrorMsg(null);
              }}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              showSignInPw={showSignInPw}
              onToggleShowSignInPw={() => setShowSignInPw((s) => !s)}
              pin={pin}
              onPinChange={setPin}
              isLoading={isLoading}
              onPinSubmit={handlePinSubmit}
              onCredentialsSubmit={handleCredentialsSubmit}
              onForgotPassword={() => switchView('forgot')}
              onSelectRolePreset={handleSelectRolePreset}
              onDemoAccess={handleDemoAccess}
            />
          )}

          {view === 'signup' && (
            <LoginSignupView
              signupName={signupName}
              onSignupNameChange={setSignupName}
              signupEmail={signupEmail}
              onSignupEmailChange={setSignupEmail}
              signupCompany={signupCompany}
              onSignupCompanyChange={setSignupCompany}
              signupGstin={signupGstin}
              onSignupGstinChange={setSignupGstin}
              signupPassword={signupPassword}
              onSignupPasswordChange={setSignupPassword}
              signupConfirm={signupConfirm}
              onSignupConfirmChange={setSignupConfirm}
              showSignupPw={showSignupPw}
              onToggleShowSignupPw={() => setShowSignupPw((s) => !s)}
              isLoading={isLoading}
              onSubmit={handleSignupSubmit}
              onSwitchToVerifyOtp={() => {
                setVerifyEmailAddr(signupEmail.trim().toLowerCase());
                switchView('verify-email');
              }}
            />
          )}

          {view === 'verify-email' && (
            <LoginVerifyEmailView
              verifyEmailAddr={verifyEmailAddr}
              onVerifyEmailAddrChange={setVerifyEmailAddr}
              verifyOtp={verifyOtp}
              onVerifyOtpChange={setVerifyOtp}
              resendCooldown={resendCooldown}
              isLoading={isLoading}
              onSubmit={handleVerifyEmailOtp}
              onResend={handleResendVerification}
              onBackToSignIn={() => switchView('signin')}
            />
          )}

          {view === 'forgot' && (
            <LoginForgotPasswordView
              resetStep={resetStep}
              onResetStepChange={setResetStep}
              resetEmail={resetEmail}
              onResetEmailChange={setResetEmail}
              resetOtp={resetOtp}
              onResetOtpChange={setResetOtp}
              newPassword={newPassword}
              onNewPasswordChange={setNewPassword}
              confirmNewPassword={confirmNewPassword}
              onConfirmNewPasswordChange={setConfirmNewPassword}
              showResetPw={showResetPw}
              onToggleShowResetPw={() => setShowResetPw((s) => !s)}
              resendCooldown={resendCooldown}
              isLoading={isLoading}
              onRequestResetOtp={handleRequestResetOtp}
              onVerifyResetOtp={handleVerifyResetOtp}
              onResendResetOtp={handleResendResetOtp}
              onResetPasswordWithOtp={handleResetPasswordWithOtp}
            />
          )}

          {view === 'reset-link' && (
            <LoginResetLinkView
              newPassword={newPassword}
              onNewPasswordChange={setNewPassword}
              confirmNewPassword={confirmNewPassword}
              onConfirmNewPasswordChange={setConfirmNewPassword}
              showResetPw={showResetPw}
              onToggleShowResetPw={() => setShowResetPw((s) => !s)}
              isLoading={isLoading}
              onSubmit={handleResetPasswordFromLink}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-[#78766E] border-t border-[#18181A]/[0.08] pt-4">
          <span>OWASP ASVS 4.0 · Rate-limited</span>
          <Link to="/verify" className="text-[#047857] hover:underline font-medium">
            Public verifier →
          </Link>
        </div>
      </div>

      <LoginProofPanel />
    </div>
  );
};

export default LoginPage;
