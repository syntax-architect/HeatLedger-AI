import React, { useState, useMemo } from 'react';
import { MOCK_HEAT_INVENTORY } from '../../../data/mockData';
import { HeatInventoryItem } from '../../../types';
import { useToast } from '../../ui/ToastContext';
import { 
  Database, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  XCircle,
  Play
} from 'lucide-react';

export const HeatInventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<HeatInventoryItem[]>(MOCK_HEAT_INVENTORY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'LOW_BALANCE' | 'EXHAUSTED'>('ALL');
  
  // Interactive Anti-Phantom Sandbox State
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
    return inventory.filter(item => {
      const matchesSearch = 
        item.heatNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.supplierMill.toLowerCase().includes(search.toLowerCase()) ||
        item.grade.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [inventory, search, statusFilter]);

  const totalPurchased = inventory.reduce((acc, curr) => acc + curr.totalPurchasedMT, 0);
  const totalConsumed = inventory.reduce((acc, curr) => acc + curr.consumedExportMT, 0);
  const totalRemaining = totalPurchased - totalConsumed;

  const handleExecuteAllocationTest = () => {
    const targetItem = inventory.find(i => i.heatNumber === selectedHeatForTest);
    if (!targetItem) return;

    if (testTonnage <= 0) {
      toast.warning('Invalid Tonnage', 'Please enter a tonnage value greater than 0 MT.');
      return;
    }

    if (testTonnage <= targetItem.remainingMT) {
      // Approved: Deduct live from inventory
      const newRemaining = targetItem.remainingMT - testTonnage;
      const newConsumed = targetItem.consumedExportMT + testTonnage;
      const newStatus = newRemaining === 0 ? 'EXHAUSTED' : newRemaining < 10 ? 'LOW_BALANCE' : 'HEALTHY';

      setInventory(prev => prev.map(item => {
        if (item.heatNumber === selectedHeatForTest) {
          return {
            ...item,
            consumedExportMT: newConsumed,
            remainingMT: newRemaining,
            status: newStatus,
          };
        }
        return item;
      }));

      setSimulationResult({
        status: 'SUCCESS',
        message: `Mass-Balance Allocation Approved: Successfully allocated ${testTonnage} MT from Heat #${selectedHeatForTest}.`,
        detail: `New available balance is ${newRemaining.toFixed(1)} MT. Quota cryptographically logged to customs export manifest.`
      });

      toast.success('Allocation Verified', `Successfully allocated ${testTonnage} MT from Heat #${selectedHeatForTest}.`);
    } else {
      // Rejection: Trigger constraint failure
      const excess = (testTonnage - targetItem.remainingMT).toFixed(1);
      setSimulationResult({
        status: 'REJECTED',
        message: `PostgreSQL Constraint Check 23514 Rejection: Over-allocation blocked.`,
        detail: `Attempted to allocate ${testTonnage} MT, but only ${targetItem.remainingMT.toFixed(1)} MT remains on Heat #${selectedHeatForTest} (Deficit: ${excess} MT). In Excel, this phantom reuse would pass unnoticed and trigger retroactive EU penalties.`
      });

      toast.error('Anti-Phantom Rejection', `Requested ${testTonnage} MT exceeds available balance of ${targetItem.remainingMT.toFixed(1)} MT by ${excess} MT.`);
    }
  };

  const handleResetInventory = () => {
    setInventory(MOCK_HEAT_INVENTORY);
    setSimulationResult({ status: 'IDLE', message: '' });
    toast.info('Inventory Reset', 'Restored pristine initial heat balances.');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header & Mass Balance Metric Tiles */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              <span>Raw Material Heat Inventory Ledger (Mass Balance Tracker)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict mass-balance accounting preventing phantom heat number reuse during EU CBAM and TÜV Rheinland / SGS audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverAllocationDemo(!showOverAllocationDemo)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all shadow-sm ${
                showOverAllocationDemo
                  ? 'bg-amber-500 text-obsidian-900 border-amber-600'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>{showOverAllocationDemo ? 'Close Test Sandbox' : 'Test Anti-Phantom Engine'}</span>
            </button>

            <button
              onClick={handleResetInventory}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Reset inventory to initial state"
              aria-label="Reset inventory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Mass Balance Progress Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Total Steel Ingested (Verified 3.1)</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">{totalPurchased.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">SAIL, Tata Steel, JSW Primary Heats</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Allocated to Cleared Invoices</span>
            <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">{totalConsumed.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">{((totalConsumed / totalPurchased) * 100).toFixed(1)}% factory quota utilization</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Available Remaining Quota</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">{totalRemaining.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">Legally claimable for future EU containers</span>
          </div>
        </div>

        {/* Interactive Anti-Phantom Over-Allocation Sandbox */}
        {showOverAllocationDemo && (
          <div className="p-5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Interactive Anti-Phantom Allocation Sandbox</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Rule: consumed_mass_tonnes &lt;= purchased_mass_tonnes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* Select Target Heat */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Select Heat Batch:
                </label>
                <select
                  value={selectedHeatForTest}
                  onChange={(e) => {
                    setSelectedHeatForTest(e.target.value);
                    setSimulationResult({ status: 'IDLE', message: '' });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  {inventory.map(item => (
                    <option key={item.heatNumber} value={item.heatNumber}>
                      #{item.heatNumber} ({item.supplierMill.split(' ')[0]} - {item.remainingMT.toFixed(1)} MT left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tonnage Input & Quick Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-400">
                    Export Tonnage to Allocate:
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <button
                      onClick={() => setTestTonnage(10)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                    >
                      10 MT
                    </button>
                    <button
                      onClick={() => setTestTonnage(25)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                    >
                      25 MT
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={testTonnage}
                  onChange={(e) => setTestTonnage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Execute Action */}
              <div>
                <button
                  onClick={handleExecuteAllocationTest}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-900 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Allocation Check</span>
                </button>
              </div>
            </div>

            {/* Result Feedback Banner */}
            {simulationResult.status === 'SUCCESS' && (
              <div className="p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-2 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed font-mono">
                  {simulationResult.detail}
                </p>
              </div>
            )}

            {simulationResult.status === 'REJECTED' && (
              <div className="p-3.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-2 text-rose-400 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{simulationResult.message}</span>
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed font-sans">
                  {simulationResult.detail}
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        
        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Heat #, Mill, or Grade..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline-flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({inventory.length})
            </button>
            <button
              onClick={() => setStatusFilter('HEALTHY')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'HEALTHY'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Active Batches
            </button>
            <button
              onClick={() => setStatusFilter('LOW_BALANCE')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'LOW_BALANCE'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Low Quota
            </button>
            <button
              onClick={() => setStatusFilter('EXHAUSTED')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'EXHAUSTED'
                  ? 'bg-slate-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Exhausted
            </button>
          </div>
        </div>

        {/* Table or Empty State */}
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No heat lots found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No steel inventory matching "{search}" under the current filter selection.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Clear Search &amp; Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-mono text-[11px]">
                  <th className="py-3.5 px-6 font-medium">Heat Number</th>
                  <th className="py-3.5 px-6 font-medium">Supplier Mill</th>
                  <th className="py-3.5 px-6 font-medium">Standard Grade</th>
                  <th className="py-3.5 px-6 font-medium">Purchased</th>
                  <th className="py-3.5 px-6 font-medium">Consumed</th>
                  <th className="py-3.5 px-6 font-medium">Remaining Balance</th>
                  <th className="py-3.5 px-6 font-medium">Precursor SEE</th>
                  <th className="py-3.5 px-6 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredItems.map((item) => {
                  const percentUsed = (item.consumedExportMT / item.totalPurchasedMT) * 100;
                  return (
                    <tr key={item.heatNumber} className="hover:bg-slate-50/70 transition-colors">
                      
                      <td className="py-4 px-6 font-mono font-medium text-slate-900">
                        <div className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block text-xs font-semibold">
                          #{item.heatNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Cert: {item.certRef}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-900">
                        {item.supplierMill}
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-700">
                        {item.grade}
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-900 font-semibold">
                        {item.totalPurchasedMT.toFixed(1)} MT
                      </td>

                      <td className="py-4 px-6 font-mono text-amber-700 font-semibold">
                        {item.consumedExportMT.toFixed(1)} MT
                      </td>

                      <td className="py-4 px-6 font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.remainingMT === 0 ? 'text-slate-400' : 'text-emerald-700'}`}>
                            {item.remainingMT.toFixed(1)} MT
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                              className={`h-full ${item.remainingMT === 0 ? 'bg-slate-300' : 'bg-emerald-500'}`} 
                              style={{ width: `${Math.max(0, 100 - percentUsed)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-700 font-medium">
                        {item.precursorSee} tCO₂e/t
                      </td>

                      <td className="py-4 px-6 text-center font-mono">
                        {item.status === 'HEALTHY' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            ACTIVE BATCH
                          </span>
                        )}
                        {item.status === 'LOW_BALANCE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                            LOW QUOTA
                          </span>
                        )}
                        {item.status === 'EXHAUSTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            EXHAUSTED
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex justify-between text-xs font-mono text-slate-500">
          <span>Mass Balance Ledger cryptographically verified with upstream NABL lab stamps.</span>
          <span className="text-emerald-700 font-semibold">TÜV / SGS Ready</span>
        </div>

      </div>

    </div>
  );
};
