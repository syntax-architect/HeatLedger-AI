import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  X,
  Fingerprint,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';
import { triggerCustomsApprovalConfetti } from '../../effects/ConfettiTrigger';

interface InspectorPinChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentSha256?: string;
  invoiceNumber?: string;
  onSuccess?: (signatureData?: any) => void;
}

export const InspectorPinChallengeModal: React.FC<InspectorPinChallengeModalProps> = ({
  isOpen,
  onClose,
  documentSha256 = '8d7ae83f7d88f1f2790afd433986c97ea2990a578b771f5bf672c3ff52e58d6b',
  invoiceNumber = 'EXP-2026-109',
  onSuccess,
}) => {
  const { loginWithPin, verifyStepUp, isQaInspector, user } = useAuth();
  const toast = useToast();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first digit cell on open
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 80);
    }
  }, [isOpen]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const arr = pasted.split('');
      setDigits(arr);
      inputRefs.current[5]?.focus();
      handleSubmitWithPin(pasted);
    }
  };

  const handleSubmitWithPin = async (fullPin: string) => {
    if (fullPin.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the inspector PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let success = false;
      if (user && isQaInspector) {
        success = await verifyStepUp(fullPin);
      } else {
        success = await loginWithPin(fullPin);
      }

      if (success) {
        triggerCustomsApprovalConfetti();
        toast.success(
          '10-Minute Step-Up MFA Verified',
          'QA Inspector identity confirmed. 10-minute signing session authorized (600s).'
        );
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        setErrorMsg('Invalid Authenticator code. Please check your authenticator app.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitWithPin(digits.join(''));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-challenge-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/10 text-[#18181A] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#18181A]/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 id="pin-challenge-title" className="text-sm font-medium text-[#18181A]">
                Authorised QA Inspector Step-Up
              </h3>
              <p className="text-xs text-[#55544E] mt-0.5">
                Tamper-evidence authorization · 10-minute session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN modal"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleManualSubmit}>
          <div className="p-5 space-y-5">
            {/* Signatory & Plant Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#18181A]/10 border border-[#18181A]/10 rounded-lg overflow-hidden">
              <div className="p-3 bg-[#F7F5F0]">
                <div className="text-xs text-[#55544E]">Authorised Signatory</div>
                <div className="text-xs font-medium text-[#18181A] mt-0.5">
                  R. K. Chatterjee
                </div>
                <div className="text-xs text-[#55544E]">Head of QA &amp; Metallurgy (#QA-04)</div>
              </div>
              <div className="p-3 bg-[#F7F5F0]">
                <div className="text-xs text-[#55544E]">Plant QA Declaration</div>
                <div className="text-xs font-medium text-[#047857] mt-0.5">
                  QA Lab (Declared by plant)
                </div>
                <div className="text-xs text-[#55544E] font-mono">IN-WB-4409</div>
              </div>
            </div>

            {/* Target Document SHA-256 Strip */}
            <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#55544E] flex items-center gap-1.5 font-medium">
                  <Fingerprint className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  <span>Target SHA-256 Digest</span>
                </span>
                <span className="font-mono font-medium text-[#18181A]">{invoiceNumber}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-md bg-[#FCFBF8] border border-[#18181A]/10 font-mono text-xs text-[#55544E] flex items-center justify-between gap-2">
                <span className="truncate select-all">{documentSha256}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(documentSha256);
                    setCopiedHash(true);
                    setTimeout(() => setCopiedHash(false), 2000);
                  }}
                  className="shrink-0 p-1 rounded text-[#55544E] hover:text-[#18181A] transition-colors cursor-pointer"
                  title="Copy SHA-256 digest"
                >
                  {copiedHash ? (
                    <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* 6-Digit Hardware-Key Style PIN Cells */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#18181A] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                  <span>6-Digit Authenticator Code (TOTP)</span>
                </label>
                <span className="text-xs font-mono text-[#78766E]">
                  RFC 6238
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2.5">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    aria-label={`PIN digit ${idx + 1}`}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    className="w-full h-12 text-center text-lg font-mono font-medium bg-[#FCFBF8] border border-[#18181A]/20 rounded-lg text-[#18181A] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                  />
                ))}
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Crisp Hairline Footer */}
          <div className="px-5 py-3.5 bg-[#F7F5F0] border-t border-[#18181A]/10 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-[#55544E]">HMAC-SHA256 · 600s TTL</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || digits.join('').length !== 6}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Authorize Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
