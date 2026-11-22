import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Search,
  Upload,
  XCircle,
  Copy,
  Check,
  FileCheck2,
  KeyRound,
} from 'lucide-react';
import { ApiService, VerificationRecord, FileTamperCheckResult } from '../services/api';
import { Logo } from '../components/brand/Logo';

export const VerifyPage: React.FC = () => {
  const { code: routeCode } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState<string>(routeCode || '');
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [tamperResult, setTamperResult] = useState<FileTamperCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleLookup = useCallback(async (lookupCode: string) => {
    if (!lookupCode.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setTamperResult(null);

    try {
      const res = await ApiService.lookupVerification(lookupCode.trim());
      setRecord(res);
    } catch (err: any) {
      setRecord(null);
      setErrorMsg(err.message || 'No registered certificate found for this verification code.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeCode) {
      setInputCode(routeCode);
      handleLookup(routeCode);
    }
  }, [routeCode, handleLookup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      navigate(`/verify/${encodeURIComponent(inputCode.trim())}`);
      handleLookup(inputCode.trim());
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await ApiService.verifyCheckFile(file);
      setTamperResult(result);
      if (result.verification_code) {
        setInputCode(result.verification_code);
        const res = await ApiService.lookupVerification(result.verification_code).catch(() => null);
        if (res) setRecord(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File verification error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const copyValue = (fieldKey: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Determine top certificate banner state
  const bannerState: 'tampered' | 'revoked' | 'superseded' | 'verified' | 'idle' =
    tamperResult?.tampered
      ? 'tampered'
      : record?.status === 'REVOKED'
        ? 'revoked'
        : record?.status === 'SUPERSEDED'
          ? 'superseded'
          : record?.status === 'VALID'
            ? 'verified'
            : 'idle';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col">
      {/* Institutional Header */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#E4E4E7]" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#52525B]">
              Public Cryptographic Registry
            </span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] hover:text-[#09090B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HeatLedger Home</span>
          </Link>
        </div>
      </header>

      {/* Main Verification Certificate Card */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl shadow-xs overflow-hidden"
        >
          {/* Top Institutional Status Banner */}
          {bannerState === 'verified' && (
            <div className="px-6 py-4 bg-[#ECFDF5] border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#059669] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#065F46]">
                    Tamper-Evidence Seal Intact (OK)
                  </div>
                  <div className="text-xs text-[#047857]">
                    Ed25519 signature and tamper-evident SHA-256 digest match the published ledger.
                  </div>
                </div>
              </div>
              {record && (
                <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-emerald-200 font-mono text-xs font-semibold text-[#047857] shrink-0">
                  VALID · v{record.version}
                </span>
              )}
            </div>
          )}

          {bannerState === 'superseded' && (
            <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#92400E]">
                    Certificate Superseded by Newer Amendment
                  </div>
                  <div className="text-xs text-[#B45309]">
                    Version v{record?.version} was validly signed but replaced by a subsequent revision.
                  </div>
                </div>
              </div>
              {record && (
                <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#FDE68A] font-mono text-xs font-semibold text-[#B45309] shrink-0">
                  SUPERSEDED · v{record.version}
                </span>
              )}
            </div>
          )}

          {(bannerState === 'tampered' || bannerState === 'revoked') && (
            <div className="px-6 py-4 bg-[#FEF2F2] border-b border-[#FECACA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#991B1B]">
                    {bannerState === 'tampered'
                      ? 'Integrity Mismatch — Document Modified After Sealing'
                      : 'Certificate Revoked by Issuing Plant'}
                  </div>
                  <div className="text-xs text-[#DC2626]">
                    {tamperResult?.error ||
                      'The file digest does not match the registered Ed25519 signature.'}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#FECACA] font-mono text-xs font-semibold text-[#DC2626] shrink-0">
                {bannerState === 'tampered' ? 'TAMPERED' : 'REVOKED'}
              </span>
            </div>
          )}

          {bannerState === 'idle' && (
            <div className="px-6 py-4 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#059669]" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-[#09090B]">
                    Certificate Integrity & Signature Verifier
                  </h1>
                  <p className="text-xs text-[#52525B]">
                    Customs Pack Tamper-Evidence Verification. Sealed by the plant's authorised inspector.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#E4E4E7] font-mono text-xs text-[#52525B]">
                Ed25519
              </span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-6 space-y-6">
            {/* Code / Hash Lookup Form */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <label
                htmlFor="verify-code-input"
                className="block text-xs font-medium text-[#09090B]"
              >
                Verification Code or Document SHA-256 Hash
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="verify-code-input"
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. HL-2026-A1B2 or 64-character SHA-256 hex digest"
                  className="flex-1 h-10 px-3.5 bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg font-mono text-xs text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputCode.trim()}
                  className="h-10 px-5 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Verifying...' : 'Verify Record'}</span>
                </button>
              </div>
            </form>

            {/* Drag-and-Drop PDF Byte-Integrity Checker */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-5 rounded-xl border border-dashed transition-colors text-center space-y-2 ${
                isDragging
                  ? 'bg-[#ECFDF5] border-[#059669]'
                  : 'bg-[#FAFAFA] border-[#D4D4D8] hover:border-[#A1A1AA]'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center mx-auto text-[#52525B]">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-xs font-medium text-[#09090B]">
                Drop Certificate Package or exported customs pack PDF here to check tamper-evidence
              </div>
              <p className="text-xs text-[#52525B]">
                Computes SHA-256 against the registered Ed25519 public key without altering the file.
              </p>
              <div className="pt-1">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium cursor-pointer border border-[#E4E4E7] transition-colors">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Select PDF File</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Lookup Error Banner */}
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2.5"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Computed Hash Detail on Tamper Alert */}
            {tamperResult && tamperResult.tampered && tamperResult.computed_sha256 && (
              <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] space-y-1.5">
                <div className="text-xs font-semibold text-[#991B1B] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Uploaded File Digest Mismatch</span>
                </div>
                <div className="text-xs font-mono text-[#7F1D1D] break-all">
                  Computed SHA-256: {tamperResult.computed_sha256}
                </div>
              </div>
            )}

            {/* Verified Record Metadata & Cryptographic Fingerprint Table */}
            <AnimatePresence>
              {record && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6 pt-2 border-t border-[#E4E4E7]"
                >
                {/* Attestation Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#E4E4E7] border border-[#E4E4E7] rounded-lg overflow-hidden">
                  <div className="p-3.5 bg-[#FFFFFF]">
                    <div className="text-xs text-[#52525B]">Issuing Organization</div>
                    <div className="text-sm font-semibold text-[#09090B] mt-0.5">
                      {record.organization_name}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#FFFFFF]">
                    <div className="text-xs text-[#52525B]">Export Invoice Reference</div>
                    <div className="text-sm font-mono font-semibold text-[#09090B] mt-0.5">
                      {record.invoice_number}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#FFFFFF]">
                    <div className="text-xs text-[#52525B]">Authorised QA Signer</div>
                    <div className="text-sm font-semibold text-[#09090B] mt-0.5">
                      {record.signer_name}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">Role: {record.signer_role}</div>
                  </div>
                  <div className="p-3.5 bg-[#FFFFFF]">
                    <div className="text-xs text-[#52525B]">Signature Timestamp (UTC)</div>
                    <div className="text-sm font-mono font-semibold tabular-nums text-[#09090B] mt-0.5">
                      {record.signed_at}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">
                      Revision v{record.version} · Key ID{' '}
                      <span className="font-mono text-[#09090B]">{record.key_id}</span>
                    </div>
                  </div>
                </div>

                {/* Tabular Cryptographic Fingerprint Table */}
                <div className="rounded-lg border border-[#E4E4E7] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                      <Lock className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Cryptographic Fingerprints (SHA-256 &amp; Ed25519)</span>
                    </div>
                    <span className="text-xs font-mono text-[#52525B]">{record.key_id}</span>
                  </div>

                  <div className="divide-y divide-[#E4E4E7] bg-[#FFFFFF]">
                    {/* Cover PDF SHA-256 */}
                    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#52525B]">Cover PDF SHA-256</div>
                        <div className="font-mono text-xs text-[#09090B] break-all mt-0.5">
                          {record.pdf_sha256}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue('pdf_sha256', record.pdf_sha256)}
                        className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer shrink-0"
                      >
                        {copiedField === 'pdf_sha256' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                        )}
                        <span>{copiedField === 'pdf_sha256' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Upstream Mill MTC SHA-256 */}
                    {record.upstream_sha256 && record.upstream_sha256 !== 'none' && (
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#52525B]">
                            Upstream Mill MTC SHA-256 (Annex A)
                          </div>
                          <div className="font-mono text-xs text-[#09090B] break-all mt-0.5">
                            {record.upstream_sha256}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue('upstream_sha256', record.upstream_sha256!)}
                          className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'upstream_sha256' ? (
                            <Check className="w-3.5 h-3.5 text-[#059669]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                          )}
                          <span>{copiedField === 'upstream_sha256' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {/* Ed25519 Signature */}
                    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#52525B]">
                          Ed25519 Signature (Base64)
                        </div>
                        <div className="font-mono text-xs text-[#047857] break-all mt-0.5">
                          {record.signature_b64}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue('signature_b64', record.signature_b64)}
                        className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer shrink-0"
                      >
                        {copiedField === 'signature_b64' ? (
                          <Check className="w-3.5 h-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                        )}
                        <span>{copiedField === 'signature_b64' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Published Public Key */}
                    {record.public_key_b64 && (
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAFAFA]">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#52525B] flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-[#52525B]" />
                            <span>Published Ed25519 Public Key</span>
                          </div>
                          <div className="font-mono text-xs text-[#09090B] break-all mt-0.5">
                            {record.public_key_b64}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue('public_key_b64', record.public_key_b64!)}
                          className="self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'public_key_b64' ? (
                            <Check className="w-3.5 h-3.5 text-[#059669]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                          )}
                          <span>{copiedField === 'public_key_b64' ? 'Copied' : 'Copy Key'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Institutional Footer & Standard Disclaimer */}
        <footer className="text-center space-y-2 px-4">
          <div className="text-xs font-medium text-[#52525B]">
            Regulation (EU) 2026/1963 · UK Customs Origin Evidence
          </div>
          <p className="text-xs text-[#52525B] max-w-2xl mx-auto leading-relaxed">
            HeatLedger AI is a software compliance and cryptographic attestation tool, not a
            customs brokerage or legal advisory service. Verification confirms tamper-evident
            SHA-256 byte-identity and signer metadata recorded at sealing time; final customs
            clearance remains subject to the relevant European or UK customs authority.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default VerifyPage;
