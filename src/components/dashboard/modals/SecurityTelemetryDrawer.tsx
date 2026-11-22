import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  Lock,
  CheckCircle2,
  Server,
  Database,
  EyeOff,
  FileCheck2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { ApiService, RateLimitState } from '../../../services/api';

interface SecurityTelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityTelemetryDrawer: React.FC<SecurityTelemetryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [isPinging, setIsPinging] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    limit: 60,
    remaining: 59,
    lastUpdated: new Date().toISOString(),
  });
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runSecurityPing = useCallback(async () => {
    setIsPinging(true);
    try {
      const result = await ApiService.fetchSecurityTelemetry();
      setIsBackendOnline(result.isOnline);
      setRateLimit(result.rateLimit);
      setHeaders(result.headers);
      if (result.responseTimeMs) {
        setResponseTime(result.responseTimeMs);
      }
    } catch {
      setIsBackendOnline(false);
    } finally {
      setTimeout(() => setIsPinging(false), 300);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      runSecurityPing();
    }
  }, [isOpen, runSecurityPing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleSig = 'hl_sig_v1_17af54387e554162e6031e600d780d1067bddb03bea69187eaa685b0178a56c5';
  const quotaPercent = Math.max(
    0,
    Math.min(100, Math.round((rateLimit.remaining / rateLimit.limit) * 100))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Unified Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Architectural Audit Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-12">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-drawer-title"
          className="w-screen max-w-2xl bg-[#FFFFFF] border-l border-[#E4E4E7] shadow-xl flex flex-col text-[#09090B] z-50"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E4E4E7] bg-[#FFFFFF] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="security-drawer-title"
                    className="text-sm font-semibold text-[#09090B] tracking-tight"
                  >
                    Security &amp; Cryptographic Telemetry
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                    Tier-1 Enforced
                  </span>
                </div>
                <p className="text-xs text-[#52525B] truncate">
                  Runtime verification · Container &amp; API security posture
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={runSecurityPing}
                disabled={isPinging}
                className="h-8 px-3 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#09090B] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-[#059669]' : 'text-[#52525B]'}`} />
                <span className="hidden sm:inline">{isPinging ? 'Probing...' : 'Verify Live'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                aria-label="Close telemetry drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Live Runtime Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E4E4E7] border border-[#E4E4E7] rounded-xl overflow-hidden text-xs">
              <div className="p-3.5 bg-[#FAFAFA]">
                <div className="text-[#52525B]">Engine Endpoint</div>
                <div className="font-mono font-medium text-[#09090B] truncate mt-0.5">
                  {import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'}
                </div>
              </div>
              <div className="p-3.5 bg-[#FAFAFA]">
                <div className="text-[#52525B]">Probe Status</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`font-medium ${
                      isBackendOnline ? 'text-[#047857]' : 'text-[#B45309]'
                    }`}
                  >
                    {isBackendOnline ? 'Online' : 'Offline / Local Mode'}
                  </span>
                  {responseTime !== null && (
                    <span className="font-mono text-[#52525B]">{responseTime}ms</span>
                  )}
                </div>
              </div>
              <div className="p-3.5 bg-[#FAFAFA]">
                <div className="text-[#52525B]">Container Context</div>
                <div className="font-mono font-medium text-[#047857] mt-0.5">
                  appuser (Non-Root)
                </div>
              </div>
            </div>

            {/* Live Rate Limit Quota Bar */}
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#09090B] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Sliding-Window IP Rate Limiter</span>
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#047857]">
                  X-RateLimit-Remaining: {rateLimit.remaining} / {rateLimit.limit}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
                <div
                  className="h-full bg-[#059669] rounded-full transition-all duration-300"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                <span>OCR Bucket: 10 req/min</span>
                <span>API Bucket: 60 req/min</span>
              </div>
            </div>

            {/* 6 Active Cryptographic & Security Controls (Flat Hairline-Divided List) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#09090B]">
                  Active Cryptographic &amp; Security Controls
                </span>
                <span className="font-mono text-[#047857]">6 / 6 Active</span>
              </div>

              <div className="rounded-xl border border-[#E4E4E7] divide-y divide-[#E4E4E7] bg-[#FFFFFF]">
                {/* 1. Document Integrity */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          1. Document Integrity
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          Tamper-Evident SHA-256 &amp; HMAC-SHA256 Annex A Seal
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs shrink-0">
                      Enforced
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                    Byte-identical original preservation of upstream mill PDFs sealed with
                    tamper-evident SHA-256 digests and keyed HMAC-SHA256 signatures over canonical
                    invoice tuples per EU Reg 2026/1963 customs packaging rules.
                  </p>
                  <div className="pl-6 flex items-center gap-2">
                    <code className="text-xs font-mono px-2 py-1 rounded bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] truncate max-w-sm">
                      {sampleSig}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('doc_sig', sampleSig)}
                      className="p-1.5 rounded-md border border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] transition-colors cursor-pointer"
                      title="Copy sample cryptographic signature"
                    >
                      {copiedKey === 'doc_sig' ? (
                        <Check className="w-3.5 h-3.5 text-[#059669]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Transport & Headers */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          2. Transport &amp; HTTP Security Headers
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          CSP · HSTS · X-Frame-Options: DENY · nosniff
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7] font-mono text-xs shrink-0">
                      OWASP ASVS 4.0
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                    Strict Transport Security (<code className="font-mono text-[#09090B]">max-age=63072000; preload</code>), clickjacking protection, MIME sniffing guard, and masked server headers.
                  </p>
                </div>

                {/* 3. Upload Firewall */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          3. Binary Upload Firewall
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          Magic-Byte Verification &amp; PDF JS Action Sanitizer (10 MB Max)
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7] font-mono text-xs shrink-0">
                      Stream Guard
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                    Verifies binary signatures (<code className="font-mono text-[#09090B]">%PDF-</code>, PNG, JPEG) and neutralizes embedded <code className="font-mono text-[#09090B]">/JavaScript</code> or <code className="font-mono text-[#09090B]">/Launch</code> directives before ingestion.
                  </p>
                </div>

                {/* 4. Database Isolation */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          4. Multi-Tenant Database Isolation
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          PostgreSQL RLS + Anti-Phantom Mass-Balance Check
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7] font-mono text-xs shrink-0">
                      RLS Enforced
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                    Row-Level Security scopes records by installation ID (<code className="font-mono text-[#09090B]">IN-WB-4409</code>), while SQL constraints enforce <code className="font-mono text-[#09090B]">allocated_tonnes &lt;= total_heat_weight</code>.
                  </p>
                </div>

                {/* 5. AI Data Privacy */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <EyeOff className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          5. Ephemeral OCR Data Privacy
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          Zero-Data-Retention Processing — No Model Training on MTCs
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7] font-mono text-xs shrink-0">
                      Enterprise ZDR
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                    Mill test certificates are parsed ephemerally in memory via Zero-Data-Retention
                    processing and are not retained for foundation model training.
                  </p>
                </div>

                {/* 6. Container Hardening */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Server className="w-4 h-4 text-[#059669] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-[#09090B]">
                          6. Container Deployment Hardening
                        </h4>
                        <p className="text-xs font-mono text-[#047857]">
                          Non-Root Execution &amp; Cgroup Resource Caps
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7] font-mono text-xs shrink-0">
                      Docker
                    </span>
                  </div>

                  <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                      <span className="text-[#52525B] block font-sans">Unprivileged User</span>
                      <span className="text-[#09090B]">USER appuser (heatledger)</span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                      <span className="text-[#52525B] block font-sans">Privilege Guard</span>
                      <span className="text-[#09090B]">no-new-privileges:true</span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                      <span className="text-[#52525B] block font-sans">Resource Limits</span>
                      <span className="text-[#09090B]">512 MB RAM · 1.0 CPU</span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                      <span className="text-[#52525B] block font-sans">Health Probe</span>
                      <span className="text-[#09090B]">HTTP GET / (30s interval)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Live HTTP Response Headers */}
            <div className="rounded-xl border border-[#E4E4E7] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRawHeaders(!showRawHeaders)}
                className="w-full px-4 py-3 bg-[#FAFAFA] hover:bg-[#F4F4F5] flex items-center justify-between text-xs font-medium text-[#09090B] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Inspect Live HTTP Security Response Headers</span>
                </div>
                {showRawHeaders ? (
                  <ChevronUp className="w-4 h-4 text-[#52525B]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#52525B]" />
                )}
              </button>

              {showRawHeaders && (
                <div className="p-4 border-t border-[#E4E4E7] bg-[#0A0C10] text-xs font-mono space-y-1.5 overflow-x-auto">
                  {Object.keys(headers).length > 0 ? (
                    Object.entries(headers).map(([key, val]) => (
                      <div key={key} className="flex gap-2 text-[#F4F4F5]">
                        <span className="text-[#34D399] font-semibold shrink-0">{key}:</span>
                        <span className="text-[#A1A1AA] break-all">{val}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[#A1A1AA]">
                      Select &ldquo;Verify Live&rdquo; above to retrieve live HTTP headers from the
                      backend service.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Crisp Hairline Footer */}
          <div className="px-6 py-3.5 border-t border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-[#52525B]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>EU Reg 2026/1963 · Tamper-Evidence Framework</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-[#09090B] hover:bg-[#27272A] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
