import React, { useState } from 'react';
import { Scale, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../ui/ToastContext';
import { haptics } from '../../../../lib/motion';
import type { SupplierItem, PoMatchResult } from './types';

interface PoMatcherTabProps {
  suppliers: SupplierItem[];
}

export const PoMatcherTab: React.FC<PoMatcherTabProps> = ({ suppliers }) => {
  const toast = useToast();
  const [poNumber, setPoNumber] = useState('PO-2026-IND-8840');
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id ?? '');
  const [poHeatNumber, setPoHeatNumber] = useState('TSJ-26-9021');
  const [poGrade, setPoGrade] = useState('ASTM A106 Gr. B');
  const [expectedWeightKg, setExpectedWeightKg] = useState<number>(25000);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(25220);
  const [tolerancePct] = useState<number>(2.0);
  const [poMatchResult, setPoMatchResult] = useState<PoMatchResult | null>(null);

  const handleMatchPo = () => {
    haptics.tap();
    const discrepancy = +(receivedWeightKg - expectedWeightKg).toFixed(2);
    const diffPct = expectedWeightKg > 0 ? +((Math.abs(discrepancy) / expectedWeightKg) * 100).toFixed(2) : 0;
    const isDiscrepancy = diffPct > tolerancePct;

    setPoMatchResult({
      status: isDiscrepancy ? 'DISCREPANCY_FLAGGED' : 'MATCHED',
      discrepancy_kg: discrepancy,
      discrepancy_pct: diffPct,
      message: isDiscrepancy
        ? `Weight discrepancy of ${Math.abs(discrepancy).toLocaleString()} kg (${diffPct}%) exceeds ±${tolerancePct}% allowable rolling margin.`
        : `Weight reconciled within allowable ±${tolerancePct}% margin (${discrepancy >= 0 ? '+' : ''}${discrepancy} kg, ${diffPct}%).`,
    });

    if (isDiscrepancy) {
      toast.warning(
        'PO Weight Discrepancy Flagged',
        `Difference exceeds ±${tolerancePct}% allowable rolling tolerance.`
      );
    } else {
      toast.success('PO Matched Successfully', 'Received weight matches purchase order within tolerance.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#18181A]/10">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-medium text-[#18181A]">
              Purchase Order Weight Reconciler
            </h2>
            <p className="text-xs text-[#55544E]">
              Reconciles ordered tonnage against physical weighbridge scale receipt within rolling tolerance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Purchase Order (PO) Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Supplier Mill
            </label>
            <select
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
            >
              {suppliers.length === 0 ? (
                <option value="">No suppliers available</option>
              ) : (
                suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Heat / Cast Number
            </label>
            <input
              type="text"
              value={poHeatNumber}
              onChange={(e) => setPoHeatNumber(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Steel Grade
            </label>
            <input
              type="text"
              value={poGrade}
              onChange={(e) => setPoGrade(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Expected PO Weight (kg)
            </label>
            <input
              type="number"
              value={expectedWeightKg}
              onChange={(e) => setExpectedWeightKg(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Received MTC / Scale Weight (kg)
            </label>
            <input
              type="number"
              value={receivedWeightKg}
              onChange={(e) => setReceivedWeightKg(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#18181A]/10">
          <div className="text-xs text-[#55544E]">
            Allowable Rolling Margin:{' '}
            <span className="font-mono tabular-nums font-medium text-[#18181A]">
              ±{tolerancePct}%
            </span>
          </div>
          <button
            type="button"
            onClick={handleMatchPo}
            className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calculator className="w-4 h-4" strokeWidth={1.5} />
            <span>Reconcile Weights</span>
          </button>
        </div>

        {poMatchResult && (
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              poMatchResult.status === 'MATCHED'
                ? 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-xs flex items-center gap-1.5">
                {poMatchResult.status === 'MATCHED' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#DC2626]" strokeWidth={1.5} />
                )}
                {poMatchResult.status === 'MATCHED' ? 'Tolerance Checked' : 'Discrepancy Flagged'}
              </span>
              <span className="text-xs font-mono tabular-nums font-medium">
                Δ {poMatchResult.discrepancy_kg > 0 ? `+${poMatchResult.discrepancy_kg}` : poMatchResult.discrepancy_kg} kg (
                {poMatchResult.discrepancy_pct}%)
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#18181A]">{poMatchResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
