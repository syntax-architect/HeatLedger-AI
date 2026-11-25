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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] text-xs font-medium">
        Exhausted
      </span>
    );
  };

  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Crisp 3-Metric Mass-Balance Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4">
          <div className="text-xs font-medium text-[#55544E]">Total Received Mill Mass</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] leading-tight font-medium tracking-[-0.02em] font-mono tabular-nums text-[#18181A]">
              {totalPurchased.toFixed(1)}
            </span>
            <span className="text-xs text-[#55544E]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#55544E]">
            Across <span className="font-mono tabular-nums text-[#18181A]">{inventory.length}</span>{' '}
            verified mill heats
          </div>
        </div>

        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4">
          <div className="text-xs font-medium text-[#55544E]">Export Allocated &amp; Shipped</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] leading-tight font-medium tracking-[-0.02em] font-mono tabular-nums text-[#18181A]">
              {totalConsumed.toFixed(1)}
            </span>
            <span className="text-xs text-[#55544E]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#55544E]">
            <span className="font-mono tabular-nums text-[#18181A]">{utilizationPct}%</span> of
            certified intake allocated
          </div>
        </div>

        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4">
          <div className="text-xs font-medium text-[#55544E]">Available Remaining Balance</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[28px] leading-tight font-medium tracking-[-0.02em] font-mono tabular-nums text-[#047857]">
              {totalRemaining.toFixed(1)}
            </span>
            <span className="text-xs text-[#55544E]">MT</span>
          </div>
          <div className="mt-1.5 text-xs text-[#047857] font-medium">
            Zero over-allocation detected
          </div>
        </div>
      </div>

      {/* Aggregate Plant Mass Balance & Constraint Sandbox Card */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-medium text-[#18181A] tracking-[-0.01em]">
              Aggregate Plant Mass Balance Status
            </h2>
            <p className="text-xs text-[#55544E] mt-0.5">
              Strict conservation ledger preventing phantom heat number reuse during verifier audits
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOverAllocationDemo((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border transition-colors duration-150 cursor-pointer ${
                showOverAllocationDemo
                  ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                  : 'bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border-[#18181A]/12'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
              <span>{showOverAllocationDemo ? 'Hide Constraint Test' : 'Test Anti-Phantom Engine'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetInventory}
              className="w-9 h-9 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#55544E] hover:text-[#18181A] flex items-center justify-center transition-colors duration-150 cursor-pointer"
              title="Reset inventory to initial state"
              aria-label="Reset inventory"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
          <MassBalanceBar
            receivedKg={totalPurchased * 1000}
            shippedKg={totalConsumed * 1000}
            remainingKg={totalRemaining * 1000}
            unit="MT"
          />
        </div>

        {/* Collapsible Constraint Test Sandbox */}
        {showOverAllocationDemo && (
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#18181A]/10">
              <div className="flex items-center gap-2 text-xs font-medium text-[#18181A]">
                <ShieldAlert className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                <span>Interactive Anti-Phantom Allocation Sandbox</span>
              </div>
              <span className="text-xs font-mono text-[#55544E]">
                CHECK (consumed_mass &lt;= purchased_mass)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Target heat batch
                </label>
                <select
                  value={selectedHeatForTest}
                  onChange={(e) => {
                    setSelectedHeatForTest(e.target.value);
                    setSimulationResult({ status: 'IDLE', message: '' });
                  }}
                  className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
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
                  <label className="text-xs font-medium text-[#18181A]">
                    Allocation tonnage (MT)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTestTonnage(10)}
                      className="px-1.5 py-0.5 rounded bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-mono text-[#55544E] hover:text-[#18181A] cursor-pointer"
                    >
                      10 MT
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestTonnage(25)}
                      className="px-1.5 py-0.5 rounded bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-mono text-[#55544E] hover:text-[#18181A] cursor-pointer"
                    >
                      25 MT
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={testTonnage}
                  onChange={(e) => setTestTonnage(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <button
                type="button"
                onClick={handleExecuteAllocationTest}
                className="w-full h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
              >
                <Play className="w-4 h-4" strokeWidth={1.5} />
                <span>Execute Allocation Check</span>
              </button>
            </div>

            {simulationResult.status === 'SUCCESS' && (
              <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs space-y-1">
                <div className="font-medium flex items-center gap-1.5 text-[#047857]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[#55544E]">{simulationResult.detail}</p>
              </div>
            )}

            {simulationResult.status === 'REJECTED' && (
              <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs space-y-1">
                <div className="font-medium flex items-center gap-1.5 text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[#55544E] leading-relaxed">{simulationResult.detail}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dense Heat Inventory Ledger Table */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-[#18181A]/10">
          <h2 className="text-sm sm:text-base font-medium text-[#18181A] tracking-[-0.01em]">
            Raw Material Heat Inventory Ledger
          </h2>
        </div>
        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3 border-b border-[#18181A]/10 bg-[#F7F5F0] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#55544E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search heat number, mill, grade, cert ref..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#55544E] hover:text-[#18181A] cursor-pointer"
                aria-label="Clear search"
              >
                <XCircle className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
            >
              <Filter className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#059669] text-white font-mono text-xs leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 text-xs">
              {(['ALL', 'HEALTHY', 'LOW_BALANCE', 'EXHAUSTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#FCFBF8] text-[#18181A] font-medium border border-[#18181A]/10'
                      : 'text-[#55544E] hover:text-[#18181A]'
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
              className="hidden md:inline-flex items-center h-9 px-3 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 cursor-pointer transition-colors duration-150"
            >
              {density === 'comfortable' ? 'Compact rows' : 'Comfortable rows'}
            </button>
          </div>
        </div>

        {/* Empty State / Mobile Cards / Desktop Table */}
        {filteredItems.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Search className="w-5 h-5 text-[#55544E]" strokeWidth={1.5} />}
              title="No matching heat batches"
              description={`No raw material heat lot matched "${search}".`}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
                >
                  Reset filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="md:hidden divide-y divide-[#18181A]/10">
              {filteredItems.map((item) => (
                <div
                  key={item.heatNumber}
                  onClick={() => setSelectedHeatForDetail(item)}
                  className="p-4 hover:bg-[#F7F5F0] transition-colors duration-150 cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium">
                      #{item.heatNumber}
                    </span>
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[#55544E] block">Supplier Mill</span>
                      <span className="font-medium text-[#18181A] truncate block mt-0.5">
                        {item.supplierMill}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#55544E] block">Grade &amp; Precursor</span>
                      <span className="font-mono tabular-nums text-[#18181A] truncate block mt-0.5">
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

                  <div className="flex items-center justify-between text-xs pt-1 text-[#55544E]">
                    <span className="font-mono tabular-nums">{item.certRef}</span>
                    <span className="inline-flex items-center gap-0.5 text-[#047857] font-medium">
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Ledger Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
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
                <tbody className="divide-y divide-[#18181A]/10">
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
                        className="hover:bg-[#F7F5F0] transition-colors duration-150 cursor-pointer"
                      >
                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} whitespace-nowrap`}>
                          <span className="inline-block px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums font-medium">
                            #{item.heatNumber}
                          </span>
                          <div className="font-mono tabular-nums text-xs text-[#55544E] mt-0.5">
                            {item.certRef}
                          </div>
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-medium text-[#18181A]`}>
                          {item.supplierMill}
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-mono text-[#55544E] whitespace-nowrap`}>
                          {item.grade}
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'}`}>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                              <span className="text-[#55544E]">
                                {item.consumedExportMT.toFixed(1)} / {item.totalPurchasedMT.toFixed(1)} MT
                              </span>
                              <span
                                className={`font-medium ${
                                  item.remainingMT === 0 ? 'text-[#55544E]' : 'text-[#047857]'
                                }`}
                              >
                                {item.remainingMT.toFixed(1)} MT left
                              </span>
                            </div>
                            <div
                              className="h-2 w-full rounded bg-[#EFECE5] border border-[#18181A]/10 overflow-hidden flex"
                              title={`Shipped: ${item.consumedExportMT.toFixed(1)} MT · Available: ${item.remainingMT.toFixed(1)} MT`}
                            >
                              <div
                                className="bg-[#55544E] h-full"
                                style={{ width: `${consumedPct}%` }}
                              />
                              <div
                                className="bg-[#059669] h-full"
                                style={{ width: `${remainingPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className={`${density === 'compact' ? 'py-2.5 px-4' : 'py-3.5 px-5'} font-mono tabular-nums text-[#18181A] whitespace-nowrap`}>
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
        <div className="px-5 py-3 bg-[#F7F5F0] border-t border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#55544E]">
          <span>Mass-balance ledger protected with tamper-evident SHA-256 digests.</span>
          <span className="text-[#047857] font-medium">Conservation constraint active</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-md w-full p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium">
                  #{selectedHeatForDetail.heatNumber}
                </span>
                {renderStatusBadge(selectedHeatForDetail.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedHeatForDetail(null)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close detail modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="divide-y divide-[#18181A]/10 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-[#55544E]">Supplier Mill</span>
                <span className="font-medium text-[#18181A]">
                  {selectedHeatForDetail.supplierMill}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#55544E]">Certificate Reference</span>
                <span className="font-mono tabular-nums text-[#18181A]">
                  {selectedHeatForDetail.certRef}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#55544E]">Steel Grade</span>
                <span className="font-mono text-[#18181A]">{selectedHeatForDetail.grade}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#55544E]">Precursor Emissions</span>
                <span className="font-mono tabular-nums font-medium text-[#18181A]">
                  {selectedHeatForDetail.precursorSee} tCO₂e/t
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
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
                className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium cursor-pointer transition-colors duration-150"
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
