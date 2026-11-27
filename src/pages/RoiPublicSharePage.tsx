import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Coins,
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
    <div className="min-h-screen bg-[#F7F5F0] font-sans text-[#18181A] antialiased selection:bg-[#059669] selection:text-[#FCFBF8]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#18181A]/10 px-4 py-3.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo isLight={false} size="sm" />
            <div className="h-4 w-px bg-[#18181A]/15 hidden sm:block" />
            <span className="text-xs font-mono font-medium text-[#55544E] hidden sm:inline">
              Executive Board Report
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-xs font-mono font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
              <span>Verified Read-Only</span>
            </span>

            {report && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Download A4 PDF</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-8 space-y-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#55544E] gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#059669]" strokeWidth={1.5} />
            <p className="text-xs font-mono">Loading shared proof-of-value audit...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-16 bg-[#FCFBF8] rounded-xl border border-rose-200 p-8 text-center space-y-4">
            <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-medium text-[#18181A]">
              Report Link Inactive
            </h2>
            <p className="text-xs text-[#55544E] leading-relaxed">
              {error}
            </p>
            <Link
              to="/"
              className="inline-flex h-9 items-center px-4 rounded-lg bg-[#18181A] text-[#FCFBF8] text-xs font-medium hover:bg-[#2C303A] transition-colors"
            >
              Return to HeatLedger Home
            </Link>
          </div>
        ) : report ? (
          <>
            {/* Title Block */}
            <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-[#047857]">
                    Official Executive Memorandum
                  </span>
                  <span className="text-xs font-mono text-[#78766E]">·</span>
                  <span className="text-xs font-mono text-[#55544E]">
                    Period: {report.month_period}
                  </span>
                </div>
                <h1 className="text-2xl font-medium text-[#18181A] tracking-tight">
                  {report.plant_name}
                </h1>
                <p className="text-xs text-[#55544E]">
                  Shop-floor compliance audit, timed review savings, and statutory CBAM duty advantage report.
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-[#18181A]/10 sm:pl-6">
                <span className="text-xs text-[#78766E] block font-mono">Net Value Created</span>
                <span className="text-2xl font-medium text-[#047857] font-mono tabular-nums">
                  ₹{report.total_value_inr.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-medium text-[#18181A] block">
                  {report.roi_multiple}x Subscription ROI
                </span>
              </div>
            </div>

            {/* 4 Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#55544E] font-medium">
                    Labor Hours Saved
                  </span>
                  <span className="p-1.5 rounded-lg bg-[#EFECE5] text-[#55544E]">
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
                  {report.hours_saved} <span className="text-sm font-sans font-normal text-[#78766E]">hrs</span>
                </div>
                <div className="text-xs font-medium text-[#047857] mt-1">
                  ≈ ₹{report.hours_saved_value_inr.toLocaleString('en-IN')} QA labor value
                </div>
                <p className="text-xs text-[#78766E] mt-2">
                  {report.certificates_processed} MTCs at {report.measured_review_minutes_per_cert}m review
                </p>
              </div>

              <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#55544E] font-medium">
                    Shipments Protected
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                    <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
                  {report.blocks_caught_count} <span className="text-sm font-sans font-normal text-[#78766E]">blocks</span>
                </div>
                <div className="text-xs font-medium text-[#047857] mt-1">
                  Zero European port detentions
                </div>
                <p className="text-xs text-[#78766E] mt-2">
                  {report.shipments_released} consignments ({report.shipment_tonnes_released} MT)
                </p>
              </div>

              <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#55544E] font-medium">
                    CBAM Duty Advantage
                  </span>
                  <span className="p-1.5 rounded-lg bg-[#059669]/10 text-[#059669]">
                    <Coins className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono tabular-nums text-[#047857]">
                  €{report.estimated_cbam_savings_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs font-medium text-[#18181A] mt-1">
                  ≈ ₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} [Planning Est]
                </div>
                <p className="text-xs text-[#78766E] mt-2">
                  Vs +10% statutory default penalty
                </p>
              </div>

              <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#55544E] font-medium">
                    ROI Multiple
                  </span>
                  <span className="p-1.5 rounded-lg bg-[#059669]/10 text-[#059669]">
                    <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono tabular-nums text-[#047857]">
                  {report.roi_multiple}x <span className="text-sm font-sans font-normal text-[#78766E]">return</span>
                </div>
                <div className="text-xs font-medium text-[#18181A] mt-1">
                  ₹{report.total_value_inr.toLocaleString('en-IN')} net monthly value
                </div>
                <p className="text-xs text-[#78766E] mt-2">
                  Subscription cost: ₹{report.monthly_subscription_cost_inr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Derivation Formula & Gate Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-3">
                <h3 className="font-medium text-[#18181A] text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>Exact Time Savings Mathematical Formula</span>
                </h3>
                <div className="p-3.5 rounded-lg bg-[#059669]/10 border border-[#059669]/20 font-mono text-xs text-[#047857] leading-relaxed">
                  {report.formula_hours_saved}
                </div>
                <p className="text-xs text-[#55544E]">
                  Based on a plant manual baseline of {report.baseline_minutes_per_cert} minutes per mill test certificate vs an AI-accelerated measured review time of {report.measured_review_minutes_per_cert} minutes.
                </p>
              </div>

              <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-3">
                <h3 className="font-medium text-[#18181A] text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
                  <span>Pre-Customs Release Gate Blocks Caught</span>
                </h3>
                <div className="space-y-2">
                  {Object.entries(report.blocks_breakdown).map(([reason, count]) => (
                    <div
                      key={reason}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs"
                    >
                      <span className="font-medium text-[#18181A] capitalize">
                        {reason.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      <span className="font-mono font-medium text-rose-700">
                        {count} shipments prevented
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="p-4 rounded-xl bg-[#EFECE5] border border-[#18181A]/10 text-xs text-[#55544E] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p>
                <span className="font-medium text-[#18181A]">Statutory Notice:</span> HeatLedger AI is an enterprise trade operating system, not an accredited verification body. CBAM tax differential figures are planning estimates derived under Commission Implementing Regulation (EU) 2025/2621.
              </p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default RoiPublicSharePage;
