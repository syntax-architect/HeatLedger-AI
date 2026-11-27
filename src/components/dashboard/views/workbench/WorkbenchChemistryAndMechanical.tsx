import React from 'react';
import { Check, CheckCircle2, Edit2 } from 'lucide-react';
import { InspectionSection, WorkbenchField } from './workbenchHelpers';

interface EvaluatedElement {
  symbol: string;
  name: string;
  min: number;
  max: number;
  measured: number;
  status: string;
}

interface WorkbenchChemistryAndMechanicalProps {
  selectedStandard: string;
  isOffSpec: boolean;
  failedCount: number;
  activeChemistry: EvaluatedElement[];
  fields: WorkbenchField[];
  cevValue: number;
  cevMax: number;
  isCevPass: boolean;
  onHoverSection: (section: InspectionSection) => void;
  onStartEdit: (field: WorkbenchField) => void;
  onConfirmField: (fieldId: string) => void;
}

export const WorkbenchChemistryAndMechanical: React.FC<WorkbenchChemistryAndMechanicalProps> = ({
  selectedStandard,
  isOffSpec,
  failedCount,
  activeChemistry,
  fields,
  cevValue,
  cevMax,
  isCevPass,
  onHoverSection,
  onStartEdit,
  onConfirmField,
}) => (
  <>
    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium text-[#18181A]">Chemical Tolerance Range Gauges</h3>
          <p className="text-xs text-[#55544E] mt-0.5">
            Evaluated live against {selectedStandard}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
            isOffSpec
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              : 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
          }`}
        >
          {isOffSpec ? `${failedCount} out of spec` : 'All elements in spec'}
        </span>
      </div>

      <div className="divide-y divide-[#18181A]/10">
        {activeChemistry.map((el) => {
          const field = fields.find((f) => f.id === `chem_${el.symbol}`);
          const isPass = el.status === 'PASS';
          const isFlagged = field ? !field.isConfirmed || field.confidence < 85 : false;

          const scaleMax = Math.max(el.max * 1.25, el.measured * 1.1, 0.05);
          const safeStartPct = Math.max(0, Math.min(100, (el.min / scaleMax) * 100));
          const safeEndPct = Math.max(safeStartPct, Math.min(100, (el.max / scaleMax) * 100));
          const markerPct = Math.max(2, Math.min(98, (el.measured / scaleMax) * 100));

          return (
            <div
              key={el.symbol}
              id={field ? `field-${field.id}` : undefined}
              onMouseEnter={() => onHoverSection('chemistry')}
              className={`px-4 py-3 transition-colors duration-150 ${
                !isPass
                  ? 'bg-[#FEF2F2]/70'
                  : isFlagged
                    ? 'bg-[#FFFBEB]/60'
                    : 'bg-[#FCFBF8] hover:bg-[#F7F5F0]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-medium text-[#18181A] w-7">{el.symbol}</span>
                  <span className="text-[#55544E] truncate">{el.name}</span>
                  {isFlagged && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                      Verify OCR
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-[#55544E]">
                    {el.min > 0 ? `${el.min}–${el.max}%` : `≤ ${el.max}%`}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-medium min-w-[60px] text-right ${
                      !isPass ? 'text-[#DC2626]' : 'text-[#18181A]'
                    }`}
                  >
                    {el.measured.toFixed(3)}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <div className="relative flex-1 h-1.5 rounded bg-[#EFECE5] border border-[#18181A]/10">
                  <div
                    className={`absolute top-0 bottom-0 rounded ${
                      !isPass ? 'bg-emerald-500/25' : 'bg-emerald-500/35'
                    }`}
                    style={{
                      left: `${safeStartPct}%`,
                      width: `${Math.max(4, safeEndPct - safeStartPct)}%`,
                    }}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#FCFBF8] ${
                      !isPass ? 'bg-[#DC2626]' : 'bg-[#059669]'
                    }`}
                    style={{ left: `${markerPct}%` }}
                    title={`Measured ${el.symbol}: ${el.measured}%`}
                  />
                </div>

                {field && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onStartEdit(field)}
                      className="p-1 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
                      title={`Edit ${el.name}`}
                      aria-label={`Edit ${el.name}`}
                    >
                      <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    {isFlagged ? (
                      <button
                        type="button"
                        onClick={() => onConfirmField(field.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Confirm</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center text-[#059669]" title="Verified">
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className={`px-4 py-3 ${!isCevPass ? 'bg-[#FEF2F2]/70' : 'bg-[#F7F5F0]'}`}>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-[#18181A]">CEV</span>
              <span className="text-[#55544E]">Carbon Equivalent (IIW Formula)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-[#55544E]">
                ≤ {cevMax.toFixed(2)} IIW
              </span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  isCevPass ? 'text-[#047857]' : 'text-[#DC2626]'
                }`}
              >
                {cevValue.toFixed(3)} IIW
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
        <h3 className="text-xs font-medium text-[#18181A]">
          Mechanical Properties (23°C Ambient)
        </h3>
        <span className="text-xs font-medium text-[#047857]">EN 10025-2 Verified</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-[#18181A]/10">
        {fields
          .filter((f) => f.group === 'mechanical')
          .map((field) => {
            const isFlagged = !field.isConfirmed || field.confidence < 85;
            return (
              <div
                key={field.id}
                id={`field-${field.id}`}
                onMouseEnter={() => onHoverSection('mechanical')}
                className={`p-4 flex flex-col justify-between gap-2.5 ${
                  isFlagged ? 'bg-[#FFFBEB]' : 'bg-[#FCFBF8]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-[#55544E]">{field.label}</span>
                  <span
                    className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md border ${
                      isFlagged
                        ? 'bg-[#FCFBF8] border-[#FDE68A] text-[#B45309]'
                        : 'bg-[#F7F5F0] border-[#18181A]/10 text-[#55544E]'
                    }`}
                  >
                    {field.confidence}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono tabular-nums text-base font-medium text-[#18181A]">
                    {field.value}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isFlagged ? (
                      <button
                        type="button"
                        onClick={() => onConfirmField(field.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Confirm</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartEdit(field)}
                        className="p-1.5 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                        title="Edit mechanical value"
                      >
                        <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  </>
);
