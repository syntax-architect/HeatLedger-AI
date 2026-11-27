import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BuyerDossier } from '../../services/api';

interface ShareHeatsLedgerProps {
  heats: BuyerDossier['heats'];
  expandedHeat: string | null;
  onToggleHeat: (heatNumber: string) => void;
}

export const ShareHeatsLedger: React.FC<ShareHeatsLedgerProps> = ({
  heats,
  expandedHeat,
  onToggleHeat,
}) => (
  <section className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 className="text-sm font-medium text-[#18181A]">
          Melt-and-Pour Crude Steel Origin Ledger
        </h2>
        <p className="text-xs text-[#55544E] mt-0.5">
          Heat-level metallurgical traceability per Regulation (EU) 2026/1963.
        </p>
      </div>
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EFECE5] border border-[#18181A]/10 font-mono text-xs text-[#18181A] self-start sm:self-center">
        {heats.length} Linked Heats
      </span>
    </div>

    <div className="divide-y divide-[#18181A]/10">
      {heats.map((heat) => {
        const isExpanded = expandedHeat === heat.heat_number;
        return (
          <div key={heat.heat_number}>
            <button
              type="button"
              onClick={() => onToggleHeat(heat.heat_number)}
              className="w-full px-6 py-4 text-left hover:bg-[#F7F5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium text-sm text-[#18181A]">
                    {heat.heat_number}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs font-medium">
                    {heat.melt_country}
                  </span>
                  <span className="text-xs text-[#55544E]">{heat.mill_name}</span>
                </div>
                <div className="text-xs text-[#55544E] flex items-center gap-2 flex-wrap">
                  <span>
                    Grade:{' '}
                    <strong className="font-mono font-medium text-[#18181A]">
                      {heat.steel_grade}
                    </strong>
                  </span>
                  <span className="text-[#18181A]/25">·</span>
                  <span>
                    Route:{' '}
                    <strong className="font-medium text-[#18181A]">
                      {heat.crude_steel_process}
                    </strong>
                  </span>
                  <span className="text-[#18181A]/25">·</span>
                  <span>
                    Mass:{' '}
                    <strong className="font-mono tabular-nums font-medium text-[#18181A]">
                      {heat.tonnes} MT
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="sm:text-right">
                  <div className="text-xs font-mono font-medium tabular-nums text-[#18181A]">
                    CEV {heat.cev.toFixed(3)}
                  </div>
                  <div className="text-xs text-[#047857]">In Spec (IIW &le; 0.450)</div>
                </div>
                <span className="p-1.5 rounded-md border border-[#18181A]/15 bg-[#FCFBF8] text-[#55544E]">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-4 bg-[#F7F5F0] border-t border-[#18181A]/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#18181A]">
                        Ladle Chemical Composition (% wt)
                      </span>
                      <span className="text-[#55544E]">
                        Upstream Mill MTC:{' '}
                        <strong className="font-mono font-medium text-[#18181A]">
                          {heat.mtc_number}
                        </strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {Object.entries(heat.chemistry).map(([elem, val]) => (
                        <div
                          key={elem}
                          className="p-2 rounded-lg bg-[#FCFBF8] border border-[#18181A]/10 text-center"
                        >
                          <div className="text-xs font-medium text-[#55544E]">{elem}</div>
                          <div className="text-xs font-mono font-medium tabular-nums text-[#18181A] mt-0.5">
                            {val.toFixed(3)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  </section>
);
