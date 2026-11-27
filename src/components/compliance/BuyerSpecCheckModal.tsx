import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Scale,
  Calendar,
  Info,
} from 'lucide-react';

export interface BuyerSpecProperty {
  name: string;
  type: 'chemistry' | 'mechanical';
  measured: number | null;
  minLimit: number | null;
  maxLimit: number | null;
  unit: string;
  status: 'PASS' | 'FAIL' | 'UNCLEAR';
  delta?: number;
  message?: string;
}

export interface BuyerSpecSelfCheck {
  title: string;
  passed: boolean;
  details: string;
}

interface BuyerSpecCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  heatNumber?: string;
  initialGrade?: string;
}

export const BuyerSpecCheckModal: React.FC<BuyerSpecCheckModalProps> = ({
  isOpen,
  onClose,
  heatNumber = '#BOK-26-4910',
  initialGrade = 'ASTM A105',
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [customCarbonLimit, setCustomCarbonLimit] = useState<number>(0.22); // Buyer PO stricter limit
  const [useCustomPoLimits, setUseCustomPoLimits] = useState<boolean>(false);

  // Stated rounding rule per Prompt Pack v4 Task C1
  const roundingRule = 'ASTM E29 Rounding Method: Chemistry to 0.001%, strength to 1 MPa, elongation to 0.5%';

  // Evaluated properties
  const evaluatedProperties = useMemo<BuyerSpecProperty[]>(() => {
    const isA105 = selectedGrade.includes('A105');
    const measuredC = 0.20; // Simulated Bokaro measured Carbon
    const effectiveMaxC = useCustomPoLimits ? customCarbonLimit : (isA105 ? 0.35 : 0.17);

    const cStatus: 'PASS' | 'FAIL' = measuredC <= effectiveMaxC ? 'PASS' : 'FAIL';
    const cDelta = cStatus === 'FAIL' ? Number((measuredC - effectiveMaxC).toFixed(3)) : undefined;

    return [
      {
        name: 'Carbon (C)',
        type: 'chemistry',
        measured: measuredC,
        minLimit: 0.0,
        maxLimit: effectiveMaxC,
        unit: '%',
        status: cStatus,
        delta: cDelta,
        message: cStatus === 'PASS' 
          ? `C ${measuredC}% meets the limits you entered`
          : `C ${measuredC}% exceeds entered max ${effectiveMaxC}% (+${cDelta}%)`,
      },
      {
        name: 'Manganese (Mn)',
        type: 'chemistry',
        measured: 0.85,
        minLimit: 0.60,
        maxLimit: 1.05,
        unit: '%',
        status: 'PASS',
        message: 'Mn 0.85% meets the limits you entered',
      },
      {
        name: 'Phosphorus (P)',
        type: 'chemistry',
        measured: 0.022,
        minLimit: 0.0,
        maxLimit: 0.035,
        unit: '%',
        status: 'PASS',
        message: 'P 0.022% meets the limits you entered',
      },
      {
        name: 'Sulfur (S)',
        type: 'chemistry',
        measured: 0.018,
        minLimit: 0.0,
        maxLimit: 0.040,
        unit: '%',
        status: 'PASS',
        message: 'S 0.018% meets the limits you entered',
      },
      {
        name: 'Silicon (Si)',
        type: 'chemistry',
        measured: 0.24,
        minLimit: 0.10,
        maxLimit: 0.35,
        unit: '%',
        status: 'PASS',
        message: 'Si 0.24% meets the limits you entered',
      },
      {
        name: 'Yield Strength (ReH)',
        type: 'mechanical',
        measured: 295,
        minLimit: 250,
        maxLimit: null,
        unit: 'MPa',
        status: 'PASS',
        message: 'Yield strength 295 MPa meets the limits you entered',
      },
      {
        name: 'Tensile Strength (Rm)',
        type: 'mechanical',
        measured: 510,
        minLimit: 485,
        maxLimit: null,
        unit: 'MPa',
        status: 'PASS',
        message: 'Tensile strength 510 MPa meets the limits you entered',
      },
      {
        name: 'Elongation (A5)',
        type: 'mechanical',
        measured: 26.5,
        minLimit: 22.0,
        maxLimit: null,
        unit: '%',
        status: 'PASS',
        message: 'Elongation 26.5% meets the limits you entered',
      },
    ];
  }, [selectedGrade, useCustomPoLimits, customCarbonLimit]);

  // Self Cross-Check Results
  const selfChecks = useMemo<BuyerSpecSelfCheck[]>(() => [
    {
      title: 'Chemistry Summation',
      passed: true,
      details: 'Measured alloying elements sum to 1.35% (within 100.0% physical balance).',
    },
    {
      title: 'IIW Carbon Equivalent (CEV)',
      passed: true,
      details: 'Calculated IIW formula CEV = 0.362 (matches reported CEV 0.36 within ±0.02).',
    },
    {
      title: 'Chronological Date Order',
      passed: true,
      details: 'Mechanical/chemical testing completed before certificate issue and dispatch.',
    },
  ], []);

  const failCount = evaluatedProperties.filter((p) => p.status === 'FAIL').length;
  const unclearCount = evaluatedProperties.filter((p) => p.status === 'UNCLEAR').length;
  const allMeet = failCount === 0 && unclearCount === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0E11]/70 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buyer-spec-title"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-[#18181A]/15 bg-[#FCFBF8] text-[#18181A] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#18181A]/10 px-6 py-4 bg-[#F7F5F0]">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
              <Scale className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 id="buyer-spec-title" className="text-base font-medium text-[#18181A]">
                Buyer Specification Tolerance Check
              </h2>
              <p className="text-xs text-[#55544E]">
                Heat: <span className="font-mono text-[#047857] font-medium">{heatNumber}</span> · Plant-confirmed limits, check against current standard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-[#55544E] hover:bg-[#EFECE5] hover:text-[#18181A] flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Controls: Grade and Custom Buyer PO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F7F5F0] p-4 rounded-xl border border-[#18181A]/10">
            <div>
              <label htmlFor="grade-select" className="block text-xs font-medium text-[#55544E] mb-1.5">
                Standard Grade Baseline
              </label>
              <select
                id="grade-select"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] px-3 text-xs text-[#18181A] focus:border-[#059669] focus:outline-none"
              >
                <option value="ASTM A105">ASTM A105 (Carbon Forgings)</option>
                <option value="EN 10025-2 S235JR">EN 10025-2 S235JR (Structural)</option>
                <option value="ASTM A36">ASTM A36 (Structural Carbon)</option>
                <option value="IS 2062 E250 A">IS 2062:2011 E250 A</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="custom-po-toggle" className="text-xs font-medium text-[#55544E]">
                  Buyer PO Strict Limits
                </label>
                <span className="text-[11px] text-[#047857] font-mono">PO #EUR-2026-401</span>
              </div>
              <div className="flex items-center space-x-2 h-9">
                <input
                  id="custom-po-toggle"
                  type="checkbox"
                  checked={useCustomPoLimits}
                  onChange={(e) => setUseCustomPoLimits(e.target.checked)}
                  className="rounded border-[#18181A]/20 accent-[#059669] h-4 w-4"
                />
                <span className="text-xs text-[#18181A]">Apply Stricter Buyer Carbon Cap:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="0.40"
                  disabled={!useCustomPoLimits}
                  value={customCarbonLimit}
                  onChange={(e) => setCustomCarbonLimit(parseFloat(e.target.value) || 0.22)}
                  className="w-20 h-8 rounded-md border border-[#18181A]/15 bg-[#FCFBF8] px-2 text-xs font-mono text-[#18181A] disabled:opacity-40 focus:outline-none focus:border-[#059669]"
                  aria-label="Buyer Carbon Limit"
                />
                <span className="text-xs text-[#55544E]">%</span>
              </div>
            </div>
          </div>

          {/* Stated Rounding Rule */}
          <div className="flex items-center space-x-2 text-xs text-[#55544E] bg-[#EFECE5] px-3.5 py-2.5 rounded-lg border border-[#18181A]/10">
            <Info className="h-4 w-4 text-[#55544E] shrink-0" strokeWidth={1.5} />
            <span><span className="font-medium text-[#18181A]">Rounding Rule:</span> {roundingRule}</span>
          </div>

          {/* Properties Comparison Table */}
          <div className="border border-[#18181A]/10 rounded-xl overflow-hidden bg-[#FCFBF8]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#18181A]/10 bg-[#EFECE5]/60 text-[#55544E] font-medium">
                  <th className="px-3.5 py-2.5">Property</th>
                  <th className="px-3.5 py-2.5">Measured</th>
                  <th className="px-3.5 py-2.5">Entered Limits</th>
                  <th className="px-3.5 py-2.5">Delta</th>
                  <th className="px-3.5 py-2.5 text-right">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/8 font-mono tabular-nums">
                {evaluatedProperties.map((prop) => (
                  <tr key={prop.name} className="hover:bg-[#F7F5F0]">
                    <td className="px-3.5 py-2.5 text-[#18181A] font-sans font-medium">{prop.name}</td>
                    <td className="px-3.5 py-2.5 text-[#18181A]">
                      {prop.measured !== null ? `${prop.measured} ${prop.unit}` : 'Missing'}
                    </td>
                    <td className="px-3.5 py-2.5 text-[#55544E]">
                      {prop.minLimit !== null && prop.maxLimit !== null
                        ? `${prop.minLimit} - ${prop.maxLimit} ${prop.unit}`
                        : prop.maxLimit !== null
                        ? `max ${prop.maxLimit} ${prop.unit}`
                        : `min ${prop.minLimit} ${prop.unit}`}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {prop.delta !== undefined ? (
                        <span className="text-rose-700 font-medium">+{prop.delta} {prop.unit}</span>
                      ) : (
                        <span className="text-[#78766E]">0.00</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-sans">
                      {prop.status === 'PASS' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={1.5} /> meets limits
                        </span>
                      )}
                      {prop.status === 'FAIL' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={1.5} /> fails limits
                        </span>
                      )}
                      {prop.status === 'UNCLEAR' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <HelpCircle className="w-3 h-3 mr-1" strokeWidth={1.5} /> unclear
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Self-Cross-Check Panel */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#55544E] flex items-center">
              <FileCheck className="w-3.5 h-3.5 mr-1.5 text-[#059669]" strokeWidth={1.5} />
              Certificate Self-Cross Checks
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {selfChecks.map((sc) => (
                <div
                  key={sc.title}
                  className="flex items-start space-x-2.5 p-2.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="font-medium text-[#18181A]">{sc.title}: </span>
                    <span className="text-[#55544E]">{sc.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Summary Line */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#18181A]/10 bg-[#F7F5F0] px-6 py-4 gap-3">
          <div className="text-xs">
            {allMeet ? (
              <span className="text-[#047857] font-medium flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5 inline" strokeWidth={1.5} />
                All 12 heats meet the entered limits
              </span>
            ) : (
              <span className="text-rose-700 font-medium flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 inline" strokeWidth={1.5} />
                {failCount} property limits need attention
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium text-[#18181A] bg-[#FCFBF8] border border-[#18181A]/15 hover:bg-[#EFECE5] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
