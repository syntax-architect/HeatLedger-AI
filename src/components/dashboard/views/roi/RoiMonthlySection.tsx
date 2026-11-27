import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Layers,
  ShieldCheck,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { MonthlyRoiReport } from '../../../../services/api';

export interface DerivedRoiMetrics {
  hoursSaved: number;
  hoursSavedValue: number;
  totalVal: number;
  multiple: number;
  formula: string;
}

interface RoiMonthlySectionProps {
  report: MonthlyRoiReport;
  metrics: DerivedRoiMetrics | null;
  isAdminOrOwner: boolean;
  sliderBaselineMin: number;
  sliderHourlyRate: number;
  isSavingConfig: boolean;
  onSliderChange: (newMin: number, newRate: number) => void;
  onSaveConfig: () => void;
}

export const RoiMonthlySection: React.FC<RoiMonthlySectionProps> = ({
  report,
  metrics,
  isAdminOrOwner,
  sliderBaselineMin,
  sliderHourlyRate,
  isSavingConfig,
  onSliderChange,
  onSaveConfig,
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#55544E]">Time Reclaimed</span>
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
          {report.certificates_processed} MTCs reviewed at {report.measured_review_minutes_per_cert}
          m/cert
        </p>
      </div>

      <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#55544E]">Shipments Protected</span>
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

      <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#55544E]">CBAM Duty Advantage</span>
          <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#059669] flex items-center justify-center">
            <Coins className="w-4 h-4" strokeWidth={1.5} />
          </span>
        </div>
        <div className="text-2xl font-medium font-mono tabular-nums text-[#047857] tracking-[-0.02em]">
          €{report.estimated_cbam_savings_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}
        </div>
        <div className="text-xs font-medium text-[#18181A] mt-1 flex items-center gap-1.5 font-mono tabular-nums">
          <span>
            ≈ ₹
            {report.estimated_cbam_savings_inr.toLocaleString('en-IN', {
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-sans text-xs">
            Estimate
          </span>
        </div>
        <p className="text-xs text-[#55544E] mt-2">
          Vs EU Commission +10% statutory default penalty
        </p>
      </div>

      <div className="bg-[#FCFBF8] p-4 rounded-xl border border-[#18181A]/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#55544E]">Subscription ROI</span>
          <span className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-[#059669] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
          </span>
        </div>
        <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A] tracking-[-0.02em]">
          {metrics ? metrics.multiple : report.roi_multiple}x{' '}
          <span className="text-sm font-sans font-normal text-[#55544E]">multiple</span>
        </div>
        <div className="text-xs font-medium text-[#18181A] mt-1 font-mono tabular-nums">
          ₹{(metrics ? metrics.totalVal : report.total_value_inr).toLocaleString('en-IN')} total
          monthly value
        </div>
        <p className="text-xs text-[#55544E] mt-2 font-mono tabular-nums">
          Against ₹{report.monthly_subscription_cost_inr.toLocaleString('en-IN')} software
          investment
        </p>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#18181A]/10">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <div>
            <h3 className="font-medium text-[#18181A] text-sm">
              Manage Baseline Calibration &amp; Labor Assumptions
            </h3>
            <p className="text-xs text-[#55544E]">
              Adjust manual certificate review duration and hourly rate to calibrate your plant&apos;s
              exact mathematical savings.
            </p>
          </div>
        </div>
        {isAdminOrOwner && (
          <button
            type="button"
            onClick={onSaveConfig}
            disabled={isSavingConfig}
            className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {isSavingConfig ? 'Saving...' : 'Save as Plant Default'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
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
            onChange={(e) => onSliderChange(parseFloat(e.target.value), sliderHourlyRate)}
            className="w-full accent-[#059669] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#78766E] font-mono">
            <span>15m (Fast check)</span>
            <span>45m (Industry Standard)</span>
            <span>120m (Full re-test)</span>
          </div>
        </div>

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
            onChange={(e) => onSliderChange(sliderBaselineMin, parseFloat(e.target.value))}
            className="w-full accent-[#059669] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#78766E] font-mono">
            <span>₹200/hr (Junior)</span>
            <span>₹550/hr (Standard QA)</span>
            <span>₹2,000/hr (Metallurgist)</span>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-medium text-[#047857]">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span>Exact Mathematical Derivation (Verified Operating Data)</span>
        </div>
        <p className="font-mono tabular-nums text-[#047857] text-xs leading-relaxed">
          {metrics ? metrics.formula : report.formula_hours_saved}
        </p>
        <p className="text-[#55544E] text-xs">
          Derived directly from {report.certificates_processed} parsed certificates timed during
          active inspector review sessions in the MTC Workbench.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#18181A]/10">
          <ShieldCheck className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
          <div>
            <h3 className="font-medium text-[#18181A] text-sm">
              Pre-Customs Release Gate Protection
            </h3>
            <p className="text-xs text-[#55544E]">
              Non-compliant shipments prevented from departing factory gates without statutory
              evidence.
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
            Zero container demurrage penalties incurred at Rotterdam, Antwerp, or Felixstowe. 100%
            of released shipments held complete digital Clause 6 provenance.
          </p>
        </div>
      </div>

      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#18181A]/10">
          <Coins className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <div>
            <h3 className="font-medium text-[#18181A] text-sm">Statutory CBAM Duty Advantage</h3>
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
              €{report.estimated_cbam_savings_eur.toLocaleString('en-EU')} (~₹
              {report.estimated_cbam_savings_inr.toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="space-y-0.5">
            <span className="font-medium text-[#B45309]">Mandatory Statutory Planning Notice</span>
            <p className="text-xs text-[#55544E] leading-relaxed">
              HeatLedger AI is a trade software operating system, not an accredited verification
              body. Figures are derived from official European Commission default values and are
              intended strictly as an{' '}
              <strong className="font-medium text-[#18181A]">{report.cbam_disclaimer}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>

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
);
