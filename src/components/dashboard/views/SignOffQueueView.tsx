import React, { useState } from 'react';
import {
  Stamp,
  ShieldCheck,
  CheckSquare,
  Square,
  Lock,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
} from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { ApiService } from '../../../services/api';
import { InspectorPinChallengeModal } from '../modals/InspectorPinChallengeModal';

interface PendingCertificate {
  id: string;
  invoice: string;
  productTitle: string;
  destination: string;
  allocatedHeat: string;
  millName: string;
  tonnage: number;
  cnCode: string;
  defaultMode: 'TRANSFORMED_3_1' | 'CLAUSE_6_PASSTHROUGH';
  sha256: string;
  verificationCode: string;
}

const PENDING_CERTIFICATES: PendingCertificate[] = [
  {
    id: 'cert-109',
    invoice: 'EXP-2026-109',
    productTitle: 'Forged Flanges ASTM A105 (ASME B16.5 Class 300)',
    destination: 'Bremen, Germany',
    allocatedHeat: 'TSJ-26-9021',
    millName: 'Tata Steel Jamshedpur',
    tonnage: 24.5,
    cnCode: '7307 91',
    defaultMode: 'TRANSFORMED_3_1',
    sha256: '8d7ae83f7d88f1f2790afd433986c97ea2990a578b771f5bf672c3ff52e58d6b',
    verificationCode: 'HL-2026-X9K4',
  },
  {
    id: 'cert-120',
    invoice: 'EXP-2026-120',
    productTitle: 'High-Tensile Stud Bolts ASTM A193 B7',
    destination: 'Felixstowe, UK',
    allocatedHeat: 'JSW-26-7734',
    millName: 'JSW Steel Vijayanagar',
    tonnage: 21.0,
    cnCode: '7318 15',
    defaultMode: 'TRANSFORMED_3_1',
    sha256: '5d73578dc9911849759dae3726c9c143191a4ebd6bde24b8a1c32a17ec0dbc89',
    verificationCode: 'HL-2026-M4R8',
  },
  {
    id: 'cert-125',
    invoice: 'EXP-2026-125',
    productTitle: 'Cut Structural Hollow Sections S355JR',
    destination: 'Genoa, Italy',
    allocatedHeat: 'RINL-26-1108',
    millName: 'RINL Vizag Steel Plant',
    tonnage: 19.8,
    cnCode: '7326 90',
    defaultMode: 'CLAUSE_6_PASSTHROUGH',
    sha256: 'f1ebc55677819f9911d560cd0155dca3656bcec7c911edbcc706522f85a8785b',
    verificationCode: 'HL-2026-P7T2',
  },
];

interface SignOffQueueViewProps {
  onSignCertificate?: (remainingCount: number) => void;
  onNavigateToDossier?: () => void;
}

