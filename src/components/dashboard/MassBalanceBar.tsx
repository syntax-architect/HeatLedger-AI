import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface MassBalanceBarProps {
  receivedKg: number;
  shippedKg: number;
  allocatedKg?: number;
  scrapKg?: number;
  remainingKg: number;
  unit?: 'MT' | 'kg';
  showLegend?: boolean;
  className?: string;
}

export const MassBalanceBar: React.FC<MassBalanceBarProps> = ({
  receivedKg,
  shippedKg,
  allocatedKg = 0,
  scrapKg = 0,
  remainingKg,
  unit = 'MT',
  showLegend = true,
  className = '',
}) => {
  const isOverAllocated = remainingKg < -0.001;
  const divisor = unit === 'MT' ? 1000 : 1;
  const unitLabel = unit === 'MT' ? 'MT' : 'kg';

  const receivedDisplay = (receivedKg / divisor).toFixed(1);
  const shippedDisplay = (shippedKg / divisor).toFixed(1);
  const allocatedDisplay = (allocatedKg / divisor).toFixed(1);
  const scrapDisplay = (scrapKg / divisor).toFixed(1);
  const remainingDisplay = (remainingKg / divisor).toFixed(1);

  const total = receivedKg > 0 ? receivedKg : 1;
  const shippedPct = Math.min(100, Math.max(0, (shippedKg / total) * 100));
  const allocatedPct = Math.min(100 - shippedPct, Math.max(0, (allocatedKg / total) * 100));
  const scrapPct = Math.min(
    100 - (shippedPct + allocatedPct),
    Math.max(0, (scrapKg / total) * 100)
  );
  const remainingPct = Math.max(0, 100 - (shippedPct + allocatedPct + scrapPct));

  return (
    <div className={`space-y-2 w-full text-left ${className}`}>
      {/* Numbers Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[#52525B]">
            Total:{' '}
            <strong className="font-mono tabular-nums font-semibold text-[#09090B]">
              {receivedDisplay} {unitLabel}
            </strong>
          </span>
          <span className="text-[#52525B]">
            Remaining:{' '}
            <strong
              className={`font-mono tabular-nums font-semibold ${
                isOverAllocated ? 'text-[#DC2626]' : 'text-[#059669]'
              }`}
            >
              {remainingDisplay} {unitLabel}
            </strong>
          </span>
        </div>

        {isOverAllocated ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>OVER-ALLOCATED: {remainingDisplay} {unitLabel}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[#059669] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Mass balanced</span>
          </span>
        )}
      </div>

      {/* Animated Stacked Progress Track */}
      <div className="h-2.5 w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-full overflow-hidden flex">
        {!isOverAllocated ? (
          <>
            {shippedPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${shippedPct}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#2563EB] hover:opacity-90"
                title={`Shipped: ${shippedDisplay} ${unitLabel} (${shippedPct.toFixed(0)}%)`}
              />
            )}
            {allocatedPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${allocatedPct}%` }}
                transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#D97706] hover:opacity-90"
                title={`Allocated: ${allocatedDisplay} ${unitLabel} (${allocatedPct.toFixed(0)}%)`}
              />
            )}
            {scrapPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scrapPct}%` }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#DC2626]/80 hover:opacity-90"
                title={`Scrap: ${scrapDisplay} ${unitLabel} (${scrapPct.toFixed(0)}%)`}
              />
            )}
            {remainingPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${remainingPct}%` }}
                transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#059669] hover:opacity-90"
                title={`Available: ${remainingDisplay} ${unitLabel} (${remainingPct.toFixed(0)}%)`}
              />
            )}
          </>
        ) : (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full origin-left bg-[#DC2626]"
            title="Over-allocated: allocated quantities exceed received mill heat mass."
          />
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52525B] pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-[#2563EB] shrink-0" />
            <span>
              Shipped:{' '}
              <span className="font-mono tabular-nums text-[#09090B] font-medium">
                {shippedDisplay} {unitLabel}
              </span>
            </span>
          </div>
          {allocatedKg > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#D97706] shrink-0" />
              <span>
                Allocated:{' '}
                <span className="font-mono tabular-nums text-[#09090B] font-medium">
                  {allocatedDisplay} {unitLabel}
                </span>
              </span>
            </div>
          )}
          {scrapKg > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#DC2626]/80 shrink-0" />
              <span>
                Scrap:{' '}
                <span className="font-mono tabular-nums text-[#09090B] font-medium">
                  {scrapDisplay} {unitLabel}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-sm shrink-0 ${
                isOverAllocated ? 'bg-[#DC2626]' : 'bg-[#059669]'
              }`}
            />
            <span>
              Available:{' '}
              <span className="font-mono tabular-nums text-[#09090B] font-medium">
                {remainingDisplay}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
