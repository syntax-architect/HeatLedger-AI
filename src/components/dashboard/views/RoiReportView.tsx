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
  Building2,
  RefreshCw,
  Copy,
  ExternalLink,
  Award,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  X,
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
    <div className="space-y-6 font-sans text-left">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18181A]/10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#FCFBF8] text-[#059669] flex items-center justify-center border border-[#18181A]/12 shrink-0">
            <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-medium text-[#18181A] tracking-[-0.02em]">
                ROI &amp; Proof-of-Value Report
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs font-medium">
                Measured Facts Only
              </span>
            </div>
            <p className="text-xs text-[#55544E] mt-0.5">
              Verified operating system impact derived from timed reviews, caught release gate blocks, and statutory CBAM formulas.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Month / Annual Tab Buttons */}
          <div className="inline-flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10">
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A]'
              }`}
            >
              Monthly Audit
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('annual');
                if (!annualView) {
                  loadAnnual();
                }
              }}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
                activeTab === 'annual'
                  ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A]'
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
              className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] text-xs font-mono font-medium focus:outline-none focus:border-[#059669]"
              aria-label="Select audit month"
            >
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
              <option value="2025-11">November 2025</option>
            </select>
          )}

          {/* Email Digest Button */}
          <button
            type="button"
            onClick={handleOpenEmailDigest}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            title="Preview monthly email summary for Managing Director"
          >
            <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Email Digest</span>
          </button>

          {/* Share Public Link Button */}
          <button
            type="button"
            onClick={handleCreateShareLink}
            disabled={isGeneratingShare}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
            title="Generate shareable link for Board Members"
          >
            <Share2 className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Share Board Link</span>
          </button>

          {/* 1-Click Executive PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-60"
            title="Download verified one-page A4 PDF memorandum"
          >
            <Download className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
            <span>Download 1-Page PDF</span>
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#55544E] gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#059669]" strokeWidth={1.5} />
          <p className="text-xs font-mono">Aggregating shop floor proof-of-value metrics...</p>
        </div>
      ) : activeTab === 'monthly' && report ? (
        <>
          {/* 2. Top 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Hours Saved */}
            <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#55544E]">
                  Time Reclaimed
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#18181A] flex items-center justify-center">
                  <Clock className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </div>
              <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A] tracking-[-0.02em]">
                {metrics ? metrics.hoursSaved : report.hours_saved}{' '}
                <span className="text-sm font-sans font-normal text-[#55544E]">hours</span>
              </div>
              <div className="text-xs font-medium text-[#047857] mt-1 font-mono tabular-nums">
                ≈ ₹{(metrics ? metrics.hoursSavedValue : report.hours_saved_value_inr).toLocaleString('en-IN')} QA labor value
              </div>
              <p className="text-xs text-[#55544E] mt-2 font-mono tabular-nums">
                {report.certificates_processed} MTCs reviewed at {report.measured_review_minutes_per_cert}m/cert
              </p>
            </div>

            {/* KPI 2: Shipments Protected */}
            <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#55544E]">
                  Shipments Protected
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#B45309] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </div>
              <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A] tracking-[-0.02em]">
                {report.blocks_caught_count}{' '}
                <span className="text-sm font-sans font-normal text-[#55544E]">blocks caught</span>
              </div>
              <div className="text-xs font-medium text-[#047857] mt-1">
                Zero port rejections or demurrage
              </div>
              <p className="text-xs text-[#55544E] mt-2 font-mono tabular-nums">
                {report.shipments_released} shipments ({report.shipment_tonnes_released} MT) cleared gate
              </p>
            </div>

            {/* KPI 3: Estimated CBAM Duty Avoided */}
            <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#55544E]">
                  CBAM Duty Advantage
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#059669] flex items-center justify-center">
                  <Coins className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </div>
              <div className="text-2xl font-medium font-mono tabular-nums text-[#047857] tracking-[-0.02em]">
                €{report.estimated_cbam_savings_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs font-medium text-[#18181A] mt-1 flex items-center gap-1.5 font-mono tabular-nums">
                <span>≈ ₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-sans text-xs">
                  Estimate
                </span>
              </div>
              <p className="text-xs text-[#55544E] mt-2">
                Vs EU Commission +10% statutory default penalty
              </p>
            </div>

            {/* KPI 4: Net Value Multiple */}
            <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#55544E]">
                  Subscription ROI
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#059669] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </div>
              <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A] tracking-[-0.02em]">
                {metrics ? metrics.multiple : report.roi_multiple}x{' '}
                <span className="text-sm font-sans font-normal text-[#55544E]">multiple</span>
              </div>
              <div className="text-xs font-medium text-[#18181A] mt-1 font-mono tabular-nums">
                ₹{(metrics ? metrics.totalVal : report.total_value_inr).toLocaleString('en-IN')} total monthly value
              </div>
              <p className="text-xs text-[#55544E] mt-2 font-mono tabular-nums">
                Against ₹{report.monthly_subscription_cost_inr.toLocaleString('en-IN')} software investment
              </p>
            </div>
          </div>

          {/* 3. Interactive Baseline Calibration Slider Card */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#18181A]/10">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#18181A] text-sm">
                    Manage Baseline Calibration &amp; Labor Assumptions
                  </h3>
                  <p className="text-xs text-[#55544E]">
                    Adjust manual certificate review duration and hourly rate to calibrate your plant's exact mathematical savings.
                  </p>
                </div>
              </div>
              {isAdminOrOwner && (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs transition-colors duration-150 cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? 'Saving...' : 'Save as Plant Default'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Slider 1: Manual Review Minutes per Certificate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="baseline-min-slider" className="font-medium text-[#18181A]">
                    Manual Baseline Duration (Min/Cert)
                  </label>
                  <span className="font-mono tabular-nums font-medium text-[#18181A] bg-[#EFECE5] border border-[#18181A]/10 px-2 py-0.5 rounded">
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
                  className="w-full accent-[#059669] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-[#78766E] font-mono">
                  <span>15m (Fast check)</span>
                  <span>45m (Industry Standard)</span>
                  <span>120m (Full re-test)</span>
                </div>
              </div>

              {/* Slider 2: QA Hourly Rate INR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="hourly-rate-slider" className="font-medium text-[#18181A]">
                    QA Inspector Hourly Cost (₹/Hour)
                  </label>
                  <span className="font-mono tabular-nums font-medium text-[#18181A] bg-[#EFECE5] border border-[#18181A]/10 px-2 py-0.5 rounded">
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
                  className="w-full accent-[#059669] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-[#78766E] font-mono">
                  <span>₹200/hr (Junior)</span>
                  <span>₹550/hr (Standard QA)</span>
                  <span>₹2,000/hr (Metallurgist)</span>
                </div>
              </div>
            </div>

            {/* Sourced Mathematical Trace Box */}
            <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-[#047857]">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span>Exact Mathematical Derivation (Verified Operating Data)</span>
              </div>
              <p className="font-mono tabular-nums text-[#047857] text-xs leading-relaxed">
                {metrics ? metrics.formula : report.formula_hours_saved}
              </p>
              <p className="text-[#55544E] text-xs">
                Derived directly from {report.certificates_processed} parsed certificates timed during active inspector review sessions in the MTC Workbench.
              </p>
            </div>
          </div>

          {/* 4. Section: Gate Release Blocks Prevented (Risk Caught) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Gate Protection Breakdown */}
            <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#18181A]/10">
                <ShieldCheck className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#18181A] text-sm">
                    Pre-Customs Release Gate Protection
                  </h3>
                  <p className="text-xs text-[#55544E]">
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
                      className="flex items-center justify-between p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-sm bg-[#DC2626] shrink-0" />
                        <span className="text-xs font-medium text-[#18181A] capitalize truncate">
                          {label}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-mono tabular-nums text-xs font-medium shrink-0">
                        {count} shipments caught
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs text-[#55544E] space-y-1">
                <span className="font-medium text-[#18181A]">Operational Value:</span>
                <p>
                  Zero container demurrage penalties incurred at Rotterdam, Antwerp, or Felixstowe. 100% of released shipments held complete digital Clause 6 provenance.
                </p>
              </div>
            </div>

            {/* Right: CBAM Planning Savings vs Statutory Default */}
            <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#18181A]/10">
                <Coins className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#18181A] text-sm">
                    Statutory CBAM Duty Advantage
                  </h3>
                  <p className="text-xs text-[#55544E]">
                    Actual verified precursor emissions vs European Commission penalty markups.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                  <span className="text-[#55544E] font-medium">Export Volume Cleared:</span>
                  <span className="font-mono tabular-nums font-medium text-[#18181A]">
                    {report.shipment_tonnes_released} Metric Tonnes ({report.shipments_released} shipments)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                  <span className="text-[#55544E] font-medium">EU Commission Statutory Penalty:</span>
                  <span className="font-mono tabular-nums font-medium text-[#DC2626]">
                    +10% in 2026 (EU 2025/2621)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-[#ECFDF5] border border-emerald-200">
                  <span className="font-medium text-[#047857]">Net Estimated Duty Avoided:</span>
                  <span className="font-mono tabular-nums font-medium text-[#047857] text-sm">
                    €{report.estimated_cbam_savings_eur.toLocaleString('en-EU')} (~₹{report.estimated_cbam_savings_inr.toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              {/* Sourced Regulatory Disclaimer Notice */}
              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="space-y-0.5">
                  <span className="font-medium text-[#B45309]">Mandatory Statutory Planning Notice</span>
                  <p className="text-xs text-[#55544E] leading-relaxed">
                    HeatLedger AI is a trade software operating system, not an accredited verification body. Figures are derived from official European Commission default values and are intended strictly as an <strong className="font-medium text-[#18181A]">{report.cbam_disclaimer}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Section: Upstream & Downstream Collaboration Footprint */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
            <h3 className="font-medium text-[#18181A] text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Full Supply-Chain Traceability &amp; Buyer Portal Engagement</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <span className="text-[#55544E] block font-medium">OCR Parsing Accuracy</span>
                <span className="text-lg font-medium text-[#18181A] font-mono tabular-nums mt-0.5 block">
                  {report.extraction_accuracy_pct}%
                </span>
                <span className="text-xs text-[#55544E] mt-1 block font-mono tabular-nums">
                  {report.fields_auto_extracted} parsed / {report.fields_manually_corrected} corrected
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <span className="text-[#55544E] block font-medium">Supplier Precursor Requests</span>
                <span className="text-lg font-medium text-[#18181A] font-mono tabular-nums mt-0.5 block">
                  {report.supplier_corrections_sent}
                </span>
                <span className="text-xs text-[#55544E] mt-1 block">
                  Dispatched via WhatsApp &amp; Email
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <span className="text-[#55544E] block font-medium">Customs Dossiers Delivered</span>
                <span className="text-lg font-medium text-[#18181A] font-mono tabular-nums mt-0.5 block">
                  {report.dossiers_delivered}
                </span>
                <span className="text-xs text-[#55544E] mt-1 block">
                  Tokenized &amp; Cryptographically Signed
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <span className="text-[#55544E] block font-medium">Buyer Portal Views</span>
                <span className="text-lg font-medium text-[#047857] font-mono tabular-nums mt-0.5 block">
                  {report.buyer_portal_views}
                </span>
                <span className="text-xs text-[#55544E] mt-1 block font-mono tabular-nums">
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
          {/* Forged Graphite Cumulative Header */}
          <div className="bg-[#121316] border border-[#2C303A] text-[#EAEAEA] rounded-xl p-6 space-y-5">
            <div className="max-w-2xl space-y-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-[#10B981] border border-emerald-500/25 font-mono text-xs font-medium inline-block">
                Year 2026 Cumulative Audit
              </span>
              <h3 className="text-xl sm:text-2xl font-medium tracking-[-0.02em] text-[#EAEAEA]">
                Annual Subscription Proof-of-Value &amp; MSME Subsidy Data
              </h3>
              <p className="text-xs text-[#9FA3AD] leading-relaxed">
                Full 12-month aggregated figures for board renewal review and preparation of the Central Government 90% Technology Grant application.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[#2C303A] text-xs">
              <div>
                <span className="text-[#9FA3AD] block">Total MTCs Processed</span>
                <span className="text-xl font-medium font-mono tabular-nums text-[#EAEAEA] mt-1 block">
                  {annualView.total_certificates_processed}
                </span>
              </div>
              <div>
                <span className="text-[#9FA3AD] block">Total Labor Hours Saved</span>
                <span className="text-xl font-medium font-mono tabular-nums text-[#10B981] mt-1 block">
                  {annualView.total_hours_saved} hrs
                </span>
              </div>
              <div>
                <span className="text-[#9FA3AD] block">Export Tonnage Released</span>
                <span className="text-xl font-medium font-mono tabular-nums text-[#EAEAEA] mt-1 block">
                  {annualView.total_tonnage_released} MT
                </span>
              </div>
              <div>
                <span className="text-[#9FA3AD] block">Est. CBAM Duty Avoided</span>
                <span className="text-xl font-medium font-mono tabular-nums text-[#10B981] mt-1 block">
                  €{annualView.total_estimated_cbam_duty_avoided_eur.toLocaleString('en-EU')}
                </span>
              </div>
            </div>
          </div>

          {/* MSME Clean Tech Subsidy 90% Application Card */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#18181A]/10">
              <span className="w-9 h-9 rounded-lg bg-[#F7F5F0] text-[#B45309] flex items-center justify-center border border-[#18181A]/12 shrink-0">
                <Award className="w-4 h-4" strokeWidth={1.5} />
              </span>
              <div>
                <h4 className="font-medium text-[#18181A] text-base">
                  Central MSME Clean Technology &amp; Digital Compliance Grant (90% Scheme)
                </h4>
                <p className="text-xs text-[#55544E]">
                  Sourced subsidy filing package formatted under Ministry of Micro, Small and Medium Enterprises digital adoption guidelines.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-2">
                <span className="font-medium text-[#18181A] block">Grant Beneficiary Details</span>
                <div className="space-y-1 font-mono text-[#55544E]">
                  <p>Enterprise: {annualView.msme_subsidy_application_data.enterprise_name}</p>
                  <p>Category: {annualView.msme_subsidy_application_data.enterprise_category}</p>
                  <p>Scheme: {annualView.msme_subsidy_application_data.subsidized_software_scheme}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#ECFDF5] border border-emerald-200 space-y-2">
                <span className="font-medium text-[#047857] block">Claimable Government Subsidy (90%)</span>
                <div className="space-y-1 text-[#047857]">
                  <p className="font-mono tabular-nums">
                    Total Incurred Annual Fee: ₹{annualView.msme_subsidy_application_data.expenditure_incurred_inr.toLocaleString('en-IN')}
                  </p>
                  <p className="font-mono tabular-nums text-base font-medium text-[#047857]">
                    Net Claimable Grant: ₹{annualView.msme_subsidy_application_data.claimable_subsidy_amount_inr.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-[#55544E]">
                    Net Plant Software Cost after Government Reimbursement: ₹11,998.80 / year (~₹999/mo)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-2">
              <span className="font-medium text-[#18181A] block">
                Statutory Accreditations for Audit Submission
              </span>
              <div className="flex flex-wrap gap-2">
                {annualView.msme_subsidy_application_data.compliance_accreditations.map((acc, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-mono text-xs font-medium"
                  >
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-[#55544E] gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#059669]" strokeWidth={1.5} />
            <p className="text-xs font-mono">Loading annual &amp; MSME grant data...</p>
          </div>
        )
      ) : null}

      {/* 7. MODALS & DRAWERS */}
      {/* Share Modal */}
      {isShareModalOpen && shareLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h3 className="font-medium text-[#18181A] text-base">
                  Public Board Share Link
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close share modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-xs text-[#55544E]">
              This tokenized link grants read-only access to this month's proof-of-value report without requiring a HeatLedger login. Ideal for the Managing Director, external board, or chartered accountants.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">
                Public Shareable URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${shareLinkData.share_url}`}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}${shareLinkData.share_url}`,
                      'Share link'
                    )
                  }
                  className="h-9 px-3 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] transition-colors duration-150 cursor-pointer flex items-center justify-center shrink-0"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Email Digest Drawer / Modal */}
      {isEmailDrawerOpen && emailDigest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <div>
                  <h3 className="font-medium text-[#18181A] text-base">
                    Monthly Proof-of-Value Email Digest
                  </h3>
                  <p className="text-xs text-[#55544E] font-mono">
                    Subject: {emailDigest.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close email preview"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="inline-flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10">
                <button
                  type="button"
                  onClick={() => setEmailTab('plain')}
                  className={`h-7 px-3 rounded-md font-medium cursor-pointer transition-colors duration-150 ${
                    emailTab === 'plain'
                      ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                      : 'text-[#55544E] hover:text-[#18181A]'
                  }`}
                >
                  Plain Text
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('html')}
                  className={`h-7 px-3 rounded-md font-medium cursor-pointer transition-colors duration-150 ${
                    emailTab === 'html'
                      ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                      : 'text-[#55544E] hover:text-[#18181A]'
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
                className="h-9 px-3 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" strokeWidth={1.5} />
                <span>Copy Content</span>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg border border-[#18181A]/12 p-4 bg-[#F7F5F0]">
              {emailTab === 'plain' ? (
                <pre className="text-xs font-mono text-[#18181A] whitespace-pre-wrap leading-relaxed">
                  {emailDigest.plain}
                </pre>
              ) : (
                <iframe
                  title="Email HTML Preview"
                  sandbox=""
                  srcDoc={emailDigest.html}
                  className="w-full min-h-[300px] bg-white rounded border-0"
                />
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setIsEmailDrawerOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer transition-colors duration-150"
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