export const SignOffQueueView: React.FC<SignOffQueueViewProps> = ({
  onSignCertificate,
  onNavigateToDossier,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [selectedCertId, setSelectedCertId] = useState<string>('cert-109');
  const [complianceMode, setComplianceMode] = useState<'TRANSFORMED_3_1' | 'CLAUSE_6_PASSTHROUGH'>(
    'TRANSFORMED_3_1'
  );
  const [attestations, setAttestations] = useState<Record<string, boolean>>({});
  const [signedMap, setSignedMap] = useState<
    Record<
      string,
      {
        isSigned: boolean;
        timestamp: string;
        hmacSignature: string;
        rawHash: string;
        inspectorName: string;
        inspectorId: string;
        verificationCode: string;
      }
    >
  >({});
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const toast = useToast();

  const currentCert =
    PENDING_CERTIFICATES.find((c) => c.id === selectedCertId) || PENDING_CERTIFICATES[0];
  const isCurrentCertSigned = !!signedMap[selectedCertId]?.isSigned;
  const currentAttestationChecked = !!attestations[selectedCertId];

  const signedCount = Object.values(signedMap).filter((v) => v.isSigned).length;
  const remainingCount = Math.max(0, PENDING_CERTIFICATES.length - signedCount);

  const executeCryptographicSign = async (certId: string) => {
    const cert = PENDING_CERTIFICATES.find((c) => c.id === certId) || currentCert;
    setIsSigning(true);
    const timestamp = new Date().toUTCString();

    try {
      const sigData = await ApiService.signCertificate({
        invoice_number: cert.invoice,
        heat_number: cert.allocatedHeat,
        total_see: 1.93,
        timestamp,
        sha256_upstream_pdf: cert.sha256,
      });

      const newSignedMap = {
        ...signedMap,
        [certId]: {
          isSigned: true,
          timestamp,
          hmacSignature: sigData.signature,
          rawHash: sigData.raw_hash,
          inspectorName: user?.name || 'R. K. Chatterjee',
          inspectorId: user?.sub || 'QA-04',
          verificationCode: cert.verificationCode,
        },
      };
      setSignedMap(newSignedMap);

      const newRemaining = Math.max(
        0,
        PENDING_CERTIFICATES.length - Object.values(newSignedMap).filter((v) => v.isSigned).length
      );
      if (onSignCertificate) {
        onSignCertificate(newRemaining);
      }

      toast.success(
        'Digitally Signed (Ed25519)',
        `${cert.invoice} signed under EN 10204:2004 Clause 6. Verification code: ${cert.verificationCode}`
      );
    } catch (err: any) {
      toast.error('Signing Failed', err.message || 'Could not sign document.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleApplySignature = () => {
    if (!currentAttestationChecked || isCurrentCertSigned) return;

    if (!isAuthenticated) {
      setIsChallengeModalOpen(true);
      return;
    }

    executeCryptographicSign(selectedCertId);
  };

  const handleSelectNextUnsigned = () => {
    const nextUnsigned = PENDING_CERTIFICATES.find((c) => !signedMap[c.id]?.isSigned);
    if (nextUnsigned) {
      setSelectedCertId(nextUnsigned.id);
      setComplianceMode(nextUnsigned.defaultMode);
    }
  };

  const handleCopyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.info('Copied to Clipboard', `${label} copied.`);
  };

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#09090B] tracking-[-0.02em]">
            EN 10204:2004 Clause 6 QA Sign-Off Queue
          </h2>
          <p className="text-xs text-[#52525B] mt-0.5">
            Authorized Inspection Representative digital attestation and byte-identical Annex A
            packaging
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#E4E4E7] text-xs font-medium text-[#52525B]">
            <span className="font-mono tabular-nums text-[#09090B] font-semibold">
              {remainingCount}
            </span>{' '}
            pending sign-off
          </span>

          {isAuthenticated ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs text-[#047857] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Signatory: {user?.name || 'R. K. Chatterjee'}{' '}
                <span className="font-mono tabular-nums">({user?.emp_id || 'QA-04'})</span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsChallengeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-amber-100 border border-[#FDE68A] text-xs font-medium text-[#B45309] transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Unlock Signatory Passkey</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PENDING_CERTIFICATES.map((cert) => {
          const isSelected = selectedCertId === cert.id;
          const isSigned = !!signedMap[cert.id]?.isSigned;

          return (
            <button
              key={cert.id}
              type="button"
              onClick={() => {
                setSelectedCertId(cert.id);
                setComplianceMode(cert.defaultMode);
              }}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FFFFFF] border-[#059669] ring-1 ring-[#059669] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                  : 'bg-[#FFFFFF] hover:bg-[#FAFAFA] border-[#E4E4E7]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono tabular-nums text-xs font-semibold text-[#09090B]">
                  {cert.invoice}
                </span>
                {isSigned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Signed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                    Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-[#09090B] font-medium truncate">
                {cert.productTitle.split('(')[0].trim()}
              </div>
              <div className="text-xs text-[#52525B] mt-1 flex items-center gap-1.5">
                <span className="font-mono tabular-nums">{cert.tonnage} MT</span>
                <span>·</span>
                <span className="truncate">{cert.destination}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Signed Seal Banner */}
      {isCurrentCertSigned && (
        <div className="px-4 py-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs text-[#047857] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong className="font-semibold">Digitally Signed (Ed25519):</strong> Parameters
              recorded with tamper-evident SHA-256 verification and byte-identical upstream Annex A.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-emerald-200 font-mono tabular-nums text-xs font-medium text-[#047857]">
            {signedMap[selectedCertId]?.verificationCode || currentCert.verificationCode}
          </span>
        </div>
      )}

      {/* 2-Card Segmented Mode Selector (Mode A vs Mode B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          disabled={isCurrentCertSigned}
          onClick={() => setComplianceMode('TRANSFORMED_3_1')}
          className={`p-5 rounded-xl text-left border transition-all ${
            isCurrentCertSigned ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
          } ${
            complianceMode === 'TRANSFORMED_3_1'
              ? 'bg-[#FFFFFF] border-[#059669] ring-1 ring-[#059669] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              : 'bg-[#FFFFFF] border-[#E4E4E7] hover:bg-[#FAFAFA]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium">
              Mode A · Transformed 3.1 + Annex A
            </span>
            {complianceMode === 'TRANSFORMED_3_1' && (
              <Check className="w-4 h-4 text-[#059669] shrink-0" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-[#09090B]">
            Issue Factory 3.1 + Preserve Upstream Mill 3.1 as Annex A
          </h3>
          <p className="text-xs text-[#52525B] leading-relaxed mt-1">
            For forged flanges (<span className="font-mono text-[#09090B]">CN 7307</span>),
            heat-treated fasteners (<span className="font-mono text-[#09090B]">CN 7318</span>), or
            welded tubes (<span className="font-mono text-[#09090B]">CN 7306</span>) where
            mechanical properties were transformed during manufacturing.
          </p>
        </button>

        <button
          type="button"
          disabled={isCurrentCertSigned}
          onClick={() => setComplianceMode('CLAUSE_6_PASSTHROUGH')}
          className={`p-5 rounded-xl text-left border transition-all ${
            isCurrentCertSigned ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
          } ${
            complianceMode === 'CLAUSE_6_PASSTHROUGH'
              ? 'bg-[#FFFFFF] border-[#2563EB] ring-1 ring-[#2563EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              : 'bg-[#FFFFFF] border-[#E4E4E7] hover:bg-[#FAFAFA]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] border border-blue-200 text-[#2563EB] text-xs font-medium">
              Mode B · Clause 6 Pass-Through
            </span>
            {complianceMode === 'CLAUSE_6_PASSTHROUGH' && (
              <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-[#09090B]">
            Clause 6 Declaration of Compliance + Byte-Identical Original
          </h3>
          <p className="text-xs text-[#52525B] leading-relaxed mt-1">
            For machined or cut bar stock where raw material metallurgy remains unchanged. Bundles
            the Clause 6 packing declaration with the unaltered upstream mill certificate.
          </p>
        </button>
      </div>

      {/* Daylight White Certificate Preview Sheet */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Sheet Header */}
        <div className="px-5 py-4 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#52525B]">Target Export Invoice</div>
            <div className="text-sm font-semibold text-[#09090B] mt-0.5">
              <span className="font-mono tabular-nums">{currentCert.invoice}</span> ·{' '}
              {currentCert.productTitle}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#52525B]">Allocated Heat</span>
            <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums font-medium">
              #{currentCert.allocatedHeat}
            </span>
            <span className="text-[#52525B] hidden sm:inline">({currentCert.millName})</span>
          </div>
        </div>

        {/* Certificate Structured Metadata Grid */}
        <div className="p-5 space-y-5">
          <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#09090B]">
                {complianceMode === 'TRANSFORMED_3_1'
                  ? 'Factory Transformed EN 10204 3.1 Cover Certificate'
                  : 'EN 10204:2004 Clause 6 Pass-Through Declaration'}
              </span>
              <span
                className={`font-medium ${
                  isCurrentCertSigned ? 'text-[#059669]' : 'text-[#B45309]'
                }`}
              >
                {isCurrentCertSigned ? 'Digitally Signed (Ed25519)' : 'Awaiting Inspector Signature'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E7] bg-[#FFFFFF] text-xs">
              <div className="p-3.5">
                <span className="text-[#52525B] block">Exporter / Manufacturer</span>
                <span className="font-medium text-[#09090B] block mt-0.5">
                  Howrah Precision Forgings Pvt. Ltd.
                </span>
              </div>
              <div className="p-3.5">
                <span className="text-[#52525B] block">EU Installation ID</span>
                <span className="font-mono tabular-nums font-semibold text-[#09090B] block mt-0.5">
                  IN-WB-4409
                </span>
              </div>
              <div className="p-3.5">
                <span className="text-[#52525B] block">Country of Melt &amp; Pour</span>
                <span className="font-semibold text-[#047857] block mt-0.5">India (ISO: IN)</span>
              </div>
              <div className="p-3.5">
                <span className="text-[#52525B] block">Upstream Annex A</span>
                <span className="font-medium text-[#2563EB] block mt-0.5">
                  Byte-identical original preserved
                </span>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#E4E4E7] bg-[#FAFAFA] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#047857] font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Ladle spectrometry verified in spec</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#047857] font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Tensile &amp; hardness results verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#047857] font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Mass-balance allocation reconciled</span>
              </div>
            </div>
          </div>

          {/* Dark-Carbon #0F1218 Authorized Inspection Representative Sign-Off Panel */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#0F1218] text-[#F4F4F5] border border-white/[0.08] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#F4F4F5]">
                    Authorized Inspection Representative Sign-Off
                  </h4>
                  <p className="text-xs text-[#A1A1AA]">
                    EN 10204:2004 Clause 4 &amp; Clause 6 Independent QA Attestation
                  </p>
                </div>
              </div>
              <span className="font-mono tabular-nums text-xs text-[#A1A1AA]">
                SHA-256: {currentCert.sha256.slice(0, 14)}…
              </span>
            </div>

            {/* Inspector Metadata Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#161A22] border border-white/[0.08] text-xs">
              <div>
                <span className="text-[#A1A1AA] block">Authorized Representative</span>
                <span className="font-medium text-[#F4F4F5] block mt-0.5">
                  {user?.name || 'R. K. Chatterjee'}
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA] block">Designation &amp; Signatory ID</span>
                <span className="font-medium text-[#F4F4F5] block mt-0.5">
                  Head of Metallurgy &amp; QA{' '}
                  <span className="font-mono tabular-nums text-[#A1A1AA]">
                    ({user?.emp_id || 'QA-04'})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA] block">EN 10204 Independence Status</span>
                <span className="font-medium text-emerald-400 block mt-0.5">
                  Independent of manufacturing dept.
                </span>
              </div>
            </div>

            {/* Mandatory Legal Attestation Checkbox */}
            <button
              type="button"
              disabled={isCurrentCertSigned}
              onClick={() =>
                setAttestations((prev) => ({
                  ...prev,
                  [selectedCertId]: !prev[selectedCertId],
                }))
              }
              className={`w-full p-4 rounded-lg border text-left transition-colors flex items-start gap-3 ${
                isCurrentCertSigned ? 'cursor-default' : 'cursor-pointer'
              } ${
                currentAttestationChecked || isCurrentCertSigned
                  ? 'bg-emerald-500/10 border-emerald-500/35'
                  : 'bg-[#161A22] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {currentAttestationChecked || isCurrentCertSigned ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-[#A1A1AA]" />
                )}
              </div>
              <p className="text-xs text-[#D4D4D8] leading-relaxed">
                <strong className="text-[#F4F4F5] font-semibold">Legal Attestation:</strong> I
                attest under EN 10204:2004 that the delivered goods for invoice{' '}
                <span className="font-mono tabular-nums text-amber-300 font-medium">
                  {currentCert.invoice}
                </span>{' '}
                conform to the purchase order and applicable ASTM/EN specifications, that the
                Country of Melt &amp; Pour is India (IN), and that the upstream mill certificate
                attached as Annex A is preserved byte-identical without modification.
              </p>
            </button>

            {/* Unsigned CTA vs Crisp Verified Seal State */}
            {!isCurrentCertSigned ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="text-xs text-[#A1A1AA] flex items-center gap-2">
                  {isAuthenticated ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Authenticated signatory ready:{' '}
                        <span className="text-[#F4F4F5] font-medium">
                          {user?.name || 'R. K. Chatterjee'}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Signatory PIN challenge required prior to cryptographic signing.</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleApplySignature}
                  disabled={!currentAttestationChecked || isSigning}
                  className="w-full sm:w-auto px-5 h-10 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Stamp className="w-4 h-4" />
                  <span>
                    {isSigning
                      ? 'Applying Digital Signature...'
                      : 'Sign with Ed25519 & Issue Clause 6 Package'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-lg bg-[#161A22] border border-emerald-500/35 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#F4F4F5] flex flex-wrap items-center gap-2">
                          <span>
                            Digitally Signed (Ed25519) by{' '}
                            {signedMap[selectedCertId]?.inspectorName || 'R. K. Chatterjee'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
                            {signedMap[selectedCertId]?.inspectorId || 'QA-04'}
                          </span>
                        </div>
                        <div className="text-xs text-[#A1A1AA] font-mono tabular-nums mt-0.5">
                          {signedMap[selectedCertId]?.timestamp}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyValue(
                          signedMap[selectedCertId]?.verificationCode || currentCert.verificationCode,
                          'Ed25519 verification code'
                        )
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1218] hover:bg-white/[0.06] border border-white/[0.12] text-xs font-mono tabular-nums text-emerald-300 cursor-pointer"
                      title="Copy Ed25519 verification code"
                    >
                      <span>
                        Code: {signedMap[selectedCertId]?.verificationCode || currentCert.verificationCode}
                      </span>
                      <Copy className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    </button>
                  </div>

                  {/* Tamper-Evident Signature Hash */}
                  <div className="p-3 rounded-lg bg-[#0A0C10] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA] font-medium">
                        Tamper-evident SHA-256 / Ed25519 signature digest
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyValue(
                            signedMap[selectedCertId]?.hmacSignature || '',
                            'Signature digest'
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy hash</span>
                      </button>
                    </div>
                    <div className="font-mono tabular-nums text-xs text-[#F4F4F5] truncate select-all">
                      {signedMap[selectedCertId]?.hmacSignature ||
                        'hl_sig_v1_17af54387e554162e6031e600d780d1067bddb03bea69187eaa685b0178a56c5'}
                    </div>
                  </div>
                </div>

                {/* Next Step Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  {remainingCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectNextUnsigned}
                      className="px-4 h-9 rounded-lg bg-[#161A22] hover:bg-white/[0.08] border border-white/[0.12] text-[#F4F4F5] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Review Next Pending ({remainingCount})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onNavigateToDossier && (
                    <button
                      type="button"
                      onClick={onNavigateToDossier}
                      className="px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Customs Dossier Builder</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspector Passkey / 2FA Sign-Off Challenge Modal */}
      <InspectorPinChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        documentSha256={currentCert.sha256}
        invoiceNumber={currentCert.invoice}
        onSuccess={() => {
          executeCryptographicSign(selectedCertId);
        }}
      />

      {/* All Signed Queue Cleared Notice */}
      {remainingCount === 0 && (
        <div className="p-5 rounded-xl bg-[#ECFDF5] border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-emerald-200 text-[#059669] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#09090B]">Sign-Off Queue Cleared</h4>
              <p className="text-xs text-[#52525B] mt-0.5">
                All 3 pending export certificates have been digitally signed for Hamburg,
                Felixstowe, and Genoa shipments.
              </p>
            </div>
          </div>
          {onNavigateToDossier && (
            <button
              type="button"
              onClick={onNavigateToDossier}
              className="px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium shrink-0 transition-colors cursor-pointer"
            >
              Open Customs Dossier
            </button>
          )}
        </div>
      )}
    </div>
  );
};
