import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { ShipmentRecord } from '../../../../types';
import { EmptyState } from '../../../ui/DataDisplay';

interface ShipmentsLedgerSectionProps {
  shipmentsCount: number;
  atRiskCount: number;
  filteredShipments: ShipmentRecord[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  statusFilter: 'ALL' | 'READY' | 'ACTION_REQUIRED';
  onStatusFilterChange: (f: 'ALL' | 'READY' | 'ACTION_REQUIRED') => void;
  activeFilterCount: number;
  density: 'comfortable' | 'compact';
  onToggleDensity: () => void;
  onOpenFilterSheet: () => void;
  onTriggerUpload: () => void;
  onOpenShipmentDossier: (shipment: ShipmentRecord) => void;
  onResetFilters: () => void;
}

export const ShipmentsLedgerSection: React.FC<ShipmentsLedgerSectionProps> = ({
  shipmentsCount,
  atRiskCount,
  filteredShipments,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  activeFilterCount,
  density,
  onToggleDensity,
  onOpenFilterSheet,
  onTriggerUpload,
  onOpenShipmentDossier,
  onResetFilters,
}) => {
  const { t } = useTranslation();

  return (
    <section
      id="shipments-table"
      className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[#18181A]/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-medium text-[#18181A]">
            {t('dashboard.shipments_ledger', 'Container Dispatch & Export Compliance Ledger')}
          </h2>
          <p className="text-xs text-[#55544E] mt-0.5">
            {t(
              'dashboard.shipments_sub',
              'Commercial export invoices, linked upstream mill heats, and EU/UK customs readiness'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onTriggerUpload}
          className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/10 text-xs font-medium transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#047857]" strokeWidth={1.5} />
          <span>{t('dashboard.ingest_raw_mtc', 'Ingest Raw MTC')}</span>
        </button>
      </div>

      <div className="px-5 py-3 border-b border-[#18181A]/[0.08] bg-[#F7F5F0] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={t(
              'common.search_placeholder',
              'Search container, invoice, buyer, port, CN code, heat...'
            )}
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
              aria-label="Clear search"
            >
              <XCircle className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFilterSheet}
            className="md:hidden inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            <span>{t('common.filters', 'Filters')}</span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-xs text-[#047857]">{activeFilterCount}</span>
            )}
          </button>

          <div className="hidden md:flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/[0.08] text-xs">
            {(
              [
                {
                  id: 'ALL',
                  label: `${t('common.all', 'All')} (${shipmentsCount})`,
                  activeCls: 'text-[#18181A]',
                },
                { id: 'READY', label: t('common.ready', 'Ready'), activeCls: 'text-[#047857]' },
                {
                  id: 'ACTION_REQUIRED',
                  label: `${t('common.action_required', 'Action Required')} (${atRiskCount})`,
                  activeCls: 'text-[#DC2626]',
                },
              ] as const
            ).map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`relative px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    isSelected ? `${tab.activeCls} font-medium` : 'text-[#55544E] hover:text-[#18181A]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="cmd-status-filter-pill"
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 rounded bg-[#FCFBF8] border border-[#18181A]/[0.08]"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleDensity}
            className="hidden md:inline-flex items-center h-9 px-3 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] bg-[#FCFBF8] border border-[#18181A]/10 transition-colors cursor-pointer"
            title="Toggle Table Density"
          >
            {density === 'comfortable' ? 'Compact rows' : 'Comfortable rows'}
          </button>
        </div>
      </div>

      {filteredShipments.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<Search className="w-5 h-5 text-[#78766E]" strokeWidth={1.5} />}
            title="No shipments found"
            description={`No export container matched "${searchQuery}" under the selected filter.`}
            action={
              <button
                type="button"
                onClick={onResetFilters}
                className="px-3.5 py-2 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
              >
                Reset filters
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="md:hidden divide-y divide-[#18181A]/[0.08]">
            {filteredShipments.map((shipment) => {
              const isReady = shipment.cbamXmlStatus === 'GENERATED_VALID' && shipment.qaSigned;
              const invoiceNo = shipment.containerInvoice.split('/')[0].trim();
              return (
                <div
                  key={shipment.id}
                  onClick={() => onOpenShipmentDossier(shipment)}
                  className="p-4 hover:bg-[#F7F5F0] active:bg-[#EFECE5] transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] truncate">
                      {invoiceNo}
                    </span>
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#059669]/20 text-[#047857] text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFFBEB] border border-[#B45309]/25 text-[#B45309] text-xs font-medium">
                        <AlertOctagon className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Awaiting sign-off
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[#78766E] block">Buyer &amp; port</span>
                      <span className="font-medium text-[#18181A] truncate block mt-0.5">
                        {shipment.buyerName}
                      </span>
                      <span className="text-[#55544E] truncate block">
                        {shipment.destinationPort}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#78766E] block">Tonnage &amp; CN</span>
                      <span className="font-mono tabular-nums font-medium text-[#18181A] block mt-0.5">
                        {shipment.netTonnage} MT
                      </span>
                      <span className="font-mono tabular-nums text-[#55544E] block">
                        CN {shipment.cnCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {shipment.linkedHeatNumbers.map((heat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/10 text-xs font-mono tabular-nums"
                      >
                        #{heat}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#18181A]/[0.08]">
                    <span className="text-[#55544E]">Melt &amp; Pour: India (IN)</span>
                    <span className="inline-flex items-center text-[#047857] font-medium gap-1">
                      <span>Open dossier</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F5F0] border-b border-[#18181A]/[0.08] text-[#78766E] sticky top-0 z-10">
                  {[
                    'Invoice & weight',
                    'Customer & port',
                    'CN code',
                    'Linked heats',
                    'Metallurgy',
                    'Melt & pour',
                    'CBAM status',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium text-right whitespace-nowrap`}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/[0.06]">
                {filteredShipments.map((shipment) => {
                  const isReady =
                    shipment.cbamXmlStatus === 'GENERATED_VALID' && shipment.qaSigned;
                  const invoiceNo = shipment.containerInvoice.split('/')[0].trim();
                  const containerRef =
                    shipment.containerInvoice.split('/')[1]?.trim() || '20ft FCL';
                  const isOffSpec = shipment.metallurgyStatus === 'OFF_SPEC_ALERT';
                  const isMeltDefect = shipment.meltAndPourStatus === 'UNVERIFIED_DEFECT';
                  const cellPad = density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5';

                  return (
                    <tr key={shipment.id} className="hover:bg-[#F7F5F0]/70 transition-colors">
                      <td className={`${cellPad} whitespace-nowrap`}>
                        <div className="font-mono tabular-nums font-medium text-[#18181A]">
                          {invoiceNo}
                        </div>
                        <div className="text-xs text-[#55544E] mt-0.5">
                          <span>{containerRef}</span>
                          <span className="mx-1.5 text-[#18181A]/20">·</span>
                          <span className="font-mono tabular-nums">{shipment.netTonnage} MT</span>
                        </div>
                      </td>

                      <td className={cellPad}>
                        <div className="font-medium text-[#18181A]">{shipment.buyerName}</div>
                        <div className="text-xs text-[#55544E] mt-0.5">
                          {shipment.destinationPort}
                        </div>
                      </td>

                      <td className={`${cellPad} whitespace-nowrap`}>
                        <span className="inline-block px-2 py-0.5 rounded font-mono tabular-nums text-xs bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/10">
                          {shipment.cnCode}
                        </span>
                      </td>

                      <td className={`${cellPad} whitespace-nowrap`}>
                        <div className="flex flex-wrap gap-1">
                          {shipment.linkedHeatNumbers.map((heat, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 rounded bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/10 font-mono tabular-nums text-xs"
                            >
                              #{heat}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className={`${cellPad} whitespace-nowrap`}>
                        {isOffSpec ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20">
                            Off-spec
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-[#059669]/20">
                            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            In spec
                          </span>
                        )}
                      </td>

                      <td className={`${cellPad} whitespace-nowrap`}>
                        {isMeltDefect ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20">
                            Missing origin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/10">
                            India (IN)
                          </span>
                        )}
                      </td>

                      <td className={`${cellPad} whitespace-nowrap`}>
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-[#059669]/20">
                            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#B45309]/25">
                            Awaiting sign-off
                          </span>
                        )}
                      </td>

                      <td className={`${cellPad} text-right whitespace-nowrap`}>
                        <button
                          type="button"
                          onClick={() => onOpenShipmentDossier(shipment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] border border-transparent hover:border-[#18181A]/10 transition-colors cursor-pointer"
                          title={`Open customs dossier for ${invoiceNo}`}
                        >
                          <span>Open dossier</span>
                          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
