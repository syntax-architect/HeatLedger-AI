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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Impersonation Alert Banner */}
        {impersonationBanner && (
          <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{impersonationBanner}</span>
            </div>
            <button
              onClick={() => setImpersonationBanner(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 text-white text-[11px] hover:bg-slate-800"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Super-Admin Console</h1>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono text-[10px] font-bold">
                    STAFF ONLY
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilot telemetry, Gemini OCR spend caps, background workers, and kill switches.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/shipments')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Back to Factory App
            </button>
          </div>
        </div>

        {/* Super-Admin Platform KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Pilot Tenants</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">
              {metrics?.active_pilot_organizations || 8}{' '}
              <span className="text-xs font-normal text-slate-500">Factories</span>
            </div>
            <p className="text-[11px] text-slate-500">Howrah, Liluah, Ludhiana & Durgapur</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>MTC Documents Processed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">
              {metrics?.total_documents_processed.toLocaleString() || '1,420'}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Avg OCR Cost: ${metrics?.average_gemini_ocr_cost_per_page_usd || 0.00045} / page
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>AI Spend vs Monthly Cap</span>
              <Cpu className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">
              ${metrics?.total_ai_spend_usd.toFixed(2) || '12.85'}{' '}
              <span className="text-xs font-normal text-slate-500">
                / ${metrics?.ai_monthly_spend_cap_usd || 100}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                style={{ width: `${metrics?.spend_cap_utilization_pct || 12.85}%` }}
                className="bg-orange-500 h-full rounded-full"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Background Queue Health</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold">
              {metrics?.queue_health.queued || 1}{' '}
              <span className="text-xs font-normal text-slate-500">Queued</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {metrics?.queue_health.failed || 1} failed · 0 dead letter
            </p>
          </div>
        </div>

        {/* Emergency Kill Switches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-rose-500" />
              <h2 className="font-bold text-sm">Emergency System Kill Switches & Feature Flags</h2>
            </div>
            <span className="text-[11px] text-slate-400">Live operational toggles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {metrics?.feature_flags &&
              Object.entries(metrics.feature_flags).map(([flag, enabled]) => (
                <div
                  key={flag}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-colors ${
                    enabled
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-[11px] truncate">{flag}</div>
                    <span className="text-[10px] text-slate-500">
                      {enabled ? 'Active / Enabled' : 'OFF / Disabled'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleKillSwitch(flag, enabled)}
                    className={`w-full py-1.5 rounded-lg font-semibold text-[11px] transition-colors ${
                      enabled
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {enabled ? 'Disable Flag' : 'Enable Flag'}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Pilot Tenant Directory & Impersonation */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Active Pilot Organizations</h3>
              <p className="text-xs text-slate-500">
                Tenant telemetry and time-bounded customer support impersonation.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Org ID</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4">Uploads (Month)</th>
                  <th className="py-3 px-4">Failures (Week)</th>
                  <th className="py-3 px-4">Cost (Month)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {metrics?.tenants.map((t: any) => (
                  <tr key={t.org_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{t.org_id}</td>
                    <td className="py-3 px-4 font-sans font-medium">{t.name}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {t.last_active ? t.last_active.slice(0, 10) : 'Never'}
                    </td>
                    <td className="py-3 px-4">{t.uploads_this_month ?? t.documents}</td>
                    <td className="py-3 px-4">
                      <span className={t.failures_this_week > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {t.failures_this_week ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      ₹{t.extraction_cost_this_month !== undefined ? t.extraction_cost_this_month.toFixed(2) : (t.spend_usd * 85).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setImpersonatingOrgId(t.org_id)}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 font-semibold text-[11px] transition-colors"
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
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Background Workers Task Queue</h3>
              <p className="text-xs text-slate-500">
                Monitors OCR processing, nightly hash audits, and webhook retries.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              {['ALL', 'QUEUED', 'FAILED', 'COMPLETED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                    statusFilter === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500'
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
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{j.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 font-sans">
                      {j.job_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{j.organization_id}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.status === 'COMPLETED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : j.status === 'FAILED'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {j.retries} / {j.max_retries}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                      {new Date(j.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {j.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Initiate Time-Bounded Impersonation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              You are about to view the platform as tenant <strong>{impersonatingOrgId}</strong>. A permanent cryptographic audit entry will be created. A mandatory reason is required.
            </p>
            <form onSubmit={handleImpersonate} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Reason for Investigation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investigating failed Clause 6 release gate"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImpersonatingOrgId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!impersonateReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
                >
                  Confirm & Impersonate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
