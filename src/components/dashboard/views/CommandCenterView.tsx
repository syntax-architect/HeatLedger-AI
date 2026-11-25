import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MOCK_SHIPMENTS } from '../../../data/mockData';
import { ShipmentRecord, ReadinessEvaluation } from '../../../types';
import {
  Upload,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  Search,
  Filter,
  XCircle,
  AlertOctagon,
  AlertTriangle,
  Calculator,
  Download,
  Clock,
} from 'lucide-react';
import { FilterBottomSheet } from '../FilterBottomSheet';
import { EmptyState } from '../../ui/DataDisplay';
import { ReadinessGateCard } from '../../readiness/ReadinessGateCard';
import { AnimatedNumber } from '../../effects/AnimatedNumber';
import { ValueScreenSettingsModal } from '../ValueScreenSettingsModal';

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
  onNavigateToWorkbench,
  onNavigateToInventory,
  onNavigateToSignOff,
  onTriggerUpload,
  pendingSignOffCount = 3,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'ACTION_REQUIRED'>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedShipmentForReadiness, setSelectedShipmentForReadiness] =
    useState<ShipmentRecord | null>(
      MOCK_SHIPMENTS.find((s) => s.id === 'shp-102') || MOCK_SHIPMENTS[0]
    );
  const [releaseStatusMap, setReleaseStatusMap] = useState<Record<string, string>>({});
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [valueSummary, setValueSummary] = useState<any>(null);

  const fetchValueSummary = () => {
    fetch('/api/value-screen/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setValueSummary(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchValueSummary();
  }, []);

  const atRiskShipments = useMemo(() => {
    return MOCK_SHIPMENTS.filter(
      (s) =>
        !s.qaSigned ||
        s.cbamXmlStatus === 'PENDING_INPUTS' ||
        s.meltAndPourStatus === 'UNVERIFIED_DEFECT' ||
        s.metallurgyStatus === 'OFF_SPEC_ALERT'
    );
  }, []);

  const readinessEvaluation: ReadinessEvaluation | null = useMemo(() => {
    if (!selectedShipmentForReadiness) return null;
    const isMeltDefect = selectedShipmentForReadiness.meltAndPourStatus === 'UNVERIFIED_DEFECT';
    const isOffSpec = selectedShipmentForReadiness.metallurgyStatus === 'OFF_SPEC_ALERT';
    const isUnsigned = !selectedShipmentForReadiness.qaSigned;
    const isCbamMissing = selectedShipmentForReadiness.cbamXmlStatus === 'PENDING_INPUTS';

    let score = 100;
    if (isMeltDefect) score -= 25;
    if (isOffSpec) score -= 15;
    if (isUnsigned) score -= 10;
    if (isCbamMissing) score -= 10;

    const blockingFails = (isMeltDefect ? 1 : 0) + (isOffSpec ? 1 : 0) + (isUnsigned ? 1 : 0);
    const warningFails = isCbamMissing ? 1 : 0;
    const status = blockingFails > 0 ? 'BLOCKED' : warningFails > 0 ? 'FIX_NEEDED' : 'READY';

    return {
      shipment_id: selectedShipmentForReadiness.containerInvoice.split('/')[0].trim(),
      score: Math.max(0, score),
      status,
      can_release: blockingFails === 0,
      blocking_failures: blockingFails,
      warning_failures: warningFails,
      total_rules: 9,
      checks: [
        {
          rule_id: 'RULE_MELT_POUR',
          name: 'Melt-and-Pour Country of Origin Attestation',
          severity: 'BLOCK',
          passed: !isMeltDefect,
          message: !isMeltDefect
            ? 'Melt-and-Pour origin verified (India [IN])'
            : 'Missing verified Melt-and-Pour country on upstream certificate.',
          fix_hint: 'Confirm melt country in MTC Workbench.',
          field_link: `/app?view=mtc-workbench&preset=sail&field=country_of_melt`,
        },
        {
          rule_id: 'RULE_CERT_TYPE',
          name: 'EN 10204 3.1 / 3.2 Certificate Type',
          severity: 'BLOCK',
          passed: true,
          message: 'Inspection certificate conforms to EN 10204:2004 Type 3.1.',
          fix_hint: 'Upload unaltered 3.1 mill certificate from steel producer.',
          field_link: `/app?view=mtc-workbench&preset=sail&field=compliance_mode`,
        },
        {
          rule_id: 'RULE_HEAT_UNIQUE',
          name: 'Heat Number Provenance & Uniqueness',
          severity: 'BLOCK',
          passed: true,
          message: `${selectedShipmentForReadiness.linkedHeatNumbers.length} linked heats verified against mill lots.`,
          fix_hint: 'Link verified heat numbers in Heat Inventory.',
          field_link: `/app?view=heat-inventory`,
        },
        {
          rule_id: 'RULE_CHEMISTRY_SPEC',
          name: 'Spectrometric Chemistry In-Spec',
          severity: 'BLOCK',
          passed: !isOffSpec,
          message: !isOffSpec
            ? 'All ladle elements conform to target grade limits.'
            : 'Chemistry contains out-of-spec elements.',
          fix_hint: 'Review highlighted chemical values in MTC Workbench.',
          field_link: `/app?view=mtc-workbench&preset=sail&field=chemistry`,
        },
        {
          rule_id: 'RULE_MASS_BALANCE',
          name: 'Ledger Mass Balance Reconciliation',
          severity: 'BLOCK',
          passed: true,
          message: 'Shipped weight reconciled in raw material heat ledger.',
          fix_hint: 'Adjust shipment allocation in Heat Inventory.',
          field_link: `/app?view=heat-inventory`,
        },
        {
          rule_id: 'RULE_ORIGINAL_HASHED',
          name: 'Byte-Identical Upstream PDF SHA-256 Digest',
          severity: 'BLOCK',
          passed: true,
          message: 'Unaltered upstream mill PDF preserved with tamper-evident SHA-256.',
          fix_hint: 'Attach original mill PDF in MTC Workbench.',
          field_link: `/app?view=mtc-workbench&preset=sail&field=document`,
        },
        {
          rule_id: 'RULE_EXPORTER_SIGNED',
          name: 'QA Inspector Digital Signature',
          severity: 'BLOCK',
          passed: !isUnsigned,
          message: !isUnsigned
            ? 'Digitally Signed (Ed25519) by authorized QA representative.'
            : 'Unsigned draft: authorized QA inspector signature required.',
          fix_hint: 'Review and apply digital signature in Clause 6 Sign-Off.',
          field_link: `/app?view=sign-off-queue`,
        },
        {
          rule_id: 'RULE_CBAM_DATA',
          name: 'CBAM Specific Embedded Emissions Data',
          severity: 'WARN',
          passed: !isCbamMissing,
          message: !isCbamMissing
            ? `Calculated Specific Emissions: ${selectedShipmentForReadiness.specificEmissions} tCO2e/t`
            : 'CBAM calculation pending: shipment exposed to statutory default markups under EU 2025/2621.',
          fix_hint: 'Compute actual embedded emissions in Customs Dossier.',
          field_link: `/app?view=cbam-dossier`,
        },
        {
          rule_id: 'RULE_INVOICE_TOLERANCE',
          name: 'Invoice vs Linked Heat Weight Tolerance (±5%)',
          severity: 'WARN',
          passed: true,
          message: `Container weight (${selectedShipmentForReadiness.netTonnage} MT) matches heat allocation.`,
          fix_hint: 'Verify container net export payload.',
          field_link: `/app?view=heat-inventory`,
        },
      ],
    };
  }, [selectedShipmentForReadiness]);

  const filteredShipments = useMemo(() => {
    return MOCK_SHIPMENTS.filter((shipment) => {
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
    });
  }, [searchQuery, statusFilter]);

  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Value Screen Header Bar & Time Saved Counter */}
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
            onClick={() => setIsValueModalOpen(true)}
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

      {/* 4-KPI Value Strip: Month, Ready, Blocked, Money at Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Shipments This Month */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.0, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            setStatusFilter('ALL');
            document.getElementById('shipments-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
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

        {/* KPI 2: Shipments Ready */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            setStatusFilter('READY');
            document.getElementById('shipments-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 hover:border-[#18181A]/25 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#55544E]">
            <span className="font-medium">
              {t('dashboard.kpis.heats', 'Verified Precursors')}
            </span>
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

        {/* KPI 3: Shipments Blocked */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            setStatusFilter('ACTION_REQUIRED');
            document.getElementById('shipments-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
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

        {/* KPI 4: Money at Risk (no amber-orange gradient wash) */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setIsValueModalOpen(true)}
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

      {/* Shipments At Risk Readiness Strip */}
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
                  {t('dashboard.flagged_count', `${atRiskShipments.length} flagged for pre-dispatch review`, {
                    count: atRiskShipments.length,
                  })}
                </span>
              </span>
            </div>

            {/* Shipment Quick Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {MOCK_SHIPMENTS.slice(0, 3).map((shp) => {
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

      {/* Container Dispatch & Export Compliance Table Card */}
      <section
        id="shipments-table"
        className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden"
      >
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-[#18181A]/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-medium text-[#18181A]">
              {t('dashboard.shipments_ledger', 'Container Dispatch & Export Compliance Ledger')}
            </h2>
            <p className="text-xs text-[#55544E] mt-0.5">
              {t('dashboard.shipments_sub', 'Commercial export invoices, linked upstream mill heats, and EU/UK customs readiness')}
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

        {/* Search, Filter Controls & Density */}
        <div className="px-5 py-3 border-b border-[#18181A]/[0.08] bg-[#F7F5F0] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search_placeholder', 'Search container, invoice, buyer, port, CN code, heat...')}
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78766E] hover:text-[#18181A] cursor-pointer"
                aria-label="Clear search"
              >
                <XCircle className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Filter Trigger */}
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
            >
              <Filter className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span>{t('common.filters', 'Filters')}</span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs text-[#047857]">{activeFilterCount}</span>
              )}
            </button>

            {/* Desktop Segmented Filter */}
            <div className="hidden md:flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/[0.08] text-xs">
              {(
                [
                  { id: 'ALL', label: `${t('common.all', 'All')} (${MOCK_SHIPMENTS.length})`, activeCls: 'text-[#18181A]' },
                  { id: 'READY', label: t('common.ready', 'Ready'), activeCls: 'text-[#047857]' },
                  {
                    id: 'ACTION_REQUIRED',
                    label: `${t('common.action_required', 'Action Required')} (${atRiskShipments.length})`,
                    activeCls: 'text-[#DC2626]',
                  },
                ] as const
              ).map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
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

            {/* Density Toggle */}
            <button
              type="button"
              onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
              className="hidden md:inline-flex items-center h-9 px-3 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] bg-[#FCFBF8] border border-[#18181A]/10 transition-colors cursor-pointer"
              title="Toggle Table Density"
            >
              {density === 'comfortable' ? 'Compact rows' : 'Comfortable rows'}
            </button>
          </div>
        </div>

        {/* Empty State / Mobile Cards / Desktop Table */}
        {filteredShipments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Search className="w-5 h-5 text-[#78766E]" strokeWidth={1.5} />}
              title="No shipments found"
              description={`No export container matched "${searchQuery}" under the selected filter.`}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
                >
                  Reset filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
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

            {/* Desktop Data Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F5F0] border-b border-[#18181A]/[0.08] text-[#78766E] sticky top-0 z-10">
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      Invoice &amp; weight
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      Customer &amp; port
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      CN code
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      Linked heats
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      Metallurgy
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      Melt &amp; pour
                    </th>
                    <th
                      className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium whitespace-nowrap`}
                    >
                      CBAM status
                    </th>
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
                    const containerRef = shipment.containerInvoice.split('/')[1]?.trim() || '20ft FCL';
                    const isOffSpec = shipment.metallurgyStatus === 'OFF_SPEC_ALERT';
                    const isMeltDefect = shipment.meltAndPourStatus === 'UNVERIFIED_DEFECT';

                    return (
                      <tr
                        key={shipment.id}
                        className="hover:bg-[#F7F5F0]/70 transition-colors"
                      >
                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
                          <div className="font-mono tabular-nums font-medium text-[#18181A]">
                            {invoiceNo}
                          </div>
                          <div className="text-xs text-[#55544E] mt-0.5">
                            <span>{containerRef}</span>
                            <span className="mx-1.5 text-[#18181A]/20">·</span>
                            <span className="font-mono tabular-nums">{shipment.netTonnage} MT</span>
                          </div>
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'}`}>
                          <div className="font-medium text-[#18181A]">{shipment.buyerName}</div>
                          <div className="text-xs text-[#55544E] mt-0.5">
                            {shipment.destinationPort}
                          </div>
                        </td>

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
                          <span className="inline-block px-2 py-0.5 rounded font-mono tabular-nums text-xs bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/10">
                            {shipment.cnCode}
                          </span>
                        </td>

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
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

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
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

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
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

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}
                        >
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

                        <td
                          className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} text-right whitespace-nowrap`}
                        >
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

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Shipments"
        statusOptions={[
          { id: 'ALL', label: 'All Containers', count: MOCK_SHIPMENTS.length },
          {
            id: 'READY',
            label: 'Ready (CBAM Verified)',
            count: MOCK_SHIPMENTS.filter((s) => s.cbamXmlStatus === 'GENERATED_VALID' && s.qaSigned)
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

      {/* Value Screen Formula & Risk Parameters Settings Modal (Prompt C6) */}
      <ValueScreenSettingsModal
        isOpen={isValueModalOpen}
        onClose={() => setIsValueModalOpen(false)}
        onParametersUpdated={fetchValueSummary}
      />
    </div>
  );
};
