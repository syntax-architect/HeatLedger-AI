import React from 'react';
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  Printer,
  Share2,
  TrendingDown,
} from 'lucide-react';
import { CbamCalculations, EU_ETS_PRICE, INR_PER_EUR } from './cbamCalculations';

interface CbamResultsColumnProps {
  mobileStep: 1 | 2 | 3;
  shipmentInvoice: string;
  shipmentMT: number;
  shipmentBuyer: string;
  shipmentDestination: string;
  shipmentHeat: string;
  statutoryYear: number;
  calculations: CbamCalculations;
  isExportingXml: boolean;
  isExportingCsv: boolean;
  isExportingPdf: boolean;
  onOpenTraceModal: () => void;
  onExportXml: () => void;
  onExportCsv: () => void;
  onDownloadPdf: () => void;
  onOpenShareModal: () => void;
}

export const CbamResultsColumn: React.FC<CbamResultsColumnProps> = ({
  mobileStep,
  shipmentInvoice,
  shipmentMT,
  shipmentBuyer,
  shipmentDestination,
  shipmentHeat,
  statutoryYear,
  calculations,
  isExportingXml,
  isExportingCsv,
  isExportingPdf,
  onOpenTraceModal,
  onExportXml,
  onExportCsv,
  onDownloadPdf,
  onOpenShareModal,
}) => (
  <div
    className={`lg:col-span-7 space-y-6 ${
      mobileStep === 1 || mobileStep === 2 ? 'hidden lg:block' : 'block'
    }`}
  >
    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3 flex-wrap gap-2">
        <div>
          <span className="text-xs text-[#78766E] block">Target Export Container</span>
          <h3 className="text-sm font-medium text-[#18181A] font-mono tabular-nums mt-0.5">
            Invoice #{shipmentInvoice} · {shipmentMT} MT ({shipmentBuyer})
          </h3>
        </div>
        <div className="text-left sm:text-right text-xs text-[#55544E] space-y-1">
          <div>
            Destination: <strong className="font-medium text-[#18181A]">{shipmentDestination}</strong>
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums font-medium">
              Heat #{shipmentHeat}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#121316] text-[#EAEAEA] font-mono text-xs space-y-3 border border-[#2C303A]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#10B981] font-medium">
            Verified Specific Embedded Emissions (SEE):
          </div>
          <button
            type="button"
            onClick={onOpenTraceModal}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#181A1F] hover:bg-[#22252B] text-[#10B981] border border-[#2C303A] text-xs font-sans font-medium transition-colors duration-150 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
            <span>How this was calculated</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#2C303A] text-center">
          <div>
            <span className="text-[#9FA3AD] text-xs block font-sans">Precursor SEE</span>
            <span className="text-[#EAEAEA] tabular-nums font-medium text-sm">
              {calculations.effectivePrecursorSee}
            </span>
          </div>
          <div>
            <span className="text-[#9FA3AD] text-xs block font-sans">Direct Fuel SEE</span>
            <span className="text-[#EAEAEA] tabular-nums font-medium text-sm">
              {calculations.plantDirectSee}
            </span>
          </div>
          <div>
            <span className="text-[#9FA3AD] text-xs block font-sans">Indirect Power SEE</span>
            <span className="text-[#EAEAEA] tabular-nums font-medium text-sm">
              {calculations.plantIndirectSee}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 text-[#10B981]">
          <span className="font-sans">Total Specific Embedded Emissions:</span>
          <span className="text-lg font-medium tabular-nums text-[#EAEAEA]">
            {calculations.verifiedTotalSee} tCO₂e / t
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#55544E] font-medium">Your Verified Emissions:</span>
          <span className="font-mono tabular-nums font-medium text-[#047857] text-sm">
            {calculations.verifiedTotalSee} tCO₂e / t
          </span>
        </div>
        <div className="w-full bg-[#EFECE5] h-2 rounded overflow-hidden">
          <div
            className="bg-[#059669] h-full rounded transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: `${Math.min(
                100,
                (calculations.verifiedTotalSee / calculations.officialDefaultWithMarkup) * 100
              )}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[#55544E]">
            Official Default Benchmark + {calculations.markupRatePct}% Statutory Markup ({statutoryYear}):
          </span>
          <span className="font-mono tabular-nums font-medium text-[#B91C1C] text-sm">
            {calculations.officialDefaultWithMarkup} tCO₂e / t
          </span>
        </div>
        <div className="w-full bg-[#EFECE5] h-2 rounded overflow-hidden">
          <div className="bg-[#DC2626]/75 h-full rounded w-full" />
        </div>

        <div className="mt-4 pt-4 border-t border-[#18181A]/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-[#55544E] font-medium">
                Estimated Cost Difference vs Default:
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-medium">
                Estimate for planning
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-medium text-[#047857] font-mono tabular-nums tracking-[-0.02em] flex items-center gap-1.5">
              <TrendingDown className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
              €{calculations.invoiceEuroSavings.toLocaleString()}
            </div>
            <span className="text-xs text-[#55544E] font-mono tabular-nums block mt-0.5">
              ~₹{calculations.invoiceInrSavings.toLocaleString()} at ₹{INR_PER_EUR}/€ RBI reference rate
            </span>
          </div>

          <div className="text-left sm:text-right text-xs text-[#55544E] space-y-0.5">
            <div>
              Carbon Avoided:{' '}
              <strong className="font-mono tabular-nums font-medium text-[#18181A]">
                {calculations.totalCarbonAvoidedTonnes} tCO₂e
              </strong>
            </div>
            <div>
              EU ETS Allowance:{' '}
              <strong className="font-mono tabular-nums font-medium text-[#18181A]">
                €{EU_ETS_PRICE}/t
              </strong>
            </div>
            <div className="font-mono tabular-nums text-[#18181A] font-medium">
              {shipmentMT} Tonne Shipment
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <h3 className="text-xs font-medium text-[#18181A] flex items-center gap-2">
          <Download className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span>Verifier Deliverables &amp; Export Formats</span>
        </h3>
        <span className="text-xs text-[#047857] font-medium bg-[#ECFDF5] px-2 py-0.5 rounded border border-emerald-200">
          Official Verifier Formats
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onExportXml}
          disabled={isExportingXml}
          className="p-3.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-left transition-colors duration-150 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#18181A] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Official CBAM XML Sheet</span>
            </span>
            {isExportingXml ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#059669]" strokeWidth={1.5} />
            ) : (
              <Download className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
            )}
          </div>
          <span className="text-xs text-[#55544E]">
            EU Declarant XML per Implementing Reg 2025/2621.
          </span>
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          disabled={isExportingCsv}
          className="p-3.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-left transition-colors duration-150 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#18181A] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span>Verifier Audit CSV</span>
            </span>
            {isExportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#18181A]" strokeWidth={1.5} />
            ) : (
              <Download className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
            )}
          </div>
          <span className="text-xs text-[#55544E]">
            Full step-by-step mathematical trace for GHG auditors.
          </span>
        </button>

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          className="p-3.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-left transition-colors duration-150 flex flex-col justify-between cursor-pointer disabled:opacity-60"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#18181A] flex items-center gap-1.5">
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#059669]" strokeWidth={1.5} />
              ) : (
                <Printer className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              )}
              <span>{isExportingPdf ? 'Exporting PDF...' : 'Download Verifier PDF'}</span>
            </span>
            <Download className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
          </div>
          <span className="text-xs text-[#55544E]">
            Official A4 memorandum for accredited GHG auditors.
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenShareModal}
          className="p-3.5 rounded-xl bg-[#ECFDF5]/60 hover:bg-[#ECFDF5] border border-emerald-200 text-left transition-colors duration-150 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#047857] flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Buyer &amp; Broker Portal Link</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          </div>
          <span className="text-xs text-[#047857]">
            Tokenized read-only link for EU customs clearance.
          </span>
        </button>
      </div>
    </div>
  </div>
);
