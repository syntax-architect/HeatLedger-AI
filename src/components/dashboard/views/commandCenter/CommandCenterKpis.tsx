import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Calculator, Clock, Download } from 'lucide-react';
import { AnimatedNumber } from '../../../effects/AnimatedNumber';

interface CommandCenterKpisProps {
  valueSummary: any;
  onSelectFilter: (filter: 'ALL' | 'READY' | 'ACTION_REQUIRED') => void;
  onOpenValueModal: () => void;
}

export const CommandCenterKpis: React.FC<CommandCenterKpisProps> = ({
  valueSummary,
  onSelectFilter,
  onOpenValueModal,
}) => {
  const { t } = useTranslation();

  const scrollToTableWithFilter = (filter: 'ALL' | 'READY' | 'ACTION_REQUIRED') => {
    onSelectFilter(filter);
    document.getElementById('shipments-table')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#18181A]/[0.08]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-sm font-medium text-[#18181A]">
            Plant protection and value overview
          </h1>
          <span className="text-xs font-mono tabular-nums text-[#047857] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
            <span>
              {valueSummary?.time_saved?.hours_saved ?? '3.0'} hrs saved (
              {valueSummary?.time_saved?.label ?? 'your estimate'})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenValueModal}
            className="inline-flex items-center gap-2 h-9 text-xs text-[#18181A] font-medium px-3 rounded-lg border border-[#18181A]/10 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
            <span>Money-at-risk formula</span>
          </button>
          <a
            href="/api/value-screen/director-pdf"
            download="HeatLedger_Executive_Report.pdf"
            className="inline-flex items-center gap-2 h-9 text-xs text-[#18181A] font-medium px-3 rounded-lg border border-[#18181A]/10 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
            <span>1-page board PDF</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.0, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => scrollToTableWithFilter('ALL')}
          className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 hover:border-[#18181A]/25 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#55544E]">
            <span className="font-medium">{t('dashboard.kpis.shipments', 'EU/UK Shipments')}</span>
            <ArrowUpRight className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl leading-none font-medium tracking-[-0.02em] font-mono tabular-nums text-[#18181A]">
              <AnimatedNumber
                value={valueSummary?.four_numbers?.shipments_this_month ?? 12}
                duration={0.45}
              />
            </span>
            <span className="text-xs text-[#78766E]">this month</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#55544E] truncate">Rotterdam, Antwerp, Genoa</span>
            <span className="text-[#047857] font-medium shrink-0 ml-2">Active</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => scrollToTableWithFilter('READY')}
          className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 hover:border-[#18181A]/25 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#55544E]">
            <span className="font-medium">{t('dashboard.kpis.heats', 'Verified Precursors')}</span>
            <ArrowUpRight className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl leading-none font-medium tracking-[-0.02em] font-mono tabular-nums text-[#047857]">
              <AnimatedNumber
                value={valueSummary?.four_numbers?.shipments_ready ?? 9}
                duration={0.45}
              />
            </span>
            <span className="text-xs text-[#047857] font-medium">ready to seal</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#55544E] truncate">Tamper seal generated</span>
            <span className="text-[#047857] font-medium shrink-0 ml-2">Cleared</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => scrollToTableWithFilter('ACTION_REQUIRED')}
          className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 hover:border-[#18181A]/25 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#55544E]">
            <span className="font-medium">Shipments Blocked</span>
            <ArrowUpRight className="w-4 h-4 text-[#78766E]" strokeWidth={1.5} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl leading-none font-medium tracking-[-0.02em] font-mono tabular-nums text-[#DC2626]">
              <AnimatedNumber
                value={valueSummary?.four_numbers?.shipments_blocked ?? 3}
                duration={0.45}
              />
            </span>
            <span className="text-xs text-[#DC2626] font-medium">needs attention</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#DC2626] truncate">
              {valueSummary?.blocked_reasons?.[0]?.reasons?.[0] ?? 'Melt/Pour origin deficit'}
            </span>
            <span className="text-[#DC2626] font-medium shrink-0 ml-2">Action needed</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          onClick={onOpenValueModal}
          className="bg-[#FCFBF8] rounded-xl border border-[#B45309]/25 hover:border-[#B45309]/50 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#55544E]">
            <span className="font-medium">Money at Risk</span>
            <span className="text-xs font-mono text-[#78766E]">your estimate</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl leading-none font-medium tracking-[-0.02em] font-mono tabular-nums text-[#B45309]">
              ₹
              {valueSummary?.four_numbers?.money_at_risk_inr
                ? valueSummary.four_numbers.money_at_risk_inr >= 100000
                  ? `${(valueSummary.four_numbers.money_at_risk_inr / 100000).toFixed(1)}L`
                  : valueSummary.four_numbers.money_at_risk_inr.toLocaleString('en-IN')
                : '18.4L'}
            </span>
            <span className="text-xs text-[#78766E]">protected</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#55544E] truncate">Demurrage + Tariff + CBAM</span>
            <span className="text-[#B45309] font-medium shrink-0 ml-2">Edit inputs →</span>
          </div>
        </motion.button>
      </div>
    </>
  );
};
