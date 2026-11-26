import React from 'react';
import { AlertTriangle, Building2, FileCode, Info, ShieldCheck } from 'lucide-react';
import { ScopeInfo } from './cbamCalculations';

interface CbamHeaderBarProps {
  jurisdiction: 'EU' | 'UK';
  onJurisdictionChange: (j: 'EU' | 'UK') => void;
  reportingPeriod: string;
  onReportingPeriodChange: (p: string) => void;
  statutoryYear: number;
  onStatutoryYearChange: (y: number) => void;
  shipmentCnCode: string;
  onCnCodeChange: (cn: string) => void;
  scopeInfo: ScopeInfo;
  installationName: string;
  installationUnlocode: string;
  mobileStep: 1 | 2 | 3;
  onMobileStepChange: (step: 1 | 2 | 3) => void;
}

export const CbamHeaderBar: React.FC<CbamHeaderBarProps> = ({
  jurisdiction,
  onJurisdictionChange,
  reportingPeriod,
  onReportingPeriodChange,
  statutoryYear,
  onStatutoryYearChange,
  shipmentCnCode,
  onCnCodeChange,
  scopeInfo,
  installationName,
  installationUnlocode,
  mobileStep,
  onMobileStepChange,
}) => (
  <>
    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#F7F5F0] text-[#059669] border border-[#18181A]/12 flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-medium text-[#18181A] tracking-[-0.02em]">
              CBAM Period Workspace &amp; Proof-of-Value Engine
            </h2>
            <p className="text-xs text-[#55544E] mt-0.5">
              Recursive precursor calculations pursuant to Regulation (EU) 2023/956, Implementing Reg
              (EU) 2025/2621 &amp; UK CBAM.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10 text-xs font-medium">
            <button
              type="button"
              onClick={() => onJurisdictionChange('EU')}
              className={`h-7 px-3 rounded-md transition-colors duration-150 cursor-pointer ${
                jurisdiction === 'EU'
                  ? 'bg-[#FCFBF8] text-[#047857] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A]'
              }`}
            >
              🇪🇺 EU CBAM (2026)
            </button>
            <button
              type="button"
              onClick={() => onJurisdictionChange('UK')}
              className={`h-7 px-3 rounded-md transition-colors duration-150 cursor-pointer ${
                jurisdiction === 'UK'
                  ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A]'
              }`}
            >
              🇬🇧 UK CBAM (2027)
            </button>
          </div>

          <select
            value={reportingPeriod}
            onChange={(e) => onReportingPeriodChange(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] text-xs font-medium focus:outline-none focus:border-[#059669] cursor-pointer"
          >
            <option value="2026-Q1">Cycle: 2026-Q1 (Jan–Mar)</option>
            <option value="2026-Q2">Cycle: 2026-Q2 (Apr–Jun)</option>
            <option value="2025-Q4">Cycle: 2025-Q4 (Oct–Dec)</option>
          </select>

          <select
            value={statutoryYear}
            onChange={(e) => onStatutoryYearChange(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] text-xs font-medium focus:outline-none focus:border-[#059669] cursor-pointer"
          >
            <option value={2026}>Statutory Markup: 2026 (+10%)</option>
            <option value={2027}>Statutory Markup: 2027 (+20%)</option>
            <option value={2028}>Statutory Markup: 2028 (+30%)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#18181A]/10 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-medium text-[#55544E]">CN Code:</span>
          <input
            type="text"
            value={shipmentCnCode}
            onChange={(e) => onCnCodeChange(e.target.value)}
            className="w-32 h-8 px-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono tabular-nums text-xs font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
          {scopeInfo.status === 'CONFIRMED_IN_SCOPE' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-medium text-xs">
              <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              {scopeInfo.scope_label}
            </span>
          )}
          {scopeInfo.status === 'PROPOSED_NOT_IN_FORCE' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-medium text-xs">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" strokeWidth={1.5} />
              {scopeInfo.scope_label}
            </span>
          )}
          {scopeInfo.status === 'OUT_OF_SCOPE' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFECE5] text-[#55544E] border border-[#18181A]/12 font-medium text-xs">
              <Info className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
              {scopeInfo.scope_label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#55544E]">
          <Building2 className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
          <span>
            Installation:{' '}
            <strong className="font-medium text-[#18181A]">{installationName}</strong>{' '}
            <span className="font-mono tabular-nums">({installationUnlocode})</span>
          </span>
        </div>
      </div>
    </div>

    <div className="lg:hidden flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10 text-xs font-medium">
      <button
        type="button"
        onClick={() => onMobileStepChange(1)}
        className={`flex-1 h-9 text-center rounded-md transition-colors duration-150 cursor-pointer ${
          mobileStep === 1 ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10' : 'text-[#55544E]'
        }`}
      >
        1. Energy Inputs
      </button>
      <button
        type="button"
        onClick={() => onMobileStepChange(2)}
        className={`flex-1 h-9 text-center rounded-md transition-colors duration-150 cursor-pointer ${
          mobileStep === 2 ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10' : 'text-[#55544E]'
        }`}
      >
        2. What-If Sliders
      </button>
      <button
        type="button"
        onClick={() => onMobileStepChange(3)}
        className={`flex-1 h-9 text-center rounded-md transition-colors duration-150 cursor-pointer ${
          mobileStep === 3 ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10' : 'text-[#55544E]'
        }`}
      >
        3. Value Report
      </button>
    </div>
  </>
);
