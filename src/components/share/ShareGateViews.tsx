import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, RefreshCw } from 'lucide-react';

export const ShareLoadingState: React.FC = () => (
  <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl py-20 px-6 flex flex-col items-center justify-center space-y-3">
    <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" />
    <p className="text-xs font-medium text-[#52525B]">
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
  <div className="max-w-md mx-auto my-8 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden">
    <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4" />
      </div>
      <div>
        <h1 className="text-sm font-semibold text-[#92400E]">Passcode Protected Dossier</h1>
        <p className="text-xs text-[#B45309]">Exporter authorization required to view packet</p>
      </div>
    </div>

    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <p className="text-xs text-[#52525B] leading-relaxed">
        Enter the access passcode shared by the exporter alongside this customs portal URL.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="portal-passcode" className="block text-xs font-medium text-[#09090B]">
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
          className="w-full h-10 px-3.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder:text-[#A1A1AA] font-mono text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
        />
      </div>

      {passcodeError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{passcodeError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isVerifyingPasscode || !passcode.trim()}
        className="w-full h-10 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {isVerifyingPasscode ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
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
  <div className="max-w-lg mx-auto my-8 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl overflow-hidden shadow-xs">
    <div className="px-6 py-4 bg-[#FEF2F2] border-b border-[#FECACA] flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
      <h1 className="text-sm font-semibold text-[#991B1B]">Dossier Unavailable</h1>
    </div>
    <div className="p-6 space-y-4">
      <p className="text-xs text-[#52525B] leading-relaxed">{error}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#047857] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to HeatLedger Home</span>
      </Link>
    </div>
  </div>
);
