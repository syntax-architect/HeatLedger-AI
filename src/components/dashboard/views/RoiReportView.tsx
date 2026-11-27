import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Mail, RefreshCw, Share2, TrendingUp } from 'lucide-react';
import {
  api,
  MonthlyRoiReport,
  AnnualRoiView,
  RoiShareLinkResponse,
  RoiEmailDigestResponse,
} from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';
import { RoiMonthlySection } from './roi/RoiMonthlySection';
import { RoiAnnualSection } from './roi/RoiAnnualSection';
import { RoiEmailDigestModal, RoiShareModal } from './roi/RoiModals';

export const RoiReportView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [monthPeriod, setMonthPeriod] = useState<string>('2026-01');
  const [report, setReport] = useState<MonthlyRoiReport | null>(null);
  const [annualView, setAnnualView] = useState<AnnualRoiView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');

  const [sliderBaselineMin, setSliderBaselineMin] = useState<number>(45);
  const [sliderHourlyRate, setSliderHourlyRate] = useState<number>(550);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const [shareLinkData, setShareLinkData] = useState<RoiShareLinkResponse | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);

  const [emailDigest, setEmailDigest] = useState<RoiEmailDigestResponse | null>(null);
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState<boolean>(false);
  const [emailTab, setEmailTab] = useState<'plain' | 'html'>('plain');

  const isAdminOrOwner =
    !user || user.role === 'OWNER' || user.role === 'QA_HEAD' || user.role === 'QA_INSPECTOR';

  const metrics = useMemo(() => {
    if (!report) return null;
    const deltaMin = Math.max(0, sliderBaselineMin - report.measured_review_minutes_per_cert);
    const hoursSaved = Math.round(((deltaMin * report.certificates_processed) / 60) * 10) / 10;
    const hoursSavedValue = Math.round(hoursSaved * sliderHourlyRate);
    const totalVal = Math.round(hoursSavedValue + report.estimated_cbam_savings_inr);
    const multiple =
      Math.round((totalVal / Math.max(1, report.monthly_subscription_cost_inr)) * 10) / 10;
    const formula = `(${Number(sliderBaselineMin).toFixed(1)}m manual baseline - ${Number(report.measured_review_minutes_per_cert).toFixed(1)}m measured AI review) × ${report.certificates_processed} certs ÷ 60 = ${hoursSaved} hours saved`;

    return { hoursSaved, hoursSavedValue, totalVal, multiple, formula };
  }, [report, sliderBaselineMin, sliderHourlyRate]);

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
        if (customMin === undefined) setSliderBaselineMin(data.baseline_minutes_per_cert);
        if (customRate === undefined) setSliderHourlyRate(data.qa_hourly_rate_inr);
      } catch (err: any) {
        addToast(err.message || 'Failed to load ROI report', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

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

  const handleSliderChange = (newMin: number, newRate: number) => {
    setSliderBaselineMin(newMin);
    setSliderHourlyRate(newRate);
  };

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
              Verified operating system impact derived from timed reviews, caught release gate
              blocks, and statutory CBAM formulas.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
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
                if (!annualView) loadAnnual();
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

          <button
            type="button"
            onClick={handleOpenEmailDigest}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            title="Preview monthly email summary for Managing Director"
          >
            <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Email Digest</span>
          </button>

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
        <RoiMonthlySection
          report={report}
          metrics={metrics}
          isAdminOrOwner={isAdminOrOwner}
          sliderBaselineMin={sliderBaselineMin}
          sliderHourlyRate={sliderHourlyRate}
          isSavingConfig={isSavingConfig}
          onSliderChange={handleSliderChange}
          onSaveConfig={handleSaveConfig}
        />
      ) : activeTab === 'annual' ? (
        annualView ? (
          <RoiAnnualSection annualView={annualView} />
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-[#55544E] gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#059669]" strokeWidth={1.5} />
            <p className="text-xs font-mono">Loading annual &amp; MSME grant data...</p>
          </div>
        )
      ) : null}

      {isShareModalOpen && shareLinkData && (
        <RoiShareModal
          shareLinkData={shareLinkData}
          onCopy={copyToClipboard}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {isEmailDrawerOpen && emailDigest && (
        <RoiEmailDigestModal
          emailDigest={emailDigest}
          emailTab={emailTab}
          onEmailTabChange={setEmailTab}
          onCopy={copyToClipboard}
          onClose={() => setIsEmailDrawerOpen(false)}
        />
      )}
    </div>
  );
};
