import React from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Play } from 'lucide-react';
import { ROLE_PRESETS } from './authHelpers';

interface LoginSignInViewProps {
  authTab: 'credentials' | 'pin';
  onAuthTabChange: (tab: 'credentials' | 'pin') => void;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  showSignInPw: boolean;
  onToggleShowSignInPw: () => void;
  pin: string;
  onPinChange: (v: string) => void;
  isLoading: boolean;
  onPinSubmit: (e: React.FormEvent) => void;
  onCredentialsSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onSelectRolePreset: (email: string, password: string) => void;
  onDemoAccess: () => void;
}

export const LoginSignInView: React.FC<LoginSignInViewProps> = ({
  authTab,
  onAuthTabChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showSignInPw,
  onToggleShowSignInPw,
  pin,
  onPinChange,
  isLoading,
  onPinSubmit,
  onCredentialsSubmit,
  onForgotPassword,
  onSelectRolePreset,
  onDemoAccess,
}) => (
  <>
    <div className="grid grid-cols-2 p-1 bg-[#F7F5F0] rounded-lg border border-[#18181A]/[0.08]">
      <button
        type="button"
        onClick={() => onAuthTabChange('credentials')}
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
        onClick={() => onAuthTabChange('pin')}
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
      <form onSubmit={onPinSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="inspector-pin-input" className="block text-xs font-medium text-[#18181A]">
            Factory floor inspector PIN
          </label>
          <input
            id="inspector-pin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            autoFocus
            className="w-full h-11 px-4 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-center font-mono text-lg tracking-[0.4em] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
          />
          <div className="flex items-center justify-between text-xs text-[#55544E] pt-1">
            <span>10-minute step-up signing session</span>
            <span className="font-mono tabular-nums text-xs text-[#78766E]">RFC 6238 TOTP</span>
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
      <form onSubmit={onCredentialsSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="work-email-input" className="block text-xs font-medium text-[#18181A]">
            Work email
          </label>
          <input
            id="work-email-input"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
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
              onClick={onForgotPassword}
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
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full h-10 pl-3.5 pr-10 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg text-sm text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
            />
            <button
              type="button"
              onClick={onToggleShowSignInPw}
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
            onClick={() => onSelectRolePreset(preset.email, preset.password)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              isSelected
                ? 'bg-[#EFECE5] border-[#059669]'
                : 'bg-[#F7F5F0] hover:bg-[#EFECE5]/70 border-[#18181A]/[0.08]'
            }`}
          >
            <span className="inline-block text-[11px] font-mono text-[#55544E] mb-0.5">
              {preset.label}
            </span>
            <span className="block text-xs font-medium text-[#18181A] truncate">{preset.name}</span>
          </button>
        );
      })}
    </div>

    <button
      type="button"
      onClick={onDemoAccess}
      disabled={isLoading}
      className="w-full h-10 px-4 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
    >
      <Play className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
      <span>Launch sandbox plant workspace</span>
    </button>
  </>
);
