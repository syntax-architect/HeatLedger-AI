import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { ShipmentRecord, ReadinessEvaluation } from '../../../types';
import { FilterBottomSheet } from '../FilterBottomSheet';
import { ReadinessGateCard } from '../../readiness/ReadinessGateCard';
import { ValueScreenSettingsModal } from '../ValueScreenSettingsModal';
import { evaluateShipmentReadiness } from './commandCenter/readinessHelper';
import { CommandCenterKpis } from './commandCenter/CommandCenterKpis';
import { ShipmentsLedgerSection } from './commandCenter/ShipmentsLedgerSection';

interface CommandCenterViewProps {
  onOpenShipmentDossier: (shipment: ShipmentRecord) => void;
  onNavigateToWorkbench: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSignOff: () => void;
  onTriggerUpload: () => void;
  pendingSignOffCount?: number;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  onOpenShipmentDossier,
  onTriggerUpload,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'ACTION_REQUIRED'>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [selectedShipmentForReadiness, setSelectedShipmentForReadiness] =
    useState<ShipmentRecord | null>(null);
  const [releaseStatusMap, setReleaseStatusMap] = useState<Record<string, string>>({});
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [valueSummary, setValueSummary] = useState<any>(null);

  const fetchValueSummary = () => {
    fetch('/api/value-screen/summary', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setValueSummary(data);
      })
      .catch(() => {});

    fetch('/api/shipments', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: ShipmentRecord[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.shipments)
            ? data.shipments
            : [];
        setShipments(list);
        if (list.length > 0) {
          setSelectedShipmentForReadiness((prev) => prev || list[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchValueSummary();
  }, []);

  const atRiskShipments = useMemo(
    () =>
      shipments.filter(
        (s) =>
          !s.qaSigned ||
          s.cbamXmlStatus === 'PENDING_INPUTS' ||
          s.meltAndPourStatus === 'UNVERIFIED_DEFECT' ||
          s.metallurgyStatus === 'OFF_SPEC_ALERT'
      ),
    [shipments]
  );

  const readinessEvaluation: ReadinessEvaluation | null = useMemo(
    () => evaluateShipmentReadiness(selectedShipmentForReadiness),
    [selectedShipmentForReadiness]
  );

  const filteredShipments = useMemo(
    () =>
      shipments.filter((shipment) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          shipment.containerInvoice.toLowerCase().includes(q) ||
          shipment.buyerName.toLowerCase().includes(q) ||
          shipment.destinationPort.toLowerCase().includes(q) ||
          shipment.cnCode.includes(searchQuery) ||
          shipment.linkedHeatNumbers.some((h) => h.toLowerCase().includes(q));

        if (!matchesSearch) return false;
        if (statusFilter === 'READY') {
          return shipment.cbamXmlStatus === 'GENERATED_VALID' && shipment.qaSigned;
        }
        if (statusFilter === 'ACTION_REQUIRED') {
          return !shipment.qaSigned || shipment.cbamXmlStatus === 'PENDING_INPUTS';
        }
        return true;
      }),
    [shipments, searchQuery, statusFilter]
  );

  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="space-y-6 font-sans text-left">
      <CommandCenterKpis
        valueSummary={valueSummary}
        onSelectFilter={setStatusFilter}
        onOpenValueModal={() => setIsValueModalOpen(true)}
      />

      {readinessEvaluation && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-sm font-medium text-[#18181A]">
                {t('dashboard.risk_summary', 'Shipments at risk and readiness gate')}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[#B45309] text-xs font-medium">
                <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                <span>
                  {t(
                    'dashboard.flagged_count',
                    `${atRiskShipments.length} flagged for pre-dispatch review`,
                    { count: atRiskShipments.length }
                  )}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {shipments.slice(0, 3).map((shp) => {
                const inv = shp.containerInvoice.split('/')[0].trim();
                const isSelected = selectedShipmentForReadiness?.id === shp.id;
                const hasIssue = !shp.qaSigned || shp.cbamXmlStatus === 'PENDING_INPUTS';
                return (
                  <button
                    key={shp.id}
                    type="button"
                    onClick={() => setSelectedShipmentForReadiness(shp)}
                    className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-mono tabular-nums border transition-colors shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A] font-medium'
                        : 'bg-[#FCFBF8] text-[#55544E] border-[#18181A]/10 hover:text-[#18181A] hover:bg-[#EFECE5]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasIssue ? 'bg-[#D97706]' : 'bg-[#059669]'
                      }`}
                    />
                    <span>{inv}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <ReadinessGateCard
            evaluation={readinessEvaluation}
            releaseStatus={releaseStatusMap[selectedShipmentForReadiness?.id || ''] || 'DRAFT'}
            onRequestRelease={() => {
              if (selectedShipmentForReadiness) {
                setReleaseStatusMap((prev) => ({
                  ...prev,
                  [selectedShipmentForReadiness.id]: 'RELEASE_REQUESTED',
                }));
              }
            }}
            onApproveRelease={() => {
              if (selectedShipmentForReadiness) {
                setReleaseStatusMap((prev) => ({
                  ...prev,
                  [selectedShipmentForReadiness.id]: 'RELEASE_APPROVED',
                }));
              }
            }}
            onNavigateToField={(link) => {
              window.location.href = link;
            }}
            userRole="QA_INSPECTOR"
          />
        </section>
      )}

      <ShipmentsLedgerSection
        shipmentsCount={shipments.length}
        atRiskCount={atRiskShipments.length}
        filteredShipments={filteredShipments}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        activeFilterCount={activeFilterCount}
        density={density}
        onToggleDensity={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
        onOpenFilterSheet={() => setIsFilterSheetOpen(true)}
        onTriggerUpload={onTriggerUpload}
        onOpenShipmentDossier={onOpenShipmentDossier}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      />

      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Shipments"
        statusOptions={[
          { id: 'ALL', label: 'All Containers', count: shipments.length },
          {
            id: 'READY',
            label: 'Ready (CBAM Verified)',
            count: shipments.filter((s) => s.cbamXmlStatus === 'GENERATED_VALID' && s.qaSigned)
              .length,
          },
          { id: 'ACTION_REQUIRED', label: 'Action Required', count: atRiskShipments.length },
        ]}
        selectedStatus={statusFilter}
        onSelectStatus={(st) => {
          setStatusFilter(st as 'ALL' | 'READY' | 'ACTION_REQUIRED');
          setIsFilterSheetOpen(false);
        }}
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter('ALL');
          setSearchQuery('');
          setIsFilterSheetOpen(false);
        }}
      />

      <ValueScreenSettingsModal
        isOpen={isValueModalOpen}
        onClose={() => setIsValueModalOpen(false)}
        onParametersUpdated={fetchValueSummary}
      />
    </div>
  );
};
