import React from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  FileText,
  HelpCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BuyerDossier } from '../../services/api';

interface ShareActionModalProps {
  activeModal: 'ACCEPT' | 'QUESTION' | 'REQUEST_DOC';
  buyerName: string;
  onBuyerNameChange: (val: string) => void;
  buyerEmail: string;
  onBuyerEmailChange: (val: string) => void;
  actionMessage: string;
  onActionMessageChange: (val: string) => void;
  isSubmittingAction: boolean;
  actionSuccess: string | null;
  actionError: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ShareActionModal: React.FC<ShareActionModalProps> = ({
  activeModal,
  buyerName,
  onBuyerNameChange,
  buyerEmail,
  onBuyerEmailChange,
  actionMessage,
  onActionMessageChange,
  isSubmittingAction,
  actionSuccess,
  actionError,
  onClose,
  onSubmit,
}) => (
  <div
    className="fixed inset-0 z-50 bg-[#0D0E11]/70 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl max-w-lg w-full overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[#18181A]/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#18181A] flex items-center gap-2">
          {activeModal === 'ACCEPT' && (
            <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          )}
          {activeModal === 'QUESTION' && (
            <HelpCircle className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          )}
          {activeModal === 'REQUEST_DOC' && (
            <FileText className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
          )}
          <span>
            {activeModal === 'ACCEPT' && 'Accept Shipment for Customs Clearance'}
            {activeModal === 'QUESTION' && 'Ask Exporter QA a Technical Question'}
            {activeModal === 'REQUEST_DOC' && 'Request Missing Document'}
          </span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-5">
        {actionSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-11 h-11 mx-auto rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#059669] flex items-center justify-center">
              <Check className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-[#065F46] font-medium">{actionSuccess}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {actionError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]"
              >
                {actionError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#18181A]">
                Your Name &amp; Company / Customs Broker *
              </label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => onBuyerNameChange(e.target.value)}
                placeholder="e.g. Hans Gruber (EuroStahl Logistics Rotterdam)"
                className="w-full h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#18181A]">
                Work Email (for replies)
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => onBuyerEmailChange(e.target.value)}
                placeholder="e.g. h.gruber@eurostahl.de"
                className="w-full h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#18181A]">
                {activeModal === 'ACCEPT' && 'Customs Clearance Notes / Reference (Optional)'}
                {activeModal === 'QUESTION' && 'Question for QA & Metallurgy *'}
                {activeModal === 'REQUEST_DOC' &&
                  'Document Details (e.g. Spectrometer calibration) *'}
              </label>
              <textarea
                rows={3}
                required={activeModal !== 'ACCEPT'}
                value={actionMessage}
                onChange={(e) => onActionMessageChange(e.target.value)}
                placeholder={
                  activeModal === 'ACCEPT'
                    ? 'e.g. Customs declaration reference DE-HAM-2026-9912 authorized.'
                    : 'Provide full details for the exporter QA and dispatch team...'
                }
                className="w-full p-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSubmittingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>
                      {activeModal === 'ACCEPT' ? 'Confirm Acceptance' : 'Send to Exporter'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  </div>
);

interface ShareQrModalProps {
  dossier: BuyerDossier;
  onClose: () => void;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({ dossier, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-[#0D0E11]/70 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl max-w-sm w-full overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[#18181A]/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#18181A] flex items-center gap-2">
          <QrCode className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span>Verification QR Seal</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR modal"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-6 text-center space-y-4">
        <div className="p-4 bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl inline-block mx-auto">
          <svg className="w-44 h-44" viewBox="0 0 100 100" fill="#18181A">
            <rect x="5" y="5" width="28" height="28" rx="3" />
            <rect x="9" y="9" width="20" height="20" fill="#FCFBF8" rx="1.5" />
            <rect x="13" y="13" width="12" height="12" fill="#18181A" />
            <rect x="67" y="5" width="28" height="28" rx="3" />
            <rect x="71" y="9" width="20" height="20" fill="#FCFBF8" rx="1.5" />
            <rect x="75" y="13" width="12" height="12" fill="#18181A" />
            <rect x="5" y="67" width="28" height="28" rx="3" />
            <rect x="9" y="71" width="20" height="20" fill="#FCFBF8" rx="1.5" />
            <rect x="13" y="75" width="12" height="12" fill="#18181A" />
            <rect x="38" y="10" width="5" height="5" />
            <rect x="48" y="10" width="5" height="5" />
            <rect x="58" y="10" width="5" height="5" />
            <rect x="38" y="20" width="5" height="5" />
            <rect x="58" y="20" width="5" height="5" />
            <rect x="38" y="30" width="15" height="5" />
            <rect x="10" y="38" width="5" height="5" />
            <rect x="20" y="38" width="5" height="5" />
            <rect x="38" y="38" width="10" height="10" />
            <rect x="52" y="38" width="8" height="8" />
            <rect x="68" y="38" width="6" height="6" />
            <rect x="80" y="38" width="8" height="8" />
            <rect x="10" y="48" width="8" height="5" />
            <rect x="25" y="48" width="5" height="5" />
            <rect x="45" y="50" width="10" height="6" />
            <rect x="65" y="48" width="10" height="5" />
            <rect x="82" y="48" width="8" height="5" />
            <rect x="10" y="58" width="5" height="5" />
            <rect x="22" y="58" width="6" height="5" />
            <rect x="38" y="58" width="8" height="8" />
            <rect x="55" y="58" width="5" height="5" />
            <rect x="75" y="58" width="15" height="5" />
            <rect x="38" y="72" width="6" height="6" />
            <rect x="50" y="72" width="10" height="6" />
            <rect x="68" y="72" width="8" height="8" />
            <rect x="82" y="72" width="8" height="6" />
            <rect x="38" y="84" width="12" height="6" />
            <rect x="56" y="84" width="8" height="6" />
            <rect x="72" y="84" width="18" height="6" />
          </svg>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono font-medium text-[#18181A]">
            {dossier.shipment_id}
          </div>
          <p className="text-xs text-[#55544E]">
            Scan at port customs to inspect the live Ed25519 signature record.
          </p>
        </div>

        <Link
          to={dossier.digital_signature.verification_url}
          className="w-full h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Open Public Verification Record</span>
        </Link>
      </div>
    </div>
  </div>
);
