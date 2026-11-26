import React from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getPasswordStrength, GSTIN_REGEX } from './authHelpers';

interface LoginSignupViewProps {
  signupName: string;
  onSignupNameChange: (v: string) => void;
  signupEmail: string;
  onSignupEmailChange: (v: string) => void;
  signupCompany: string;
  onSignupCompanyChange: (v: string) => void;
  signupGstin: string;
  onSignupGstinChange: (v: string) => void;
  signupPassword: string;
  onSignupPasswordChange: (v: string) => void;
  signupConfirm: string;
  onSignupConfirmChange: (v: string) => void;
  showSignupPw: boolean;
  onToggleShowSignupPw: () => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToVerifyOtp: () => void;
}

export const LoginSignupView: React.FC<LoginSignupViewProps> = ({
  signupName,
  onSignupNameChange,
  signupEmail,
  onSignupEmailChange,
  signupCompany,
  onSignupCompanyChange,
  signupGstin,
  onSignupGstinChange,
  signupPassword,
  onSignupPasswordChange,
  signupConfirm,
  onSignupConfirmChange,
  showSignupPw,
  onToggleShowSignupPw,
  isLoading,
  onSubmit,
  onSwitchToVerifyOtp,
}) => {
  const signupStrength = getPasswordStrength(signupPassword);
  const isGstinValid = GSTIN_REGEX.test(signupGstin.trim().toUpperCase());

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="signup-name" className="block text-xs font-medium text-[#18181A]">
          Full name
        </label>
        <input
          id="signup-name"
          type="text"
          value={signupName}
          onChange={(e) => onSignupNameChange(e.target.value)}
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
          onChange={(e) => onSignupEmailChange(e.target.value)}
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
          onChange={(e) => onSignupCompanyChange(e.target.value)}
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
          onChange={(e) => onSignupGstinChange(e.target.value.toUpperCase())}
          placeholder="19AABCH1234A1Z5"
          required
          className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg font-mono text-sm uppercase text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="signup-password" className="block text-xs font-medium text-[#18181A]">
            Password
          </label>
          {signupStrength.label && (
            <span className="text-[11px] font-mono text-[#55544E]">{signupStrength.label}</span>
          )}
        </div>
        <div className="relative">
          <input
            id="signup-password"
            type={showSignupPw ? 'text' : 'password'}
            value={signupPassword}
            onChange={(e) => onSignupPasswordChange(e.target.value)}
            placeholder="Minimum 12 characters"
            minLength={12}
            required
            className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
          />
          <button
            type="button"
            onClick={onToggleShowSignupPw}
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
          onChange={(e) => onSignupConfirmChange(e.target.value)}
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
          onClick={onSwitchToVerifyOtp}
          className="text-xs text-[#55544E] hover:text-[#18181A] underline cursor-pointer"
        >
          Already signed up and have a 6-digit verification code?
        </button>
      </div>
    </form>
  );
};
