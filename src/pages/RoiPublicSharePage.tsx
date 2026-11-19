import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Coins,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Building2,
  RefreshCw,
  ExternalLink,
  Award,
  Layers,
  Lock,
} from 'lucide-react';
import { api, MonthlyRoiReport } from '../services/api';
import { Logo } from '../components/brand/Logo';

export const RoiPublicSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<MonthlyRoiReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing report token.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    api
      .fetchPublicRoiReport(token)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Shared ROI report not found or link has expired.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleDownloadPdf = async () => {
    if (!report) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await api.downloadRoiPdfReport({
        month_period: report.month_period,
        custom_baseline_minutes: report.baseline_minutes_per_cert,
        custom_hourly_rate: report.qa_hourly_rate_inr,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatLedger_Executive_Proof_of_Value_${report.month_period}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hidden sm:inline">
              EXECUTIVE BOARD REPORT
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Read-Only</span>
            </span>

            {report && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-slate-950" />
                <span className="hidden sm:inline">Download A4 PDF</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-8 space-y-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono">Loading shared proof-of-value audit...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-16 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 p-8 text-center space-y-4 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Report Link Inactive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error}
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Return to HeatLedger Home
            </Link>
          </div>
        ) : report ? (
          <>
            {/* Title Block */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Official Executive Memorandum
                  </span>
                  <span className="text-xs font-mono text-slate-400">·</span>
                  <span className="text-xs font-mono text-slate-500">
                    Period: {report.month_period}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {report.plant_name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shop-floor compliance audit, timed review savings, and statutory CBAM duty advantage report.
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-6">
                <span className="text-xs text-slate-400 block font-mono">Net Value Created</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{report.total_value_inr.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block">
                  {report.roi_multiple}x Subscription ROI
                </span>
              </div>
            </div>

            {/* 4 Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Labor Hours Saved
                  </span>
                  <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {report.hours_saved} <span className="text-sm font-semibold text-slate-500">hrs</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  ≈ ₹{report.hours_saved_value_inr.toLocaleString('en-IN')} QA labor value
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {report.certificates_processed} MTCs at {report.measured_review_minutes_per_cert}m review
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Shipments Protected
                  </span>
                  <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {report.blocks_caught_count} <span className="text-sm font-semibold text-slate-500">blocks</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  Zero European port detentions
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {report.shipments_released} consignments ({report.shipment_tonnes_released} MT)
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    CBAM Duty Advantage
                  </span>
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Coins className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  €{report.estimated_cbam_savings_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  ≈ ₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} [Planning Est]
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Vs +10% statutory default penalty
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    ROI Multiple
                  </span>
                  <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {report.roi_multiple}x <span className="text-sm font-semibold text-slate-500">return</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  ₹{report.total_value_inr.toLocaleString('en-IN')} net monthly value
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Subscription cost: ₹{report.monthly_subscription_cost_inr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Derivation Formula & Gate Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Exact Time Savings Mathematical Formula</span>
                </h3>
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 font-mono text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  {report.formula_hours_saved}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Based on a plant manual baseline of {report.baseline_minutes_per_cert} minutes per mill test certificate vs an AI-accelerated measured review time of {report.measured_review_minutes_per_cert} minutes.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Pre-Customs Release Gate Blocks Caught</span>
                </h3>
                <div className="space-y-2">
                  {Object.entries(report.blocks_breakdown).map(([reason, count]) => (
                    <div
                      key={reason}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {reason.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {count} shipments prevented
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Statutory Notice:</strong> HeatLedger AI is an enterprise trade operating system, not an accredited verification body. CBAM tax differential figures are planning estimates derived under Commission Implementing Regulation (EU) 2025/2621.
              </p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default RoiPublicSharePage;
