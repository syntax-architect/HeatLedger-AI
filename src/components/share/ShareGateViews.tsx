import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, RefreshCw } from 'lucide-react';

export const ShareLoadingState: React.FC = () => (
  <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl py-20 px-6 flex flex-col items-center justify-center space-y-3">
    <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" strokeWidth={1.5} />
    <p className="text-xs font-medium text-[#55544E]">
      Verifying tamper-evident token and loading customs compliance dossier...
    </p>
  </div>
);

interface SharePasscodeGateProps {
  passcode: string;
  onPasscodeChange: (value: string) => void;
  passcodeError: string | null;
  isVerifyingPasscode: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const SharePasscodeGate: React.FC<SharePasscodeGateProps> = ({
  passcode,
  onPasscodeChange,
  passcodeError,
  isVerifyingPasscode,
  onSubmit,
}) => (
  <div className="max-w-md mx-auto my-8 bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-sm font-medium text-[#92400E]">Passcode Protected Dossier</h1>
        <p className="text-xs text-[#B45309]">Exporter authorization required to view packet</p>
      </div>
    </div>

    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <p className="text-xs text-[#55544E] leading-relaxed">
        Enter the access passcode shared by the exporter alongside this customs portal URL.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="portal-passcode" className="block text-xs font-medium text-[#18181A]">
          Dossier Passcode
        </label>
        <input
          id="portal-passcode"
          type="password"
          value={passcode}
          onChange={(e) => onPasscodeChange(e.target.value)}
          placeholder="e.g. EuroStahl2026"
          autoFocus
          required
          className="w-full h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] placeholder:text-[#78766E] font-mono text-sm focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 transition-colors"
        />
      </div>

      {passcodeError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{passcodeError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isVerifyingPasscode || !passcode.trim()}
        className="w-full h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {isVerifyingPasscode ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Unlock Dossier</span>
          </>
        )}
      </button>
    </form>
  </div>
);

interface ShareErrorStateProps {
  error: string;
}

export const ShareErrorState: React.FC<ShareErrorStateProps> = ({ error }) => (
  <div className="max-w-lg mx-auto my-8 bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-4 bg-[#FEF2F2] border-b border-[#FECACA] flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" strokeWidth={1.5} />
      <h1 className="text-sm font-medium text-[#991B1B]">Dossier Unavailable</h1>
    </div>
    <div className="p-6 space-y-4">
      <p className="text-xs text-[#55544E] leading-relaxed">{error}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#047857] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>Return to HeatLedger Home</span>
      </Link>
    </div>
  </div>
);
