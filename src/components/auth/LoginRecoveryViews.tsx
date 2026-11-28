import React from 'react';
import { ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getPasswordStrength } from './authHelpers';

interface LoginVerifyEmailViewProps {
  verifyEmailAddr: string;
  onVerifyEmailAddrChange: (v: string) => void;
  verifyOtp: string;
  onVerifyOtpChange: (v: string) => void;
  resendCooldown: number;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBackToSignIn: () => void;
}

export const LoginVerifyEmailView: React.FC<LoginVerifyEmailViewProps> = ({
  verifyEmailAddr,
  onVerifyEmailAddrChange,
  verifyOtp,
  onVerifyOtpChange,
  resendCooldown,
  isLoading,
  onSubmit,
  onResend,
  onBackToSignIn,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-1.5">
      <label htmlFor="verify-email-input" className="block text-xs font-medium text-[#18181A]">
        Work email
      </label>
      <input
        id="verify-email-input"
        type="email"
        value={verifyEmailAddr}
        onChange={(e) => onVerifyEmailAddrChange(e.target.value)}
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
        onChange={(e) => onVerifyOtpChange(e.target.value.replace(/\D/g, ''))}
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
        onClick={onResend}
        className="inline-flex items-center gap-1.5 font-medium text-[#047857] hover:underline disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend 6-digit code'}</span>
      </button>
      <button
        type="button"
        onClick={onBackToSignIn}
        className="text-[#55544E] hover:text-[#18181A] font-medium cursor-pointer"
      >
        Back to sign in
      </button>
    </div>
  </form>
);

interface LoginForgotPasswordViewProps {
  resetStep: 'email' | 'otp' | 'password';
  onResetStepChange: (step: 'email' | 'otp' | 'password') => void;
  resetEmail: string;
  onResetEmailChange: (v: string) => void;
  resetOtp: string;
  onResetOtpChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmNewPassword: string;
  onConfirmNewPasswordChange: (v: string) => void;
  showResetPw: boolean;
  onToggleShowResetPw: () => void;
  resendCooldown: number;
  isLoading: boolean;
  onRequestResetOtp: (e: React.FormEvent) => void;
  onVerifyResetOtp: (e: React.FormEvent) => void;
  onResendResetOtp: () => void;
  onResetPasswordWithOtp: (e: React.FormEvent) => void;
}

export const LoginForgotPasswordView: React.FC<LoginForgotPasswordViewProps> = ({
  resetStep,
  onResetStepChange,
  resetEmail,
  onResetEmailChange,
  resetOtp,
  onResetOtpChange,
  newPassword,
  onNewPasswordChange,
  confirmNewPassword,
  onConfirmNewPasswordChange,
  showResetPw,
  onToggleShowResetPw,
  resendCooldown,
  isLoading,
  onRequestResetOtp,
  onVerifyResetOtp,
  onResendResetOtp,
  onResetPasswordWithOtp,
}) => {
  const resetStrength = getPasswordStrength(newPassword);

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {(['email', 'otp', 'password'] as const).map((st, idx) => {
          const activeIdx = resetStep === 'email' ? 0 : resetStep === 'otp' ? 1 : 2;
          return (
            <div
              key={st}
              className={`h-1 rounded-sm transition-colors ${
                idx <= activeIdx ? 'bg-[#059669]' : 'bg-[#18181A]/10'
              }`}
            />
          );
        })}
      </div>

      {resetStep === 'email' && (
        <form onSubmit={onRequestResetOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reset-email-input" className="block text-xs font-medium text-[#18181A]">
              Registered work email
            </label>
            <input
              id="reset-email-input"
              type="email"
              value={resetEmail}
              onChange={(e) => onResetEmailChange(e.target.value)}
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
        <form onSubmit={onVerifyResetOtp} className="space-y-4">
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
              onChange={(e) => onResetOtpChange(e.target.value.replace(/\D/g, ''))}
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
              onClick={onResendResetOtp}
              className="inline-flex items-center gap-1.5 font-medium text-[#047857] hover:underline disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
            </button>
            <button
              type="button"
              onClick={() => onResetStepChange('email')}
              className="text-[#55544E] hover:text-[#18181A] font-medium cursor-pointer"
            >
              Change email
            </button>
          </div>
        </form>
      )}

      {resetStep === 'password' && (
        <form onSubmit={onResetPasswordWithOtp} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="new-pw-input" className="block text-xs font-medium text-[#18181A]">
                New password
              </label>
              {resetStrength.label && (
                <span className="text-[11px] font-mono text-[#55544E]">{resetStrength.label}</span>
              )}
            </div>
            <div className="relative">
              <input
                id="new-pw-input"
                type={showResetPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Minimum 12 characters"
                minLength={12}
                required
                autoFocus
                className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
              />
              <button
                type="button"
                onClick={onToggleShowResetPw}
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
                    className={`h-1 rounded-sm transition-colors ${
                      resetStrength.score >= lvl ? resetStrength.color : 'bg-[#18181A]/10'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-new-pw-input"
              className="block text-xs font-medium text-[#18181A]"
            >
              Confirm new password
            </label>
            <input
              id="confirm-new-pw-input"
              type={showResetPw ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
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
  );
};

interface LoginResetLinkViewProps {
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmNewPassword: string;
  onConfirmNewPasswordChange: (v: string) => void;
  showResetPw: boolean;
  onToggleShowResetPw: () => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginResetLinkView: React.FC<LoginResetLinkViewProps> = ({
  newPassword,
  onNewPasswordChange,
  confirmNewPassword,
  onConfirmNewPasswordChange,
  showResetPw,
  onToggleShowResetPw,
  isLoading,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-1.5">
      <label htmlFor="link-new-pw" className="block text-xs font-medium text-[#18181A]">
        New password
      </label>
      <div className="relative">
        <input
          id="link-new-pw"
          type={showResetPw ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          placeholder="Minimum 12 characters"
          minLength={12}
          required
          autoFocus
          className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
        />
        <button
          type="button"
          onClick={onToggleShowResetPw}
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
        onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
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
);
