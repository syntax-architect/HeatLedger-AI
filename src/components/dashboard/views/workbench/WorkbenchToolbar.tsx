import React from 'react';
import { FileText, Sliders, Upload, ShieldAlert, Scale } from 'lucide-react';
import { STANDARDS_LIST } from '../../../../lib/metallurgicalStandards';
import { SIMULATOR_PRESETS } from '../../../../data/marketingSamples';
import { haptics } from '../../../../lib/motion';

interface WorkbenchToolbarProps {
  selectedPresetIndex: number;
  selectedStandard: string;
  simulateDefect: boolean;
  mobileTab: 'document' | 'fields';
  unconfirmedCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectPreset: (idx: number) => void;
  onSelectStandard: (std: string) => void;
  onFileSelected: (file: File) => void;
  onToggleDefect: () => void;
  onOpenBuyerSpec: () => void;
  onMobileTabChange: (tab: 'document' | 'fields') => void;
}

export const WorkbenchToolbar: React.FC<WorkbenchToolbarProps> = ({
  selectedPresetIndex,
  selectedStandard,
  simulateDefect,
  mobileTab,
  unconfirmedCount,
  fileInputRef,
  onSelectPreset,
  onSelectStandard,
  onFileSelected,
  onToggleDefect,
  onOpenBuyerSpec,
  onMobileTabChange,
}) => {
  return (
    <>
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 overflow-x-auto max-w-full">
          {SIMULATOR_PRESETS.map((preset, idx) => {
            const isSelected = idx === selectedPresetIndex;
            const shortLabel = preset.mill.split(' ').slice(0, 2).join(' ');
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  haptics.tap();
                  onSelectPreset(idx);
                }}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FCFBF8] text-[#18181A] font-medium border border-[#18181A]/10'
                    : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Target metallurgical standard"
            value={selectedStandard}
            onChange={(e) => onSelectStandard(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] text-xs font-medium focus:outline-none focus:border-[#059669] cursor-pointer"
          >
            {STANDARDS_LIST.map((std) => (
              <option key={std} value={std}>
                {std}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Upload 3.1 PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onToggleDefect();
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors duration-150 cursor-pointer ${
              simulateDefect
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                : 'bg-[#FCFBF8] border-[#18181A]/12 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
            <span>{simulateDefect ? 'Defect Active' : 'Simulate Defect'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onOpenBuyerSpec();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium bg-[#FCFBF8] border-[#18181A]/12 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors duration-150 cursor-pointer"
            aria-label="Buyer Spec Tolerance Check"
          >
            <Scale className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Buyer Spec Check</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10">
        <button
          type="button"
          aria-label="Document View"
          onClick={() => onMobileTabChange('document')}
          className={`flex-1 h-9 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'document'
              ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
              : 'text-[#55544E]'
          }`}
        >
          <FileText className="w-4 h-4" strokeWidth={1.5} />
          <span>Certificate Sheet</span>
        </button>
        <button
          type="button"
          aria-label="Extracted Fields"
          onClick={() => onMobileTabChange('fields')}
          className={`flex-1 h-9 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'fields'
              ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
              : 'text-[#55544E]'
          }`}
        >
          <Sliders className="w-4 h-4" strokeWidth={1.5} />
          <span>Verification</span>
          {unconfirmedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums text-xs leading-none">
              {unconfirmedCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
};
