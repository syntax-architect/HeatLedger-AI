import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Check,
  Edit2,
  Eye,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WorkbenchField, InspectionSection } from './workbenchHelpers';
import { WorkbenchChemistryAndMechanical } from './WorkbenchChemistryAndMechanical';

const CORE_FIELD_IDS = [
  'mill_name',
  'heat_number',
  'grade',
  'product_form',
  'dimensions',
  'quantity_tonnes',
  'melt_country',
  'issue_date',
];

interface WorkbenchVerificationPanelProps {
  mobileTab: 'document' | 'fields';
  selectedPreset: {
    heatNumber: string;
    meltCountry: string;
    certNumber: string;
  };
  selectedStandard: string;
  isOffSpec: boolean;
  failedElementsCount: number;
  activeChemistry: any[];
  fields: WorkbenchField[];
  cevValue: number;
  cevMax: number;
  isCevPass: boolean;
  isChemMechCollapsed: boolean;
  lastAction: { fieldId: string; previousValue: string } | null;
  onResetDefectAndStandard: () => void;
  onLocateOrigin: () => void;
  onUndo: () => void;
  onSelectSection: (sec: InspectionSection) => void;
  onStartEdit: (field: WorkbenchField) => void;
  onConfirmField: (fieldId: string) => void;
  onToggleChemMech: () => void;
}

export const WorkbenchVerificationPanel: React.FC<WorkbenchVerificationPanelProps> = ({
  mobileTab,
  selectedPreset,
  selectedStandard,
  isOffSpec,
  failedElementsCount,
  activeChemistry,
  fields,
  cevValue,
  cevMax,
  isCevPass,
  isChemMechCollapsed,
  lastAction,
  onResetDefectAndStandard,
  onLocateOrigin,
  onUndo,
  onSelectSection,
  onStartEdit,
  onConfirmField,
  onToggleChemMech,
}) => {
  return (
    <div className={`lg:col-span-6 space-y-4 ${mobileTab === 'fields' ? 'block' : 'hidden lg:block'}`}>
      {isOffSpec && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-[#DC2626]">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>
                Out-of-spec tolerance violation ({failedElementsCount} element
                {failedElementsCount === 1 ? '' : 's'}) against {selectedStandard}
              </span>
            </div>
            <button
              type="button"
              onClick={onResetDefectAndStandard}
              className="text-xs font-medium text-[#DC2626] underline hover:text-red-800 cursor-pointer"
            >
              Reset check
            </button>
          </div>
          <p className="text-[#55544E] leading-relaxed">
            Measured ladle composition exceeds permissible limits for{' '}
            <strong className="text-[#18181A] font-medium">{selectedStandard}</strong>.
            Dispatch clearance is blocked until amended or reassigned.
          </p>
        </div>
      )}

      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
          <span className="text-xs font-medium text-[#18181A]">
            Heat &amp; Melt-and-Pour Summary
          </span>
          <button
            type="button"
            onClick={onLocateOrigin}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] hover:underline cursor-pointer"
          >
            <Eye className="w-4 h-4" strokeWidth={1.5} />
            <span>Locate on sheet</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#18181A]/10">
          <div className="p-3">
            <span className="text-xs text-[#55544E] block">Heat Number</span>
            <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] block mt-0.5 truncate">
              #{selectedPreset.heatNumber}
            </span>
          </div>
          <div className="p-3">
            <span className="text-xs text-[#55544E] block">Origin (EU 2026/1963)</span>
            <span className="text-xs font-medium text-[#047857] block mt-0.5 truncate">
              {selectedPreset.meltCountry} (IN)
            </span>
          </div>
          <div className="p-3">
            <span className="text-xs text-[#55544E] block">Certificate Ref</span>
            <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] block mt-0.5 truncate">
              {selectedPreset.certNumber}
            </span>
          </div>
          <div className="p-3">
            <span className="text-xs text-[#55544E] block">Carbon Equivalent</span>
            <span
              className={`font-mono tabular-nums text-xs font-medium block mt-0.5 ${
                isCevPass ? 'text-[#18181A]' : 'text-[#DC2626]'
              }`}
            >
              {cevValue.toFixed(3)} IIW
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
          <span className="text-xs font-medium text-[#18181A]">
            8 Core Certificate Fields (EN 10204 3.1)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#55544E]">Autosaved</span>
            {lastAction && (
              <button
                type="button"
                onClick={onUndo}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] hover:underline cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Undo</span>
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#18181A]/10">
          {fields
            .filter((f) => CORE_FIELD_IDS.includes(f.id))
            .map((field) => {
              const isFlagged = !field.isConfirmed || field.confidence < 85;
              return (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  onClick={() => onSelectSection('origin')}
                  className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150 ${
                    isFlagged ? 'bg-[#FFFBEB]/70 hover:bg-[#FFFBEB]' : 'bg-[#FCFBF8] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#55544E] font-medium">{field.label}</span>
                      <span
                        className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                          isFlagged
                            ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] font-medium'
                            : 'bg-[#EFECE5] text-[#55544E] border-[#18181A]/10'
                        }`}
                      >
                        {isFlagged ? `needs your check · ${field.confidence}%` : `${field.confidence}%`}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#18181A] truncate mt-0.5">
                      {field.value}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit(field);
                      }}
                      className="p-1.5 rounded-md text-[#78766E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                      title={`Edit ${field.label}`}
                      aria-label={`Edit ${field.label}`}
                    >
                      <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    {isFlagged ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmField(field.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Confirm</span>
                      </button>
                    ) : (
                      <span className="text-[#059669]" title="Checked">
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        <button
          type="button"
          onClick={onToggleChemMech}
          className="w-full px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between text-left cursor-pointer hover:bg-[#EFECE5] transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span className="text-xs font-medium text-[#18181A]">
              Chemistry and Mechanical Properties
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#55544E]">
            <span>{isChemMechCollapsed ? 'Show' : 'Hide'} Specifications</span>
            {isChemMechCollapsed ? (
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
            )}
          </div>
        </button>
      </div>

      <WorkbenchChemistryAndMechanical
        selectedStandard={selectedStandard}
        isOffSpec={isOffSpec}
        failedCount={failedElementsCount}
        activeChemistry={activeChemistry}
        fields={fields}
        cevValue={cevValue}
        cevMax={cevMax}
        isCevPass={isCevPass}
        onHoverSection={onSelectSection}
        onStartEdit={onStartEdit}
        onConfirmField={onConfirmField}
      />
    </div>
  );
};
