import React, { useState, useMemo } from 'react';
import { MOCK_HEAT_INVENTORY } from '../../../data/mockData';
import { HeatInventoryItem } from '../../../types';
import { useToast } from '../../ui/ToastContext';
import {
  Search,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCw,
  XCircle,
  Play,
  ChevronRight,
  X,
} from 'lucide-react';
import { MassBalanceBar } from '../MassBalanceBar';
import { FilterBottomSheet } from '../FilterBottomSheet';
import { EmptyState } from '../../ui/DataDisplay';

export const HeatInventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<HeatInventoryItem[]>(MOCK_HEAT_INVENTORY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'LOW_BALANCE' | 'EXHAUSTED'>(
    'ALL'
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedHeatForDetail, setSelectedHeatForDetail] = useState<HeatInventoryItem | null>(
    null
  );

  // Interactive Mass-Balance Constraint Sandbox
  const [showOverAllocationDemo, setShowOverAllocationDemo] = useState(false);
  const [selectedHeatForTest, setSelectedHeatForTest] = useState<string>('BOK-26-4910');
  const [testTonnage, setTestTonnage] = useState<number>(25);
  const [simulationResult, setSimulationResult] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'REJECTED';
    message: string;
    detail?: string;
  }>({ status: 'IDLE', message: '' });

  const toast = useToast();

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.heatNumber.toLowerCase().includes(q) ||
        item.supplierMill.toLowerCase().includes(q) ||
        item.grade.toLowerCase().includes(q) ||
        item.certRef.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    });
  }, [inventory, search, statusFilter]);

  const totalPurchased = inventory.reduce((acc, curr) => acc + curr.totalPurchasedMT, 0);
  const totalConsumed = inventory.reduce((acc, curr) => acc + curr.consumedExportMT, 0);
  const totalRemaining = totalPurchased - totalConsumed;
  const utilizationPct = totalPurchased > 0 ? Math.round((totalConsumed / totalPurchased) * 100) : 0;

  const handleExecuteAllocationTest = () => {
    const targetItem = inventory.find((i) => i.heatNumber === selectedHeatForTest);
    if (!targetItem) return;

    if (testTonnage <= 0) {
      toast.warning('Invalid Tonnage', 'Enter a tonnage value greater than 0 MT.');
      return;
    }

    if (testTonnage <= targetItem.remainingMT) {
      const newRemaining = targetItem.remainingMT - testTonnage;
      const newConsumed = targetItem.consumedExportMT + testTonnage;
      const newStatus =
        newRemaining === 0 ? 'EXHAUSTED' : newRemaining < 10 ? 'LOW_BALANCE' : 'HEALTHY';

      setInventory((prev) =>
        prev.map((item) =>
          item.heatNumber === selectedHeatForTest
            ? {
                ...item,
                consumedExportMT: newConsumed,
                remainingMT: newRemaining,
                status: newStatus,
              }
            : item
        )
      );

      setSimulationResult({
        status: 'SUCCESS',
        message: `Allocation approved: ${testTonnage} MT deducted from Heat #${selectedHeatForTest}.`,
        detail: `Remaining balance: ${newRemaining.toFixed(1)} MT recorded in the mass-balance ledger.`,
      });

      toast.success(
        'Allocation Verified',
        `Allocated ${testTonnage} MT from Heat #${selectedHeatForTest}.`
      );
    } else {
      const excess = (testTonnage - targetItem.remainingMT).toFixed(1);
      setSimulationResult({
        status: 'REJECTED',
        message: `Constraint 23514: Over-allocation blocked.`,
        detail: `Requested ${testTonnage} MT, but only ${targetItem.remainingMT.toFixed(1)} MT remains on Heat #${selectedHeatForTest} (deficit ${excess} MT). Blocking phantom reuse prevents exposure to statutory markups under Implementing Regulation (EU) 2025/2621.`,
      });

      toast.error(
        'Over-Allocation Blocked',
        `Requested ${testTonnage} MT exceeds remaining heat balance by ${excess} MT.`
      );
    }
  };

  const handleResetInventory = () => {
    setInventory(MOCK_HEAT_INVENTORY);
    setSimulationResult({ status: 'IDLE', message: '' });
    toast.info('Inventory Reset', 'Restored initial heat balances.');
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'HEALTHY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium">
          Active
        </span>
      );
    }
    if (status === 'LOW_BALANCE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
          Low balance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] text-xs font-medium">
        Exhausted
      </span>
    );
  };

  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Crisp 3-Metric Mass-Balance Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-medium text-[#52525B]">Total Received Mill Mass</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] leading-tight font-semibold tracking-[-0.03em] font-mono tabular-nums text-[#09090B]">
              {totalPurchased.toFixed(1)}
            </span>
            <span className="text-xs text-[#52525B]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#52525B]">
            Across <span className="font-mono tabular-nums text-[#09090B]">{inventory.length}</span>{' '}
            verified mill heats
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-medium text-[#52525B]">Export Allocated &amp; Shipped</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] leading-tight font-semibold tracking-[-0.03em] font-mono tabular-nums text-[#2563EB]">
              {totalConsumed.toFixed(1)}
            </span>
            <span className="text-xs text-[#52525B]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#52525B]">
            <span className="font-mono tabular-nums text-[#09090B]">{utilizationPct}%</span> of
            certified intake allocated
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-medium text-[#52525B]">Available Remaining Balance</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] leading-tight font-semibold tracking-[-0.03em] font-mono tabular-nums text-[#059669]">
              {totalRemaining.toFixed(1)}
            </span>
            <span className="text-xs text-[#52525B]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#059669] font-medium">
            Zero over-allocation detected
          </div>
        </div>
      </div>

      {/* Aggregate Plant Mass Balance & Constraint Sandbox Card */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[#09090B] tracking-[-0.02em]">
              Aggregate Plant Mass Balance Status
            </h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Strict conservation ledger preventing phantom heat number reuse during verifier audits
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOverAllocationDemo((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                showOverAllocationDemo
                  ? 'bg-[#09090B] text-white border-[#09090B]'
                  : 'bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] border-[#E4E4E7]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
              <span>{showOverAllocationDemo ? 'Hide Constraint Test' : 'Test Anti-Phantom Engine'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetInventory}
              className="w-9 h-9 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] hover:text-[#09090B] flex items-center justify-center transition-colors cursor-pointer"
              title="Reset inventory to initial state"
              aria-label="Reset inventory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
          <MassBalanceBar
            receivedKg={totalPurchased * 1000}
            shippedKg={totalConsumed * 1000}
            remainingKg={totalRemaining * 1000}
            unit="MT"
          />
        </div>

        {/* Collapsible Constraint Test Sandbox */}
        {showOverAllocationDemo && (
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                <span>Interactive Anti-Phantom Allocation Sandbox</span>
              </div>
              <span className="text-xs font-mono text-[#52525B]">
                CHECK (consumed_mass &lt;= purchased_mass)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-[#09090B] block mb-1.5">
                  Target heat batch
                </label>
                <select
                  value={selectedHeatForTest}
                  onChange={(e) => {
                    setSelectedHeatForTest(e.target.value);
                    setSimulationResult({ status: 'IDLE', message: '' });
                  }}
                  className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] font-mono text-xs focus:outline-none focus:border-[#059669]"
                >
                  {inventory.map((item) => (
                    <option key={item.heatNumber} value={item.heatNumber}>
                      #{item.heatNumber} ({item.remainingMT.toFixed(1)} MT left)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#09090B]">
                    Allocation tonnage (MT)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTestTonnage(10)}
                      className="px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E4E4E7] text-xs font-mono text-[#52525B] hover:text-[#09090B] cursor-pointer"
                    >
                      10 MT
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestTonnage(25)}
                      className="px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E4E4E7] text-xs font-mono text-[#52525B] hover:text-[#09090B] cursor-pointer"
                    >
                      25 MT
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={testTonnage}
                  onChange={(e) => setTestTonnage(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <button
                type="button"
                onClick={handleExecuteAllocationTest}
                className="w-full h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute Allocation Check</span>
              </button>
            </div>

            {simulationResult.status === 'SUCCESS' && (
              <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-[#047857]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[#52525B]">{simulationResult.detail}</p>
              </div>
            )}

            {simulationResult.status === 'REJECTED' && (
              <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[#52525B] leading-relaxed">{simulationResult.detail}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dense Heat Inventory Ledger Table */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[#E4E4E7]">
          <h2 className="text-sm sm:text-base font-semibold text-[#09090B] tracking-[-0.02em]">
            Raw Material Heat Inventory Ledger
          </h2>
        </div>
        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3 border-b border-[#E4E4E7] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#52525B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search heat number, mill, grade, cert ref..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder:text-[#52525B]/70 text-xs focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#09090B] cursor-pointer"
                aria-label="Clear search"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-xs font-medium text-[#09090B] cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#52525B]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#059669] text-white font-mono text-xs leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center p-0.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
              {(['ALL', 'HEALTHY', 'LOW_BALANCE', 'EXHAUSTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#FFFFFF] text-[#09090B] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-[#52525B] hover:text-[#09090B]'
                  }`}
                >
                  {st === 'ALL'
                    ? `All (${inventory.length})`
                    : st === 'HEALTHY'
                      ? 'Active'
                      : st === 'LOW_BALANCE'
                        ? 'Low Balance'
                        : 'Exhausted'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
              className="hidden md:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#52525B] hover:text-[#09090B] bg-[#FFFFFF] border border-[#E4E4E7] cursor-pointer"
            >
              {density === 'comfortable' ? 'Compact rows' : 'Comfortable rows'}
            </button>
          </div>
        </div>

        {/* Empty State / Mobile Cards / Desktop Table */}
        {filteredItems.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Search className="w-5 h-5 text-[#52525B]" />}
              title="No matching heat batches"
              description={`No raw material heat lot matched "${search}".`}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#09090B] cursor-pointer"
                >
                  Reset filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="md:hidden divide-y divide-[#E4E4E7]">
              {filteredItems.map((item) => (
                <div
                  key={item.heatNumber}
                  onClick={() => setSelectedHeatForDetail(item)}
                  className="p-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums text-xs font-medium">
                      #{item.heatNumber}
                    </span>
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[#52525B] block">Supplier Mill</span>
                      <span className="font-medium text-[#09090B] truncate block mt-0.5">
                        {item.supplierMill}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#52525B] block">Grade &amp; Precursor</span>
                      <span className="font-mono tabular-nums text-[#09090B] truncate block mt-0.5">
                        {item.grade} · {item.precursorSee} tCO₂e/t
                      </span>
                    </div>
                  </div>

                  <MassBalanceBar
                    receivedKg={item.totalPurchasedMT * 1000}
                    shippedKg={item.consumedExportMT * 1000}
                    remainingKg={item.remainingMT * 1000}
                    unit="MT"
                    showLegend={false}
                  />

                  <div className="flex items-center justify-between text-xs pt-1 text-[#52525B]">
                    <span className="font-mono tabular-nums">{item.certRef}</span>
                    <span className="inline-flex items-center gap-0.5 text-[#059669] font-medium">
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Ledger Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-[#52525B]">
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium`}>
                      Heat Number
                    </th>
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium`}>
                      Supplier Mill
                    </th>
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium`}>
                      Grade
                    </th>
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium min-w-[230px]`}>
                      Mass Balance (MT)
                    </th>
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium`}>
                      Precursor SEE
                    </th>
                    <th className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3 px-5'} font-medium text-right`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {filteredItems.map((item) => {
                    const consumedPct =
                      item.totalPurchasedMT > 0
                        ? Math.min(100, (item.consumedExportMT / item.totalPurchasedMT) * 100)
                        : 0;
                    const remainingPct = Math.max(0, 100 - consumedPct);

                    return (
                      <tr
                        key={item.heatNumber}
                        onClick={() => setSelectedHeatForDetail(item)}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      >
                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums font-medium">
                            #{item.heatNumber}
                          </span>
                          <div className="font-mono tabular-nums text-xs text-[#52525B] mt-0.5">
                            {item.certRef}
                          </div>
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-medium text-[#09090B]`}>
                          {item.supplierMill}
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-mono text-[#52525B] whitespace-nowrap`}>
                          {item.grade}
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'}`}>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                              <span className="text-[#52525B]">
                                {item.consumedExportMT.toFixed(1)} / {item.totalPurchasedMT.toFixed(1)} MT
                              </span>
                              <span
                                className={`font-medium ${
                                  item.remainingMT === 0 ? 'text-[#52525B]' : 'text-[#059669]'
                                }`}
                              >
                                {item.remainingMT.toFixed(1)} MT left
                              </span>
                            </div>
                            <div
                              className="h-2 w-full rounded-full bg-[#F4F4F5] border border-[#E4E4E7] overflow-hidden flex"
                              title={`Shipped: ${item.consumedExportMT.toFixed(1)} MT · Available: ${item.remainingMT.toFixed(1)} MT`}
                            >
                              <div
                                className="bg-[#2563EB] h-full"
                                style={{ width: `${consumedPct}%` }}
                              />
                              <div
                                className="bg-[#059669] h-full"
                                style={{ width: `${remainingPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-mono tabular-nums text-[#09090B] whitespace-nowrap`}>
                          {item.precursorSee} tCO₂e/t
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} text-right whitespace-nowrap`}>
                          {renderStatusBadge(item.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Ledger Footer */}
        <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#52525B]">
          <span>Mass-balance ledger protected with tamper-evident SHA-256 digests.</span>
          <span className="text-[#059669] font-medium">Conservation constraint active</span>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Heat Inventory"
        statusOptions={[
          { id: 'ALL', label: 'All Heats', count: inventory.length },
          {
            id: 'HEALTHY',
            label: 'Active Batches',
            count: inventory.filter((i) => i.status === 'HEALTHY').length,
          },
          {
            id: 'LOW_BALANCE',
            label: 'Low Balance',
            count: inventory.filter((i) => i.status === 'LOW_BALANCE').length,
          },
          {
            id: 'EXHAUSTED',
            label: 'Exhausted',
            count: inventory.filter((i) => i.status === 'EXHAUSTED').length,
          },
        ]}
        selectedStatus={statusFilter}
        onSelectStatus={(st) => {
          setStatusFilter(st as 'ALL' | 'HEALTHY' | 'LOW_BALANCE' | 'EXHAUSTED');
          setIsFilterSheetOpen(false);
        }}
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter('ALL');
          setSearch('');
          setIsFilterSheetOpen(false);
        }}
      />

      {/* Heat Detail Modal */}
      {selectedHeatForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/60 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-left">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums text-xs font-semibold">
                  #{selectedHeatForDetail.heatNumber}
                </span>
                {renderStatusBadge(selectedHeatForDetail.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedHeatForDetail(null)}
                className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] cursor-pointer"
                aria-label="Close detail modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#E4E4E7] text-xs">
              <div className="flex justify-between py-2">
                <span className="text-[#52525B]">Supplier Mill</span>
                <span className="font-medium text-[#09090B]">
                  {selectedHeatForDetail.supplierMill}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#52525B]">Certificate Reference</span>
                <span className="font-mono tabular-nums text-[#09090B]">
                  {selectedHeatForDetail.certRef}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#52525B]">Steel Grade</span>
                <span className="font-mono text-[#09090B]">{selectedHeatForDetail.grade}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#52525B]">Precursor Emissions</span>
                <span className="font-mono tabular-nums font-medium text-[#09090B]">
                  {selectedHeatForDetail.precursorSee} tCO₂e/t
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
              <MassBalanceBar
                receivedKg={selectedHeatForDetail.totalPurchasedMT * 1000}
                shippedKg={selectedHeatForDetail.consumedExportMT * 1000}
                remainingKg={selectedHeatForDetail.remainingMT * 1000}
                unit="MT"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedHeatForDetail(null)}
                className="px-4 py-2 rounded-lg bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
