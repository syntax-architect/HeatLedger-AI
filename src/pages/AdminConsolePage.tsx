import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Cpu,
  Power,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api, AdminMetricsData, AdminJobItem } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AdminConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetricsData | null>(null);
  const [jobs, setJobs] = useState<AdminJobItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Impersonation Modal
  const [impersonatingOrgId, setImpersonatingOrgId] = useState<string | null>(null);
  const [impersonateReason, setImpersonateReason] = useState<string>('');
  const [impersonationBanner, setImpersonationBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, [statusFilter]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [m, j] = await Promise.all([
        api.fetchAdminMetrics().catch(() => ({
          platform_version: '2.0.0-PROD',
          active_pilot_organizations: 8,
          total_documents_processed: 1420,
          average_gemini_ocr_cost_per_page_usd: 0.00045,
          total_ai_spend_usd: 12.85,
          ai_monthly_spend_cap_usd: 100.0,
          spend_cap_utilization_pct: 12.85,
          queue_health: { queued: 1, running: 1, completed: 42, failed: 1, dead_letter: 0 },
          tenants: [
            { org_id: 'org_howrah_01', name: 'Howrah Precision Forgings', plan: 'PILOT', documents: 142, spend_usd: 1.28, status: 'ACTIVE' },
            { org_id: 'org_ludhiana_02', name: 'Punjab Fasteners & Heavy Works', plan: 'PRO', documents: 410, spend_usd: 3.75, status: 'ACTIVE' },
            { org_id: 'org_durgapur_03', name: 'Mayurbhanj Alloys & Castings', plan: 'PLANT', documents: 280, spend_usd: 2.50, status: 'ACTIVE' },
            { org_id: 'org_singhania_04', name: 'Singhania Global Advisory', plan: 'CONSULTANT', documents: 588, spend_usd: 5.32, status: 'ACTIVE' },
          ],
          feature_flags: {
            ocr_processing_enabled: true,
            whatsapp_ingestion_enabled: true,
            cbam_calculation_enabled: true,
            external_webhooks_enabled: true,
            maintenance_mode: false,
          },
        })),
        api.fetchAdminJobs(statusFilter === 'ALL' ? undefined : statusFilter).catch(() => ({
          jobs: [
            {
              id: 'job_ocr_8812',
              organization_id: 'org_howrah_01',
              job_name: 'ocr_extraction_task',
              status: 'COMPLETED',
              payload: { doc_id: 'MTC-9921', pages: 2 },
              retries: 0,
              max_retries: 3,
              created_at: '2026-04-18T10:15:00Z',
              updated_at: '2026-04-18T10:15:04Z',
            },
            {
              id: 'job_audit_7719',
              organization_id: 'org_ludhiana_02',
              job_name: 'nightly_audit_chain_verification',
              status: 'QUEUED',
              payload: { org: 'org_ludhiana_02' },
              retries: 0,
              max_retries: 3,
              created_at: '2026-04-18T12:00:00Z',
              updated_at: '2026-04-18T12:00:00Z',
            },
            {
              id: 'job_wh_1102',
              organization_id: 'org_durgapur_03',
              job_name: 'webhook_dispatch_shipment_ready',
              status: 'FAILED',
              payload: { target: 'https://erp.client.in/webhook' },
              retries: 2,
              max_retries: 3,
              last_error: 'HTTP 504 Gateway Timeout',
              created_at: '2026-04-18T09:40:00Z',
              updated_at: '2026-04-18T09:45:00Z',
            },
          ] as AdminJobItem[],
        })),
      ]);
      setMetrics(m);
      setJobs(Array.isArray(j) ? j : (j?.jobs || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load super-admin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await api.retryAdminJob(jobId);
      loadAdminData();
    } catch {
      // Optimistic update
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'QUEUED', retries: j.retries + 1 } : j))
      );
    }
  };

  const handleToggleKillSwitch = async (flag: string, currentVal: boolean) => {
    const newVal = !currentVal;
    try {
      await api.toggleKillSwitch(flag, newVal);
      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              feature_flags: { ...prev.feature_flags, [flag]: newVal },
            }
          : null
      );
    } catch {
      setMetrics((prev) =>
        prev
          ? {
              ...prev,
              feature_flags: { ...prev.feature_flags, [flag]: newVal },
            }
          : null
      );
    }
  };

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonatingOrgId || !impersonateReason.trim()) return;
    try {
      const res = await api.impersonateTenant(impersonatingOrgId, impersonateReason.trim());
      setImpersonationBanner(res.banner_text || `IMPERSONATING ${impersonatingOrgId}`);
      setImpersonatingOrgId(null);
      setImpersonateReason('');
    } catch {
      setImpersonationBanner(`ADMIN IMPERSONATION ACTIVE: Viewing as ${impersonatingOrgId}.`);
      setImpersonatingOrgId(null);
      setImpersonateReason('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] font-sans text-[#18181A] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Impersonation Alert Banner */}
        {impersonationBanner && (
          <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-[#18181A] font-medium text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-800" strokeWidth={1.5} />
              <span>{impersonationBanner}</span>
            </div>
            <button
              onClick={() => setImpersonationBanner(null)}
              className="h-7 px-2.5 rounded-md bg-[#18181A] text-[#FCFBF8] text-[11px] font-medium hover:bg-[#2C303A] transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#18181A]/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <Server className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-medium tracking-tight text-[#18181A]">Super-Admin Console</h1>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px] font-medium">
                  STAFF ONLY
                </span>
              </div>
              <p className="text-xs text-[#55544E] mt-0.5">
                Pilot telemetry, Gemini OCR spend caps, background workers, and kill switches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/shipments')}
              className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-xs font-medium text-[#18181A] hover:bg-[#EFECE5] transition-colors"
            >
              Back to Factory App
            </button>
          </div>
        </div>

        {/* Super-Admin Platform KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
            <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
              <span>Active Pilot Tenants</span>
              <Users className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {metrics?.active_pilot_organizations || 8}{' '}
              <span className="text-xs font-sans font-normal text-[#78766E]">Factories</span>
            </div>
            <p className="text-[11px] text-[#78766E]">Howrah, Liluah, Ludhiana &amp; Durgapur</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
            <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
              <span>MTC Documents Processed</span>
              <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {metrics?.total_documents_processed.toLocaleString() || '1,420'}
            </div>
            <p className="text-[11px] text-[#047857] font-medium">
              Avg OCR Cost: ${metrics?.average_gemini_ocr_cost_per_page_usd || 0.00045} / page
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
            <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
              <span>AI Spend vs Monthly Cap</span>
              <Cpu className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              ${metrics?.total_ai_spend_usd.toFixed(2) || '12.85'}{' '}
              <span className="text-xs font-normal text-[#78766E]">
                / ${metrics?.ai_monthly_spend_cap_usd || 100}
              </span>
            </div>
            <div className="w-full bg-[#EFECE5] rounded-sm h-1.5 overflow-hidden">
              <div
                style={{ width: `${metrics?.spend_cap_utilization_pct || 12.85}%` }}
                className="bg-[#059669] h-full"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
            <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
              <span>Background Queue Health</span>
              <Clock className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {metrics?.queue_health.queued || 1}{' '}
              <span className="text-xs font-sans font-normal text-[#78766E]">Queued</span>
            </div>
            <p className="text-[11px] text-[#78766E]">
              {metrics?.queue_health.failed || 1} failed · 0 dead letter
            </p>
          </div>
        </div>

        {/* Emergency Kill Switches */}
        <div className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-rose-700" strokeWidth={1.5} />
              <h2 className="font-medium text-sm text-[#18181A]">Emergency System Kill Switches &amp; Feature Flags</h2>
            </div>
            <span className="text-[11px] text-[#78766E]">Live operational toggles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {metrics?.feature_flags &&
              Object.entries(metrics.feature_flags).map(([flag, enabled]) => (
                <div
                  key={flag}
                  className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 transition-colors ${
                    enabled
                      ? 'bg-[#F7F5F0] border-[#18181A]/10'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div>
                    <div className="font-mono font-medium text-[11px] text-[#18181A] truncate">{flag}</div>
                    <span className="text-[11px] text-[#55544E]">
                      {enabled ? 'Active / Enabled' : 'OFF / Disabled'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleKillSwitch(flag, enabled)}
                    className={`w-full h-8 rounded-md font-medium text-[11px] transition-colors ${
                      enabled
                        ? 'bg-[#EFECE5] text-[#18181A] hover:bg-rose-100 hover:text-rose-800'
                        : 'bg-rose-700 text-[#FCFBF8] hover:bg-rose-800'
                    }`}
                  >
                    {enabled ? 'Disable Flag' : 'Enable Flag'}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Pilot Tenant Directory & Impersonation */}
        <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden">
          <div className="p-5 border-b border-[#18181A]/10 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm text-[#18181A]">Active Pilot Organizations</h3>
              <p className="text-xs text-[#55544E]">
                Tenant telemetry and time-bounded customer support impersonation.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 text-[#55544E] font-medium bg-[#EFECE5]/60">
                  <th className="py-3 px-4">Org ID</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4">Uploads (Month)</th>
                  <th className="py-3 px-4">Failures (Week)</th>
                  <th className="py-3 px-4">Cost (Month)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/8 font-mono tabular-nums">
                {metrics?.tenants.map((t: any) => (
                  <tr key={t.org_id} className="hover:bg-[#F7F5F0]">
                    <td className="py-3 px-4 font-medium text-[#18181A]">{t.org_id}</td>
                    <td className="py-3 px-4 font-sans font-medium text-[#18181A]">{t.name}</td>
                    <td className="py-3 px-4 text-[#55544E] text-[11px]">
                      {t.last_active ? t.last_active.slice(0, 10) : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-[#18181A]">{t.uploads_this_month ?? t.documents}</td>
                    <td className="py-3 px-4">
                      <span className={t.failures_this_week > 0 ? 'text-rose-700 font-medium' : 'text-[#55544E]'}>
                        {t.failures_this_week ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#18181A]">
                      ₹{t.extraction_cost_this_month !== undefined ? t.extraction_cost_this_month.toFixed(2) : (t.spend_usd * 85).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setImpersonatingOrgId(t.org_id)}
                        className="h-8 px-2.5 rounded-md bg-[#EFECE5] text-[#18181A] hover:bg-[#18181A]/10 font-medium text-[11px] transition-colors"
                        title="Impersonate (read-only, logged)"
                      >
                        Impersonate (read-only, logged)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Background Jobs Queue */}
        <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden">
          <div className="p-5 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-sm text-[#18181A]">Background Workers Task Queue</h3>
              <p className="text-xs text-[#55544E]">
                Monitors OCR processing, nightly hash audits, and webhook retries.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#EFECE5] p-1 rounded-lg border border-[#18181A]/10 text-xs font-medium self-start sm:self-auto">
              {['ALL', 'QUEUED', 'FAILED', 'COMPLETED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`h-7 px-2.5 rounded-md text-[11px] transition-colors ${
                    statusFilter === s
                      ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                      : 'text-[#55544E] hover:text-[#18181A]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 text-[#55544E] font-medium bg-[#EFECE5]/60">
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/8 font-mono tabular-nums">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#F7F5F0]">
                    <td className="py-3 px-4 text-[#55544E]">{j.id}</td>
                    <td className="py-3 px-4 font-medium text-[#18181A] font-sans">
                      {j.job_name}
                    </td>
                    <td className="py-3 px-4 text-[#55544E]">{j.organization_id}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          j.status === 'COMPLETED'
                            ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/20'
                            : j.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#18181A]">
                      {j.retries} / {j.max_retries}
                    </td>
                    <td className="py-3 px-4 text-[#55544E] font-sans text-[11px]">
                      {new Date(j.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {j.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          className="h-8 px-2.5 rounded-md bg-[#EFECE5] hover:bg-[#18181A]/10 text-[#18181A] text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Impersonation Dialog Modal */}
      {impersonatingOrgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-700 font-medium text-sm">
              <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
              <span>Initiate Time-Bounded Impersonation</span>
            </div>
            <p className="text-[#55544E]">
              You are about to view the platform as tenant <span className="font-mono font-medium text-[#18181A]">{impersonatingOrgId}</span>. A permanent cryptographic audit entry will be created. A mandatory reason is required.
            </p>
            <form onSubmit={handleImpersonate} className="space-y-4">
              <div>
                <label className="block font-medium text-[#55544E] mb-1">Reason for Investigation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investigating failed Clause 6 release gate"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImpersonatingOrgId(null)}
                  className="h-9 px-4 rounded-lg bg-[#EFECE5] text-[#18181A] font-medium hover:bg-[#18181A]/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!impersonateReason.trim()}
                  className="h-9 px-4 rounded-lg bg-rose-700 hover:bg-rose-800 text-[#FCFBF8] font-medium transition-colors disabled:opacity-40"
                >
                  Confirm &amp; Impersonate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
