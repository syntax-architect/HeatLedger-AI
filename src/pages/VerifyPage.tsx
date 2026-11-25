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
    <div className="min-h-screen bg-[#121316] text-[#EAEAEA] flex flex-col">
      {/* Forged Graphite Registry Header */}
      <header className="sticky top-0 z-30 bg-[#121316]/95 backdrop-blur-md border-b border-[#EAEAEA]/[0.08]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#EAEAEA]/[0.12]" />
            <span className="hidden sm:inline-block text-xs text-[#9FA3AD]">
              Public cryptographic registry
            </span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Verification Workspace on Dark Graphite Framing Mill Parchment Certificate Sheet */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#FCFBF8] text-[#18181A] border border-[#EAEAEA]/12 rounded-2xl overflow-hidden"
        >
          {/* Top Certificate Status Banner */}
          {bannerState === 'verified' && (
            <div className="px-6 py-4 bg-[#ECFDF5] border-b border-[#059669]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#047857] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#065F46]">
                    Tamper-evidence seal intact
                  </div>
                  <div className="text-xs text-[#047857]">
                    Ed25519 signature and SHA-256 digest match the published ledger
                  </div>
                </div>
              </div>
              {record && (
                <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded bg-[#FCFBF8] border border-[#059669]/25 font-mono tabular-nums text-xs font-medium text-[#047857] shrink-0">
                  Valid · v{record.version}
                </span>
              )}
            </div>
          )}

          {bannerState === 'superseded' && (
            <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#B45309]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#B45309] text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#92400E]">
                    Certificate superseded by newer amendment
                  </div>
                  <div className="text-xs text-[#B45309]">
                    Version v{record?.version} was validly signed but replaced by a newer revision
                  </div>
                </div>
              </div>
              {record && (
                <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded bg-[#FCFBF8] border border-[#B45309]/25 font-mono tabular-nums text-xs font-medium text-[#B45309] shrink-0">
                  Superseded · v{record.version}
                </span>
              )}
            </div>
          )}

          {(bannerState === 'tampered' || bannerState === 'revoked') && (
            <div className="px-6 py-4 bg-[#FEF2F2] border-b border-[#DC2626]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#991B1B]">
                    {bannerState === 'tampered'
                      ? 'Integrity mismatch — document modified after sealing'
                      : 'Certificate revoked by issuing plant'}
                  </div>
                  <div className="text-xs text-[#DC2626]">
                    {tamperResult?.error ||
                      'File digest does not match the registered Ed25519 signature'}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center self-start sm:self-center px-2.5 py-1 rounded bg-[#FCFBF8] border border-[#DC2626]/25 font-mono text-xs font-medium text-[#DC2626] shrink-0">
                {bannerState === 'tampered' ? 'Tampered' : 'Revoked'}
              </span>
            </div>
          )}

          {bannerState === 'idle' && (
            <div className="px-6 py-4 bg-[#F7F5F0] border-b border-[#18181A]/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FCFBF8] border border-[#18181A]/10 text-[#047857] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-sm font-medium text-[#18181A]">
                    Certificate Integrity &amp; Signature Verifier
                  </h1>
                  <p className="text-xs text-[#55544E] mt-0.5">
                    Customs pack tamper-evidence check sealed by the plant authorised inspector
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded bg-[#FCFBF8] border border-[#18181A]/10 font-mono text-xs text-[#55544E]">
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
                className="block text-xs font-medium text-[#18181A]"
              >
                Verification code or SHA-256 hash
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="verify-code-input"
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. HL-2026-A1B2 or 64-character SHA-256 digest"
                  className="flex-1 h-10 px-3.5 bg-[#FFFFFF] border border-[#18181A]/12 rounded-lg font-mono text-xs text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputCode.trim()}
                  className="h-10 px-5 bg-[#18181A] hover:bg-black disabled:opacity-50 text-[#FCFBF8] text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <Search className="w-4 h-4" strokeWidth={1.5} />
                  <span>{isLoading ? 'Verifying...' : 'Verify record'}</span>
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
              className={`p-6 rounded-xl border border-dashed transition-colors text-center space-y-2 ${
                isDragging
                  ? 'bg-[#ECFDF5] border-[#059669]'
                  : 'bg-[#F7F5F0] border-[#18181A]/20 hover:border-[#18181A]/35'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#FCFBF8] border border-[#18181A]/10 flex items-center justify-center mx-auto text-[#55544E]">
                <Upload className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-xs font-medium text-[#18181A]">
                Drop Certificate Package or exported customs pack PDF to check tamper-evidence
              </div>
              <p className="text-xs text-[#55544E]">
                Computes SHA-256 locally against the registered Ed25519 public key without altering
                the file
              </p>
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium cursor-pointer border border-[#18181A]/12 transition-colors">
                  <FileCheck2 className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
                  <span>Select PDF file</span>
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
                className="p-4 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/20 text-xs text-[#DC2626] flex items-center gap-2.5"
              >
                <XCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Computed Hash Detail on Tamper Alert */}
            {tamperResult && tamperResult.tampered && tamperResult.computed_sha256 && (
              <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/20 space-y-1.5">
                <div className="text-xs font-medium text-[#991B1B] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                  <span>Uploaded file digest mismatch</span>
                </div>
                <div className="text-xs font-mono tabular-nums text-[#7F1D1D] break-all">
                  Computed SHA-256: {tamperResult.computed_sha256}
                </div>
              </div>
            )}

            {/* Verified Record Metadata & Cryptographic Fingerprint Ledger */}
            <AnimatePresence>
              {record && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6 pt-4 border-t border-[#18181A]/[0.08]"
                >
                  {/* Attestation Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#18181A]/[0.08] border border-[#18181A]/10 rounded-xl overflow-hidden">
                    <div className="p-4 bg-[#FCFBF8]">
                      <div className="text-xs text-[#78766E]">Issuing organization</div>
                      <div className="text-sm font-medium text-[#18181A] mt-1">
                        {record.organization_name}
                      </div>
                    </div>
                    <div className="p-4 bg-[#FCFBF8]">
                      <div className="text-xs text-[#78766E]">Export invoice reference</div>
                      <div className="text-sm font-mono tabular-nums font-medium text-[#18181A] mt-1">
                        {record.invoice_number}
                      </div>
                    </div>
                    <div className="p-4 bg-[#FCFBF8]">
                      <div className="text-xs text-[#78766E]">Authorised QA signer</div>
                      <div className="text-sm font-medium text-[#18181A] mt-1">
                        {record.signer_name}
                      </div>
                      <div className="text-xs text-[#55544E] mt-0.5">Role: {record.signer_role}</div>
                    </div>
                    <div className="p-4 bg-[#FCFBF8]">
                      <div className="text-xs text-[#78766E]">Signature timestamp (UTC)</div>
                      <div className="text-sm font-mono font-medium tabular-nums text-[#18181A] mt-1">
                        {record.signed_at}
                      </div>
                      <div className="text-xs text-[#55544E] mt-0.5">
                        Revision v{record.version} · Key{' '}
                        <span className="font-mono text-[#18181A]">{record.key_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Forged Graphite Cryptographic Fingerprints Ledger */}
                  <div className="rounded-xl border border-[#EAEAEA]/10 bg-[#121316] text-[#EAEAEA] overflow-hidden">
                    <div className="px-4 py-3 bg-[#181A1F] border-b border-[#EAEAEA]/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#EAEAEA]">
                        <Lock className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                        <span>Cryptographic fingerprints (SHA-256 and Ed25519)</span>
                      </div>
                      <span className="text-xs font-mono text-[#6F7480]">{record.key_id}</span>
                    </div>

                    <div className="divide-y divide-[#EAEAEA]/[0.08]">
                      {/* Cover PDF SHA-256 */}
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[#9FA3AD]">Cover PDF SHA-256</div>
                          <div className="font-mono tabular-nums text-xs text-[#EAEAEA] break-all mt-1">
                            {record.pdf_sha256}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue('pdf_sha256', record.pdf_sha256)}
                          className="self-start sm:self-center inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAEAEA]/12 bg-[#181A1F] hover:bg-[#22252B] text-xs font-medium text-[#EAEAEA] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'pdf_sha256' ? (
                            <Check className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                          ) : (
                            <Copy className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                          )}
                          <span>{copiedField === 'pdf_sha256' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Upstream Mill MTC SHA-256 */}
                      {record.upstream_sha256 && record.upstream_sha256 !== 'none' && (
                        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-[#9FA3AD]">
                              Upstream mill MTC SHA-256 (Annex A)
                            </div>
                            <div className="font-mono tabular-nums text-xs text-[#EAEAEA] break-all mt-1">
                              {record.upstream_sha256}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyValue('upstream_sha256', record.upstream_sha256!)}
                            className="self-start sm:self-center inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAEAEA]/12 bg-[#181A1F] hover:bg-[#22252B] text-xs font-medium text-[#EAEAEA] transition-colors cursor-pointer shrink-0"
                          >
                            {copiedField === 'upstream_sha256' ? (
                              <Check className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                            ) : (
                              <Copy className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                            )}
                            <span>{copiedField === 'upstream_sha256' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}

                      {/* Ed25519 Signature */}
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[#9FA3AD]">Ed25519 signature (Base64)</div>
                          <div className="font-mono tabular-nums text-xs text-[#10B981] break-all mt-1">
                            {record.signature_b64}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue('signature_b64', record.signature_b64)}
                          className="self-start sm:self-center inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAEAEA]/12 bg-[#181A1F] hover:bg-[#22252B] text-xs font-medium text-[#EAEAEA] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'signature_b64' ? (
                            <Check className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                          ) : (
                            <Copy className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                          )}
                          <span>{copiedField === 'signature_b64' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Published Public Key */}
                      {record.public_key_b64 && (
                        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181A1F]/60">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-[#9FA3AD] flex items-center gap-1.5">
                              <KeyRound className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                              <span>Published Ed25519 public key</span>
                            </div>
                            <div className="font-mono tabular-nums text-xs text-[#EAEAEA] break-all mt-1">
                              {record.public_key_b64}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyValue('public_key_b64', record.public_key_b64!)}
                            className="self-start sm:self-center inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAEAEA]/12 bg-[#121316] hover:bg-[#22252B] text-xs font-medium text-[#EAEAEA] transition-colors cursor-pointer shrink-0"
                          >
                            {copiedField === 'public_key_b64' ? (
                              <Check className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                            ) : (
                              <Copy className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                            )}
                            <span>{copiedField === 'public_key_b64' ? 'Copied' : 'Copy key'}</span>
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

        {/* Grounded Statutory Footer */}
        <footer className="text-center space-y-2 px-4 pt-2">
          <div className="text-xs font-mono text-[#9FA3AD]">
            Regulation (EU) 2026/1963 · UK Customs Origin Evidence
          </div>
          <p className="text-xs text-[#6F7480] max-w-2xl mx-auto leading-relaxed">
            HeatLedger supports compliance preparation and cryptographic attestation, not customs
            brokerage or legal advice. Verification checks tamper-evident SHA-256 byte-identity and
            signer metadata recorded at sealing time.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default VerifyPage;
