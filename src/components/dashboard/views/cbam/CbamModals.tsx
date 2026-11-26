import React from 'react';
import { HelpCircle, Share2, X } from 'lucide-react';
import {
  CbamCalculations,
  CbamFuelType,
  EU_ETS_PRICE,
  FUEL_FACTORS,
  INR_PER_EUR,
} from './cbamCalculations';

interface CbamTraceModalProps {
  statutoryYear: number;
  fuelType: CbamFuelType;
  shipmentCnCode: string;
  shipmentMT: number;
  upstreamPrecursorSee: number;
  scrapContentPct: number;
  monthlyFuelLiters: number;
  monthlyProductionMT: number;
  monthlyGridKwh: number;
  gridRenewableSharePct: number;
  calculations: CbamCalculations;
  onClose: () => void;
}

export const CbamTraceModal: React.FC<CbamTraceModalProps> = ({
  statutoryYear,
  fuelType,
  shipmentCnCode,
  shipmentMT,
  upstreamPrecursorSee,
  scrapContentPct,
  monthlyFuelLiters,
  monthlyProductionMT,
  monthlyGridKwh,
  gridRenewableSharePct,
  calculations,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
      <div className="flex items-start justify-between border-b border-[#18181A]/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium text-[#18181A] font-sans">
              Calculation Trace &amp; Regulatory Audit Log
            </h3>
            <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-medium">
              REG-2026-Q1-V1
            </span>
          </div>
          <p className="text-xs text-[#55544E] mt-0.5">
            Step-by-step mathematical derivation pursuant to Regulation (EU) 2023/956 Annex III and
            Implementing Regulation (EU) 2025/2621.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
          aria-label="Close calculation trace"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
        <span className="font-medium flex items-center gap-1.5 text-xs text-[#B45309]">
          <HelpCircle className="w-4 h-4 text-[#D97706]" strokeWidth={1.5} />
          <span>Estimate for planning only</span>
        </span>
        <p className="text-[#55544E] leading-relaxed text-xs">
          HeatLedger AI is not an accredited verification body. Figures are derived from statutory
          European Commission regulations and CEA India baseline factors to support compliance
          preparation and financial planning.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-[#18181A] block">
          1. Sourced Regulatory Constants Applied:
        </span>
        <div className="rounded-lg border border-[#18181A]/10 overflow-hidden text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-[#F7F5F0] text-[#55544E] border-b border-[#18181A]/10 text-xs font-sans">
              <tr>
                <th className="p-2.5 font-medium">Parameter</th>
                <th className="p-2.5 font-medium">Value</th>
                <th className="p-2.5 font-medium">Official Source &amp; Law</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181A]/10 text-[#18181A] text-xs">
              <tr>
                <td className="p-2.5 font-sans font-medium">EU ETS Allowance Benchmark</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">€{EU_ETS_PRICE} / tCO₂e</td>
                <td className="p-2.5 font-sans text-[#55544E]">European Commission Published Q1 2026 Average</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-medium">Statutory Default Markup ({statutoryYear})</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">+{calculations.markupRatePct}%</td>
                <td className="p-2.5 font-sans text-[#55544E]">Implementing Regulation (EU) 2025/2621 Article 4</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-medium">CEA India Grid Emission Factor</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">0.727 tCO₂e/MWh</td>
                <td className="p-2.5 font-sans text-[#55544E]">Central Electricity Authority (CEA) User Guide v20.0</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-medium">Reheating Fuel Combustion Factor</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">
                  {FUEL_FACTORS[fuelType].ef} {FUEL_FACTORS[fuelType].unit}
                </td>
                <td className="p-2.5 font-sans text-[#55544E]">IPCC 2006 Guidelines for National GHG Inventories</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-medium">Base Default for {shipmentCnCode} (IN)</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">{calculations.baseDefaultSee} tCO₂e/t</td>
                <td className="p-2.5 font-sans text-[#55544E]">Commission Implementing Regulation (EU) 2025/2621</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-medium">RBI Currency Exchange Rate</td>
                <td className="p-2.5 font-medium tabular-nums text-[#047857]">₹{INR_PER_EUR} / €</td>
                <td className="p-2.5 font-sans text-[#55544E]">Reserve Bank of India Reference Rate (Jan 2026)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-[#18181A] block">2. Mathematical Derivation Steps:</span>
        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="font-sans font-medium text-[#18181A] flex justify-between gap-2">
              <span>Step 1: Upstream Precursor Emissions (Scrap Adjusted)</span>
              <span className="font-mono tabular-nums text-[#047857]">{calculations.effectivePrecursorSee} tCO₂e/t</span>
            </div>
            <div className="text-[#55544E] text-xs mt-1 tabular-nums">
              Formula: Upstream_SEE × (1.08 - Scrap_Pct × 0.08)
              <br />= {upstreamPrecursorSee} × (1.08 - {scrapContentPct}% × 0.08) = {calculations.effectivePrecursorSee} tCO₂e/t
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="font-sans font-medium text-[#18181A] flex justify-between gap-2">
              <span>Step 2: Direct Process Emissions (Reheating Fuel)</span>
              <span className="font-mono tabular-nums text-[#047857]">{calculations.plantDirectSee} tCO₂e/t</span>
            </div>
            <div className="text-[#55544E] text-xs mt-1 tabular-nums">
              Formula: (Monthly Fuel Liters × Emission Factor) / (1000 × Monthly Production)
              <br />= ({monthlyFuelLiters.toLocaleString()} L × {FUEL_FACTORS[fuelType].ef}) / 1000 / {monthlyProductionMT} MT = {calculations.plantDirectSee} tCO₂e/t
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="font-sans font-medium text-[#18181A] flex justify-between gap-2">
              <span>Step 3: Indirect Grid Electricity Emissions</span>
              <span className="font-mono tabular-nums text-[#047857]">{calculations.plantIndirectSee} tCO₂e/t</span>
            </div>
            <div className="text-[#55544E] text-xs mt-1 tabular-nums">
              Formula: (Monthly kWh × (1 - Renewable Share) × Grid EF) / (1000 × Monthly Production)
              <br />= ({monthlyGridKwh.toLocaleString()} × (1 - {gridRenewableSharePct}%) × 0.727) / 1000 / {monthlyProductionMT} MT = {calculations.plantIndirectSee} tCO₂e/t
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="font-sans font-medium text-[#18181A] flex justify-between gap-2">
              <span>Step 4: Total Specific Embedded Emissions (SEE)</span>
              <span className="font-mono tabular-nums text-[#047857] font-medium">{calculations.verifiedTotalSee} tCO₂e/t</span>
            </div>
            <div className="text-[#55544E] text-xs mt-1 tabular-nums">
              Formula: Precursor SEE + Direct Fuel SEE + Indirect Electricity SEE
              <br />= {calculations.effectivePrecursorSee} + {calculations.plantDirectSee} + {calculations.plantIndirectSee} = <strong className="font-medium text-[#18181A]">{calculations.verifiedTotalSee} tCO₂e/t</strong>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="font-sans font-medium text-[#18181A] flex justify-between gap-2">
              <span>Step 5: Estimated Financial Difference (Estimate for Planning)</span>
              <span className="font-mono tabular-nums text-[#047857] font-medium">€{calculations.invoiceEuroSavings.toLocaleString()}</span>
            </div>
            <div className="text-[#55544E] text-xs mt-1 tabular-nums">
              Formula: (Default Benchmark with Markup - Verified SEE) × Net Shipment Tonnes × ETS Price
              <br />= ({calculations.officialDefaultWithMarkup} - {calculations.verifiedTotalSee}) × {shipmentMT} MT × €{EU_ETS_PRICE} = <strong className="font-medium text-[#18181A]">€{calculations.invoiceEuroSavings.toLocaleString()}</strong> (~₹{calculations.invoiceInrSavings.toLocaleString()})
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs transition-colors duration-150 cursor-pointer"
        >
          Close Audit Trace
        </button>
      </div>
    </div>
  </div>
);

interface CbamShareModalProps {
  shipmentInvoice: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  onClose: () => void;
}

export const CbamShareModal: React.FC<CbamShareModalProps> = ({
  shipmentInvoice,
  copiedLink,
  onCopyLink,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">
            Share Public Dossier with European Buyer
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close share dialog"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-xs text-[#55544E] leading-relaxed">
        Provides tokenized, read-only access for customs brokers at Antwerp, Rotterdam, and Hamburg.
        Verifies EN 10204 Clause 6 byte integrity without login requirements.
      </p>

      <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 flex items-center justify-between gap-2 text-xs font-mono">
        <span className="truncate text-[#18181A]">
          {window.location.origin}/share/sreq_demo_
          {shipmentInvoice.toLowerCase().replace(/[^a-z0-9]/g, '_')}
        </span>
        <button
          type="button"
          onClick={onCopyLink}
          className="h-8 px-3 rounded-md bg-[#18181A] text-[#FCFBF8] hover:bg-[#2C2D32] font-sans text-xs font-medium shrink-0 transition-colors duration-150 cursor-pointer"
        >
          {copiedLink ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg text-xs font-medium text-[#55544E] hover:bg-[#EFECE5] hover:text-[#18181A] cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  </div>
);
