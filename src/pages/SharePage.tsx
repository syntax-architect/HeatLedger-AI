import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Download,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  Check,
  Copy,
  MessageSquare,
  HelpCircle,
  Send,
  Building2,
  Anchor,
  Package,
  Flame,
  Scale,
  FileSpreadsheet,
  FileArchive,
  QrCode,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { ApiService, BuyerDossier, PublicDossierResponse } from '../services/api';
import { Logo } from '../components/brand/Logo';

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

  // Escape key dismissal for open modals
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col">
      {/* Institutional Clearinghouse Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#E4E4E7]" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#52525B]">
              EU CBAM &amp; Mill Clearance Pack
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => copyValue('url', typeof window !== 'undefined' ? window.location.href : '')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors cursor-pointer"
            >
              {copiedField === 'url' ? (
                <Check className="w-3.5 h-3.5 text-[#059669]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#52525B]" />
              )}
              <span>{copiedField === 'url' ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {dossier && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                <span>{isAccepted ? 'Accepted' : 'Sealed Pack'}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl py-20 px-6 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#059669] animate-spin" />
            <p className="text-xs font-medium text-[#52525B]">
              Verifying tamper-evident token and loading customs compliance dossier...
            </p>
          </div>
        )}

        {/* Passcode Gate */}
        {!loading && requiresPasscode && (
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

            <form onSubmit={handlePasscodeSubmit} className="p-6 space-y-4">
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
                  onChange={(e) => setPasscode(e.target.value)}
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
        )}

        {/* Error / Revoked State */}
        {!loading && !requiresPasscode && error && (
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
        )}

        {/* Unlocked Institutional Dossier */}
        {!loading && !requiresPasscode && dossier && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Primary Dossier Certificate Card */}
            <section className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden">
              {/* Prominent Institutional Status Banner */}
              <div className="px-6 py-3.5 bg-[#ECFDF5] border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  <span className="text-xs font-semibold text-[#065F46]">
                    {isAccepted
                      ? 'Accepted for EU Customs Clearance — Exporter QA Notified'
                      : 'Sealed EU CBAM & Mill Customs Compliance Pack'}
                  </span>
                </div>
                <span className="font-mono text-xs text-[#047857]">
                  Token {dossier.token.slice(0, 12)}… · Expires{' '}
                  {new Date(dossier.expires_at).toLocaleDateString()}
                </span>
              </div>

              {/* Header & Primary Buyer Actions */}
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#09090B]">
                      Shipment {dossier.shipment_id}
                    </h1>
                    <p className="text-xs text-[#52525B] flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-[#09090B]">
                        <Building2 className="w-3.5 h-3.5 text-[#52525B]" />
                        {dossier.exporter_name}
                      </span>
                      <span className="text-[#D4D4D8]">/</span>
                      <span>
                        Origin:{' '}
                        <strong className="font-medium text-[#09090B]">
                          {dossier.exporter_country}
                        </strong>
                      </span>
                      <span className="text-[#D4D4D8]">/</span>
                      <span>
                        Destination:{' '}
                        <strong className="font-medium text-[#09090B]">
                          {dossier.destination_port}
                        </strong>
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAccepted ? (
                      <div className="h-9 px-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Customs Cleared</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModal('ACCEPT')}
                        className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept for Customs Clearance</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openModal('QR')}
                      className="h-9 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      title="Inspect Verification QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>QR Seal</span>
                    </button>
                  </div>
                </div>

                {/* Hairline-Divided 4-Column Specification Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E4E4E7] border border-[#E4E4E7] rounded-lg overflow-hidden">
                  <div className="p-3.5 bg-[#FAFAFA]">
                    <div className="text-xs text-[#52525B] flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>Net Weight</span>
                    </div>
                    <div className="text-base font-semibold font-mono tabular-nums text-[#09090B] mt-1">
                      {dossier.net_weight_mt.toFixed(3)} MT
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#52525B] mt-0.5">
                      Gross: {dossier.gross_weight_mt.toFixed(3)} MT
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAFAFA]">
                    <div className="text-xs text-[#52525B] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>CN Tariff Code</span>
                    </div>
                    <div
                      className="text-sm font-semibold font-mono text-[#09090B] mt-1 truncate"
                      title={dossier.cn_code}
                    >
                      {dossier.cn_code}
                    </div>
                    <div className="text-xs text-[#047857] mt-0.5">Mill Test Certificate (MTC)</div>
                  </div>

                  <div className="p-3.5 bg-[#FAFAFA]">
                    <div className="text-xs text-[#52525B] flex items-center gap-1.5">
                      <Anchor className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>Containers</span>
                    </div>
                    <div
                      className="text-sm font-semibold font-mono text-[#09090B] mt-1 truncate"
                      title={dossier.containers.join(', ')}
                    >
                      {dossier.containers.join(', ')}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">
                      {dossier.containers.length} FCL Sealed Units
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAFAFA]">
                    <div className="text-xs text-[#52525B] flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Specific Emissions</span>
                    </div>
                    <div className="text-base font-semibold font-mono tabular-nums text-[#047857] mt-1">
                      {dossier.emissions_summary.specific_embedded_emissions_tco2_per_t}{' '}
                      <span className="text-xs font-normal text-[#52525B]">tCO₂/t</span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#047857] mt-0.5">
                      -{dossier.emissions_summary.emissions_saving_pct}% vs. EU default
                    </div>
                  </div>
                </div>

                {dossier.custom_note && (
                  <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-xs text-[#09090B] flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Exporter Dispatch Note: </span>
                      <span className="text-[#52525B]">{dossier.custom_note}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Customs Dossier Package Downloads */}
            <section className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#09090B]">
                    Customs Dossier Package Downloads
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Byte-identical original preservation of upstream mill certificates and
                    tamper-evident mill test certificate records.
                  </p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                      <FileArchive className="w-4 h-4 text-[#059669]" />
                      <span>Complete Dossier ZIP</span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      One-page summary PDF, untouched Mill MTCs, and SHA-256 manifest.
                    </p>
                  </div>
                  <a
                    href={getDownloadUrl('zip')}
                    download
                    className="w-full h-9 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Package (ZIP)</span>
                  </a>
                </div>

                <div className="p-4 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                      <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
                      <span>EU CBAM XML Sheet</span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Structured EU CBAM communication template ready for importer registry filing.
                    </p>
                  </div>
                  <a
                    href={getDownloadUrl('cbam')}
                    download
                    className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>Export XML Data Sheet</span>
                  </a>
                </div>

                <div className="p-4 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                      <FileText className="w-4 h-4 text-[#52525B]" />
                      <span>Customs Pack Cover Summary</span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Digitally sealed exporter cover with QR tamper-evidence seal.
                    </p>
                  </div>
                  <a
                    href={getDownloadUrl('pdf')}
                    download
                    className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>Download Cover PDF</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Melt-and-Pour Crude Steel Origin Ledger */}
            <section className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#09090B]">
                    Melt-and-Pour Crude Steel Origin Ledger
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Heat-level metallurgical traceability per Regulation (EU) 2026/1963.
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] font-mono text-xs text-[#09090B] self-start sm:self-center">
                  {dossier.heats.length} Linked Heats
                </span>
              </div>

              <div className="divide-y divide-[#E4E4E7]">
                {dossier.heats.map((heat) => {
                  const isExpanded = expandedHeat === heat.heat_number;
                  return (
                    <div key={heat.heat_number}>
                      <button
                        type="button"
                        onClick={() => setExpandedHeat(isExpanded ? null : heat.heat_number)}
                        className="w-full px-6 py-4 text-left hover:bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-sm text-[#09090B]">
                              {heat.heat_number}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs font-medium">
                              {heat.melt_country}
                            </span>
                            <span className="text-xs text-[#52525B]">{heat.mill_name}</span>
                          </div>
                          <div className="text-xs text-[#52525B] flex items-center gap-2 flex-wrap">
                            <span>
                              Grade:{' '}
                              <strong className="font-mono font-medium text-[#09090B]">
                                {heat.steel_grade}
                              </strong>
                            </span>
                            <span className="text-[#D4D4D8]">·</span>
                            <span>
                              Route:{' '}
                              <strong className="font-medium text-[#09090B]">
                                {heat.crude_steel_process}
                              </strong>
                            </span>
                            <span className="text-[#D4D4D8]">·</span>
                            <span>
                              Mass:{' '}
                              <strong className="font-mono tabular-nums font-medium text-[#09090B]">
                                {heat.tonnes} MT
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="sm:text-right">
                            <div className="text-xs font-mono font-semibold tabular-nums text-[#09090B]">
                              CEV {heat.cev.toFixed(3)}
                            </div>
                            <div className="text-xs text-[#047857]">In Spec (IIW &le; 0.450)</div>
                          </div>
                          <span className="p-1.5 rounded-md border border-[#E4E4E7] bg-[#FFFFFF] text-[#52525B]">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E7] space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-[#09090B]">
                                  Ladle Chemical Composition (% wt)
                                </span>
                                <span className="text-[#52525B]">
                                  Upstream Mill MTC:{' '}
                                  <strong className="font-mono text-[#09090B]">
                                    {heat.mtc_number}
                                  </strong>
                                </span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                {Object.entries(heat.chemistry).map(([elem, val]) => (
                                  <div
                                    key={elem}
                                    className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-center"
                                  >
                                    <div className="text-xs font-medium text-[#52525B]">{elem}</div>
                                    <div className="text-xs font-mono font-semibold tabular-nums text-[#09090B] mt-0.5">
                                      {val.toFixed(3)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Cryptographic Ed25519 Seal */}
            <section className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#09090B]">
                      Tamper-Evidence Digital Seal
                    </h2>
                    <p className="text-xs text-[#52525B]">
                      Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification.
                    </p>
                  </div>
                </div>

                <Link
                  to={dossier.digital_signature.verification_url}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#047857] text-xs font-medium border border-[#E4E4E7] transition-colors self-start sm:self-center"
                >
                  <span>Open Public Verifier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#E4E4E7]">
                <div className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#52525B]">Authorised QA Signer</div>
                    <div className="text-sm font-semibold text-[#09090B] mt-0.5">
                      {dossier.digital_signature.signer_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#52525B]">Signed At (UTC)</div>
                    <div className="text-sm font-mono tabular-nums text-[#09090B] mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>{dossier.digital_signature.signed_at}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#52525B]">
                      Annex A Original Mill MTC SHA-256 ({dossier.digital_signature.algorithm} · Key{' '}
                      <span className="font-mono">{dossier.digital_signature.public_key_fingerprint}</span>)
                    </div>
                    <div className="font-mono text-xs text-[#047857] break-all mt-0.5">
                      {dossier.digital_signature.annex_a_sha256}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue('annex_sha', dossier.digital_signature.annex_a_sha256)}
                    className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'annex_sha' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                    )}
                    <span>{copiedField === 'annex_sha' ? 'Copied' : 'Copy SHA-256'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Buyer & Customs Broker Actions */}
            <section className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#09090B]">
                  Importer &amp; Customs Broker Actions
                </h2>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Log customs acceptance, submit a metallurgical question, or request supplemental
                  documentation directly from exporter QA.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal('ACCEPT')}
                  className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAccepted ? 'Update Acceptance' : 'Accept for Customs Clearance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openModal('QUESTION')}
                  className="h-9 px-4 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Raise Technical Question</span>
                </button>

                <button
                  type="button"
                  onClick={() => openModal('REQUEST_DOC')}
                  className="h-9 px-4 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#52525B]" />
                  <span>Request Missing Document</span>
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {/* Standard Compliance Disclaimer Footer */}
        <footer className="pt-4 pb-6 text-center space-y-3 border-t border-[#E4E4E7]">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FAFAFA] border border-[#E4E4E7] text-[#09090B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              <span>Prepared with HeatLedger AI</span>
            </span>
          </div>
          <div className="text-xs font-medium text-[#52525B]">
            Regulation (EU) 2025/2621 &amp; 2026/1963 · Tamper-Evident Ed25519 Seal
          </div>
          <p className="text-xs font-semibold text-[#065F46] max-w-2xl mx-auto">
            Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification.
          </p>
          <p className="text-xs text-[#52525B] max-w-2xl mx-auto leading-relaxed">
            HeatLedger AI provides software-assisted CBAM &amp; MTC compliance packaging and
            cryptographic verification. This portal does not constitute legal, customs brokerage,
            or tax advice; all customs declarations remain the responsibility of the importer of
            record and exporter.
          </p>
        </footer>
      </main>

      {/* Buyer Action Modal (ACCEPT / QUESTION / REQUEST_DOC) */}
      {activeModal && activeModal !== 'QR' && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-lg w-full shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#09090B] flex items-center gap-2">
                {activeModal === 'ACCEPT' && <CheckCircle2 className="w-4 h-4 text-[#059669]" />}
                {activeModal === 'QUESTION' && <HelpCircle className="w-4 h-4 text-[#2563EB]" />}
                {activeModal === 'REQUEST_DOC' && <FileText className="w-4 h-4 text-[#52525B]" />}
                <span>
                  {activeModal === 'ACCEPT' && 'Accept Shipment for Customs Clearance'}
                  {activeModal === 'QUESTION' && 'Ask Exporter QA a Technical Question'}
                  {activeModal === 'REQUEST_DOC' && 'Request Missing Document'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {actionSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-11 h-11 mx-auto rounded-full bg-[#ECFDF5] border border-emerald-200 text-[#059669] flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[#065F46] font-medium">{actionSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleBuyerActionSubmit} className="space-y-4">
                  {actionError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]"
                    >
                      {actionError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Your Name &amp; Company / Customs Broker *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Hans Gruber (EuroStahl Logistics Rotterdam)"
                      className="w-full h-10 px-3.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Work Email (for replies)
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="e.g. h.gruber@eurostahl.de"
                      className="w-full h-10 px-3.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      {activeModal === 'ACCEPT' && 'Customs Clearance Notes / Reference (Optional)'}
                      {activeModal === 'QUESTION' && 'Question for QA & Metallurgy *'}
                      {activeModal === 'REQUEST_DOC' &&
                        'Document Details (e.g. Spectrometer calibration) *'}
                    </label>
                    <textarea
                      rows={3}
                      required={activeModal !== 'ACCEPT'}
                      value={actionMessage}
                      onChange={(e) => setActionMessage(e.target.value)}
                      placeholder={
                        activeModal === 'ACCEPT'
                          ? 'e.g. Customs declaration reference DE-HAM-2026-9912 authorized.'
                          : 'Provide full details for the exporter QA and dispatch team...'
                      }
                      className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E4E7]">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="h-9 px-4 rounded-lg text-xs font-medium text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
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
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
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
      )}

      {/* QR Code Inspection Modal */}
      {activeModal === 'QR' && dossier && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-sm w-full shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#09090B] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#059669]" />
                <span>Verification QR Seal</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close QR modal"
                className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="p-4 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl inline-block mx-auto">
                <svg className="w-44 h-44" viewBox="0 0 100 100" fill="#09090B">
                  <rect x="5" y="5" width="28" height="28" rx="3" />
                  <rect x="9" y="9" width="20" height="20" fill="#FFFFFF" rx="1.5" />
                  <rect x="13" y="13" width="12" height="12" fill="#09090B" />

                  <rect x="67" y="5" width="28" height="28" rx="3" />
                  <rect x="71" y="9" width="20" height="20" fill="#FFFFFF" rx="1.5" />
                  <rect x="75" y="13" width="12" height="12" fill="#09090B" />

                  <rect x="5" y="67" width="28" height="28" rx="3" />
                  <rect x="9" y="71" width="20" height="20" fill="#FFFFFF" rx="1.5" />
                  <rect x="13" y="75" width="12" height="12" fill="#09090B" />

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
                <div className="text-xs font-mono font-semibold text-[#09090B]">
                  {dossier.shipment_id}
                </div>
                <p className="text-xs text-[#52525B]">
                  Scan at port customs to inspect the live Ed25519 signature record.
                </p>
              </div>

              <Link
                to={dossier.digital_signature.verification_url}
                className="w-full h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Public Verification Record</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharePage;
