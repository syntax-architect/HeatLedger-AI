import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Check,
  Copy,
  HelpCircle,
} from 'lucide-react';
import { ApiService, BuyerDossier, PublicDossierResponse } from '../services/api';
import { Logo } from '../components/brand/Logo';
import {
  ShareLoadingState,
  SharePasscodeGate,
  ShareErrorState,
} from '../components/share/ShareGateViews';
import {
  ShareDossierOverviewCard,
  ShareDownloadsSection,
  ShareDigitalSealSection,
} from '../components/share/ShareDossierSections';
import { ShareHeatsLedger } from '../components/share/ShareHeatsLedger';
import { ShareActionModal, ShareQrModal } from '../components/share/ShareModals';

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<BuyerDossier | null>(null);

  // Passcode gate state
  const [requiresPasscode, setRequiresPasscode] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState<boolean>(false);

  // Buyer actions state
  const [activeModal, setActiveModal] = useState<'ACCEPT' | 'QUESTION' | 'REQUEST_DOC' | 'QR' | null>(null);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState<boolean>(false);

  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedHeat, setExpandedHeat] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadDossier(token);
    }
  }, [token]);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setActionError(null);
        setActionSuccess(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  const loadDossier = async (shareToken: string, codeToPass?: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp: PublicDossierResponse = await ApiService.getPublicDossier(shareToken, codeToPass);
      if (resp.requires_passcode) {
        setRequiresPasscode(true);
        setLoading(false);
        return;
      }

      if (resp.valid && resp.dossier) {
        setDossier(resp.dossier);
        setRequiresPasscode(false);
      } else {
        setError(resp.error || 'The requested share link is invalid, expired, or has been revoked.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to the HeatLedger compliance network.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !passcode.trim()) return;

    setIsVerifyingPasscode(true);
    setPasscodeError(null);
    try {
      const resp = await ApiService.verifyPortalPasscode(token, passcode.trim());
      if (resp.valid && resp.dossier) {
        setDossier(resp.dossier);
        setRequiresPasscode(false);
      } else {
        setPasscodeError(resp.error || 'Incorrect passcode. Please check with the exporter.');
      }
    } catch (err: any) {
      setPasscodeError(err?.message || 'Passcode verification failed.');
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const openModal = (modalType: 'ACCEPT' | 'QUESTION' | 'REQUEST_DOC' | 'QR') => {
    setActionError(null);
    setActionSuccess(null);
    setActiveModal(modalType);
  };

  const handleBuyerActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeModal || activeModal === 'QR') return;
    if (!buyerName.trim()) {
      setActionError('Please enter your name or organization.');
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await ApiService.submitBuyerAction(token, {
        action_type: activeModal,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim() || undefined,
        message: actionMessage.trim() || undefined,
      });

      if (activeModal === 'ACCEPT') {
        setIsAccepted(true);
        setActionSuccess(
          'Shipment officially approved for EU customs clearance. Exporter QA and Dispatch have been notified.'
        );
      } else if (activeModal === 'QUESTION') {
        setActionSuccess('Technical inquiry dispatched to the exporter Metallurgical QA team.');
      } else if (activeModal === 'REQUEST_DOC') {
        setActionSuccess('Document request logged and prioritized for exporter Dispatch.');
      }

      setTimeout(() => {
        setActiveModal(null);
        setActionMessage('');
        setActionSuccess(null);
      }, 1800);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit action. Please retry.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const copyValue = (key: string, value: string) => {
    if (!value || typeof window === 'undefined') return;
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDownloadUrl = (fileType: 'zip' | 'cbam' | 'pdf') => {
    if (!token) return '#';
    return ApiService.getPortalDownloadUrl(token, fileType);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#18181A] flex flex-col">
      <header className="sticky top-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#18181A]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#18181A]/15" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#55544E]">
              EU CBAM &amp; Mill Clearance Pack
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => copyValue('url', typeof window !== 'undefined' ? window.location.href : '')}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors cursor-pointer"
            >
              {copiedField === 'url' ? (
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
              )}
              <span>{copiedField === 'url' ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {dossier && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                <span>{isAccepted ? 'Accepted' : 'Sealed Pack'}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {loading && <ShareLoadingState />}

        {!loading && requiresPasscode && (
          <SharePasscodeGate
            passcode={passcode}
            onPasscodeChange={setPasscode}
            passcodeError={passcodeError}
            isVerifyingPasscode={isVerifyingPasscode}
            onSubmit={handlePasscodeSubmit}
          />
        )}

        {!loading && !requiresPasscode && error && <ShareErrorState error={error} />}

        {!loading && !requiresPasscode && dossier && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <ShareDossierOverviewCard
              dossier={dossier}
              isAccepted={isAccepted}
              onOpenModal={openModal}
            />

            <ShareDownloadsSection getDownloadUrl={getDownloadUrl} />

            <ShareHeatsLedger
              heats={dossier.heats}
              expandedHeat={expandedHeat}
              onToggleHeat={(heatNum) =>
                setExpandedHeat(expandedHeat === heatNum ? null : heatNum)
              }
            />

            <ShareDigitalSealSection
              digitalSignature={dossier.digital_signature}
              copiedField={copiedField}
              onCopy={copyValue}
            />

            <section className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-[#18181A]">
                  Importer &amp; Customs Broker Actions
                </h2>
                <p className="text-xs text-[#55544E] mt-0.5">
                  Log customs acceptance, submit a metallurgical question, or request supplemental
                  documentation directly from exporter QA.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal('ACCEPT')}
                  className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{isAccepted ? 'Update Acceptance' : 'Accept for Customs Clearance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openModal('QUESTION')}
                  className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  <span>Raise Technical Question</span>
                </button>

                <button
                  type="button"
                  onClick={() => openModal('REQUEST_DOC')}
                  className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                  <span>Request Missing Document</span>
                </button>
              </div>
            </section>
          </motion.div>
        )}

        <footer className="pt-4 pb-6 text-center space-y-3 border-t border-[#18181A]/10">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#FCFBF8] border border-[#18181A]/10 text-[#18181A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
              <span>Prepared with HeatLedger AI</span>
            </span>
          </div>
          <div className="text-xs font-medium text-[#55544E]">
            Regulation (EU) 2025/2621 &amp; 2026/1963 · Tamper-Evident Ed25519 Seal
          </div>
          <p className="text-xs font-medium text-[#047857] max-w-2xl mx-auto">
            Sealed by the plant&apos;s authorised inspector. This is a tamper-evidence seal, not a
            legal verification.
          </p>
          <p className="text-xs text-[#55544E] max-w-2xl mx-auto leading-relaxed">
            HeatLedger AI provides software-assisted CBAM &amp; MTC compliance packaging and
            cryptographic verification. This portal does not constitute legal, customs brokerage,
            or tax advice; all customs declarations remain the responsibility of the importer of
            record and exporter.
          </p>
        </footer>
      </main>

      {activeModal && activeModal !== 'QR' && (
        <ShareActionModal
          activeModal={activeModal}
          buyerName={buyerName}
          onBuyerNameChange={setBuyerName}
          buyerEmail={buyerEmail}
          onBuyerEmailChange={setBuyerEmail}
          actionMessage={actionMessage}
          onActionMessageChange={setActionMessage}
          isSubmittingAction={isSubmittingAction}
          actionSuccess={actionSuccess}
          actionError={actionError}
          onClose={() => setActiveModal(null)}
          onSubmit={handleBuyerActionSubmit}
        />
      )}

      {activeModal === 'QR' && dossier && (
        <ShareQrModal dossier={dossier} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
};

export default SharePage;
