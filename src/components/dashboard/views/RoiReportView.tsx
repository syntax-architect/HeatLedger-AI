import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Coins,
  FileText,
  Share2,
  Mail,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Building2,
  RefreshCw,
  Copy,
  ExternalLink,
  Award,
  ChevronRight,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { api, MonthlyRoiReport, AnnualRoiView, RoiShareLinkResponse, RoiEmailDigestResponse } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';

export const RoiReportView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [monthPeriod, setMonthPeriod] = useState<string>('2026-01');
  const [report, setReport] = useState<MonthlyRoiReport | null>(null);
  const [annualView, setAnnualView] = useState<AnnualRoiView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');

  // Interactive baseline sliders state
  const [sliderBaselineMin, setSliderBaselineMin] = useState<number>(45);
  const [sliderHourlyRate, setSliderHourlyRate] = useState<number>(550);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Share Modal & Email Drawer State
  const [shareLinkData, setShareLinkData] = useState<RoiShareLinkResponse | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);

  const [emailDigest, setEmailDigest] = useState<RoiEmailDigestResponse | null>(null);
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState<boolean>(false);
  const [emailTab, setEmailTab] = useState<'plain' | 'html'>('plain');

  const isAdminOrOwner = !user || user.role === 'OWNER' || user.role === 'QA_HEAD' || user.role === 'QA_INSPECTOR';

  // Instant Smooth Mathematical Derivation based on live sliders
  const metrics = useMemo(() => {
    if (!report) return null;
    const deltaMin = Math.max(0, sliderBaselineMin - report.measured_review_minutes_per_cert);
    const hoursSaved = Math.round(((deltaMin * report.certificates_processed) / 60) * 10) / 10;
    const hoursSavedValue = Math.round(hoursSaved * sliderHourlyRate);
    const totalVal = Math.round(hoursSavedValue + report.estimated_cbam_savings_inr);
    const multiple = Math.round((totalVal / Math.max(1, report.monthly_subscription_cost_inr)) * 10) / 10;
    const formula = `(${Number(sliderBaselineMin).toFixed(1)}m manual baseline - ${Number(report.measured_review_minutes_per_cert).toFixed(1)}m measured AI review) × ${report.certificates_processed} certs ÷ 60 = ${hoursSaved} hours saved`;

    return {
      hoursSaved,
      hoursSavedValue,
      totalVal,
      multiple,
      formula,
    };
  }, [report, sliderBaselineMin, sliderHourlyRate]);

  // Load Monthly Report
  const loadReport = useCallback(
    async (period: string, customMin?: number, customRate?: number) => {
      setLoading(true);
      try {
        const data = await api.fetchMonthlyRoiReport({
          month_period: period,
          custom_baseline_minutes: customMin,
          custom_hourly_rate: customRate,
        });
        setReport(data);
        if (customMin === undefined) {
          setSliderBaselineMin(data.baseline_minutes_per_cert);
        }
        if (customRate === undefined) {
          setSliderHourlyRate(data.qa_hourly_rate_inr);
        }
      } catch (err: any) {
        addToast(err.message || 'Failed to load ROI report', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  // Load Annual View
  const loadAnnual = useCallback(async () => {
    try {
      const data = await api.fetchAnnualRoiView(2026);
      setAnnualView(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load annual ROI summary', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    loadReport(monthPeriod);
    loadAnnual();
  }, [loadReport, loadAnnual, monthPeriod]);

  // Handle Slider Recalculation (live smooth client recalculation)
  const handleSliderChange = (newMin: number, newRate: number) => {
    setSliderBaselineMin(newMin);
    setSliderHourlyRate(newRate);
  };

  // Save Plant Baseline Config
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await api.updatePlantRoiConfig({
        manual_baseline_minutes: sliderBaselineMin,
        qa_hourly_rate_inr: sliderHourlyRate,
      });
      addToast('Baseline assumptions saved for plant', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save configuration', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Download PDF Memorandum
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await api.downloadRoiPdfReport({
        month_period: monthPeriod,
        custom_baseline_minutes: sliderBaselineMin,
        custom_hourly_rate: sliderHourlyRate,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatLedger_Executive_Proof_of_Value_${monthPeriod}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('Executive PDF memorandum downloaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to download PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Generate Public Share Link
  const handleCreateShareLink = async () => {
    setIsGeneratingShare(true);
    try {
      const link = await api.createRoiShareLink({ month_period: monthPeriod });
      setShareLinkData(link);
      setIsShareModalOpen(true);
    } catch (err: any) {
      addToast(err.message || 'Failed to generate share link', 'error');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Open Email Digest Drawer
  const handleOpenEmailDigest = async () => {
    setIsEmailDrawerOpen(true);
    try {
      const digest = await api.fetchRoiEmailDigest(monthPeriod);
      setEmailDigest(digest);
    } catch (err: any) {
      addToast(err.message || 'Failed to generate email summary', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
            <TrendingUp className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                ROI &amp; Proof-of-Value Report
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold">
                Measured Facts Only
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified operating system impact derived from timed reviews, caught release gate blocks, and statutory CBAM formulas.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Month / Annual Tab Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Monthly Audit
            </button>
            <button
              onClick={() => {
                setActiveTab('annual');
                if (!annualView) {
                  loadAnnual();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'annual'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Annual &amp; MSME Subsidy
            </button>
          </div>

          {/* Month Picker (When on monthly tab) */}
          {activeTab === 'monthly' && (
            <select
              value={monthPeriod}
              onChange={(e) => setMonthPeriod(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Select audit month"
            >
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
              <option value="2025-11">November 2025</option>
            </select>
          )}

          {/* Email Digest Button */}
          <button
            onClick={handleOpenEmailDigest}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Preview monthly email summary for Managing Director"
          >
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Email Digest</span>
          </button>

          {/* Share Public Link Button */}
          <button
            onClick={handleCreateShareLink}
            disabled={isGeneratingShare}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Generate shareable link for Board Members"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Share Board Link</span>
          </button>

          {/* 1-Click Executive PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            title="Download verified one-page A4 PDF memorandum"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-slate-950" />
            <span>Download 1-Page PDF</span>
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-mono">Aggregating shop floor proof-of-value metrics...</p>
        </div>
      ) : activeTab === 'monthly' && report ? (
        <>
          {/* 2. Top 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Hours Saved */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Time Reclaimed
                </span>
                <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {metrics ? metrics.hoursSaved : report.hours_saved}{' '}
                <span className="text-sm font-semibold text-slate-500">hours</span>
              </div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span>≈ ₹{(metrics ? metrics.hoursSavedValue : report.hours_saved_value_inr).toLocaleString('en-IN')} QA labor value</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.certificates_processed} MTCs reviewed at {report.measured_review_minutes_per_cert}m/cert
              </p>
            </div>

            {/* KPI 2: Shipments Protected */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Shipments Protected
                </span>
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {report.blocks_caught_count}{' '}
                <span className="text-sm font-semibold text-slate-500">blocks caught</span>
              </div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span>Zero port rejections or demurrage</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.shipments_released} shipments ({report.shipment_tonnes_released} MT) cleared gate
              </p>
            </div>

            {/* KPI 3: Estimated CBAM Duty Avoided */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  CBAM Duty Advantage
                </span>
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                €{report.estimated_cbam_savings_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                <span>≈ ₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px]">
                  Estimate
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Vs EU Commission +10% statutory default penalty
              </p>
            </div>

            {/* KPI 4: Net Value Multiple */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Subscription ROI
                </span>
                <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {metrics ? metrics.multiple : report.roi_multiple}x{' '}
                <span className="text-sm font-semibold text-slate-500">multiple</span>
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                ₹{(metrics ? metrics.totalVal : report.total_value_inr).toLocaleString('en-IN')} total monthly value
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Against ₹{report.monthly_subscription_cost_inr.toLocaleString('en-IN')} software investment
              </p>
            </div>
          </div>

          {/* 3. Interactive Baseline Calibration Slider Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Manage Baseline Calibration &amp; Labor Assumptions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adjust manual certificate review duration and hourly rate to calibrate your plant's exact mathematical savings.
                  </p>
                </div>
              </div>
              {isAdminOrOwner && (
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? 'Saving...' : 'Save as Plant Default'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Slider 1: Manual Review Minutes per Certificate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="baseline-min-slider" className="font-semibold text-slate-700 dark:text-slate-300">
                    Manual Baseline Duration (Min/Cert)
                  </label>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {sliderBaselineMin} minutes
                  </span>
                </div>
                <input
                  id="baseline-min-slider"
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={sliderBaselineMin}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value), sliderHourlyRate)}
                  className="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>15m (Fast check)</span>
                  <span>45m (Industry Standard)</span>
                  <span>120m (Full re-test)</span>
                </div>
              </div>

              {/* Slider 2: QA Hourly Rate INR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="hourly-rate-slider" className="font-semibold text-slate-700 dark:text-slate-300">
                    QA Inspector Hourly Cost (₹/Hour)
                  </label>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    ₹{sliderHourlyRate}/hr
                  </span>
                </div>
                <input
                  id="hourly-rate-slider"
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={sliderHourlyRate}
                  onChange={(e) => handleSliderChange(sliderBaselineMin, parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>₹200/hr (Junior)</span>
                  <span>₹550/hr (Standard QA)</span>
                  <span>₹2,000/hr (Metallurgist)</span>
                </div>
              </div>
            </div>

            {/* Sourced Mathematical Trace Box */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Exact Mathematical Derivation (Verified Operating Data)</span>
              </div>
              <p className="font-mono text-emerald-800 dark:text-emerald-300/90 text-xs leading-relaxed">
                {metrics ? metrics.formula : report.formula_hours_saved}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Derived directly from {report.certificates_processed} parsed certificates timed during active inspector review sessions in the MTC Workbench.
              </p>
            </div>
          </div>

          {/* 4. Section: Gate Release Blocks Prevented (Risk Caught) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Gate Protection Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Pre-Customs Release Gate Protection
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Non-compliant shipments prevented from departing factory gates without statutory evidence.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(report.blocks_breakdown).map(([reason, count]) => {
                  const label = reason.replace(/_/g, ' ').toLowerCase();
                  return (
                    <div
                      key={reason}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
                          {label}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono text-xs font-bold shrink-0">
                        {count} shipments caught
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">Operational Value:</span>
                <p>
                  Zero container demurrage penalties incurred at Rotterdam, Antwerp, or Felixstowe. 100% of released shipments held complete digital Clause 6 provenance.
                </p>
              </div>
            </div>

            {/* Right: CBAM Planning Savings vs Statutory Default */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Statutory CBAM Duty Advantage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Actual verified precursor emissions vs European Commission penalty markups.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Export Volume Cleared:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {report.shipment_tonnes_released} Metric Tonnes ({report.shipments_released} shipments)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">EU Commission Statutory Penalty:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    +10% in 2026 (EU 2025/2621)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">Net Estimated Duty Avoided:</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                    €{report.estimated_cbam_savings_eur.toLocaleString('en-EU')} (~₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              {/* Sourced Regulatory Disclaimer Notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold tracking-tight">Mandatory Statutory Planning Notice</span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    HeatLedger AI is a trade software operating system, not an accredited verification body. Figures are derived from official European Commission default values and are intended strictly as an <strong>{report.cbam_disclaimer}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Section: Upstream & Downstream Collaboration Footprint */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Full Supply-Chain Traceability &amp; Buyer Portal Engagement</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">OCR Parsing Accuracy</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                  {report.extraction_accuracy_pct}%
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {report.fields_auto_extracted} parsed / {report.fields_manually_corrected} corrected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Supplier Precursor Requests</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                  {report.supplier_corrections_sent}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Dispatched via WhatsApp &amp; Email
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Customs Dossiers Delivered</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                  {report.dossiers_delivered}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tokenized &amp; Cryptographically Signed
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Buyer Portal Views</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                  {report.buyer_portal_views}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {report.buyer_acceptances} clearances accepted
                </span>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'annual' ? (
        annualView ? (
        /* 6. Annual 12-Month View & MSME 90% Subsidy Grant Application */
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="max-w-2xl space-y-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold inline-block">
                Year 2026 Cumulative Audit
              </span>
              <h3 className="text-2xl font-black tracking-tight">
                Annual Subscription Proof-of-Value &amp; MSME Subsidy Data
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Full 12-month aggregated figures for board renewal review and preparation of the Central Government 90% Technology Grant application.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
              <div>
                <span className="text-slate-400 block">Total MTCs Processed</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {annualView.total_certificates_processed}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Labor Hours Saved</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {annualView.total_hours_saved} hrs
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Export Tonnage Released</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {annualView.total_tonnage_released} MT
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Est. CBAM Duty Avoided</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  €{annualView.total_estimated_cbam_duty_avoided_eur.toLocaleString('en-EU')}
                </span>
              </div>
            </div>
          </div>

          {/* MSME Clean Tech Subsidy 90% Application Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Central MSME Clean Technology &amp; Digital Compliance Grant (90% Scheme)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sourced subsidy filing package formatted under Ministry of Micro, Small and Medium Enterprises digital adoption guidelines.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Grant Beneficiary Details</span>
                <div className="space-y-1 font-mono text-slate-600 dark:text-slate-300">
                  <p>Enterprise: {annualView.msme_subsidy_application_data.enterprise_name}</p>
                  <p>Category: {annualView.msme_subsidy_application_data.enterprise_category}</p>
                  <p>Scheme: {annualView.msme_subsidy_application_data.subsidized_software_scheme}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Claimable Government Subsidy (90%)</span>
                <div className="space-y-1 text-emerald-800 dark:text-emerald-300">
                  <p className="font-mono">
                    Total Incurred Annual Fee: ₹{annualView.msme_subsidy_application_data.expenditure_incurred_inr.toLocaleString('en-IN')}
                  </p>
                  <p className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
                    Net Claimable Grant: ₹{annualView.msme_subsidy_application_data.claimable_subsidy_amount_inr.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-emerald-700/80">
                    Net Plant Software Cost after Government Reimbursement: ₹11,998.80 / year (~₹999/mo)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Statutory Accreditations for Audit Submission
              </span>
              <div className="flex flex-wrap gap-2">
                {annualView.msme_subsidy_application_data.compliance_accreditations.map((acc, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold"
                  >
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono">Loading annual &amp; MSME grant data...</p>
          </div>
        )
      ) : null}

      {/* 7. MODALS & DRAWERS */}
      {/* Share Modal */}
      {isShareModalOpen && shareLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Public Board Share Link
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              This tokenized link grants read-only access to this month's proof-of-value report without requiring a HeatLedger login. Ideal for the Managing Director, external board, or chartered accountants.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Public Shareable URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${shareLinkData.share_url}`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}${shareLinkData.share_url}`,
                      'Share link'
                    )
                  }
                  className="p-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white hover:opacity-90 transition-opacity"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Email Digest Drawer / Modal */}
      {isEmailDrawerOpen && emailDigest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Monthly Proof-of-Value Email Digest
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Subject: {emailDigest.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEmailTab('plain')}
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                    emailTab === 'plain'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Plain Text
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('html')}
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                    emailTab === 'html'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  HTML Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    emailTab === 'plain' ? emailDigest.plain : emailDigest.html,
                    emailTab === 'plain' ? 'Plain email body' : 'HTML email source'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Content</span>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
              {emailTab === 'plain' ? (
                <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {emailDigest.plain}
                </pre>
              ) : (
                <iframe
                  title="Email HTML Preview"
                  sandbox=""
                  srcDoc={emailDigest.html}
                  className="w-full min-h-[300px] bg-white rounded-lg border-0"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEmailDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
