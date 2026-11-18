import React, { useState } from 'react';
import { MOCK_HEAT_INVENTORY } from '../../../data/mockData';
import { HeatInventoryItem } from '../../../types';
import { 
  Database, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const HeatInventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<HeatInventoryItem[]>(MOCK_HEAT_INVENTORY);
  const [search, setSearch] = useState('');
  const [showOverAllocationDemo, setShowOverAllocationDemo] = useState(false);
  const [demoAttemptedMT, setDemoAttemptedMT] = useState(25);

  const filteredItems = inventory.filter(item => 
    item.heatNumber.toLowerCase().includes(search.toLowerCase()) ||
    item.supplierMill.toLowerCase().includes(search.toLowerCase()) ||
    item.grade.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchased = inventory.reduce((acc, curr) => acc + curr.totalPurchasedMT, 0);
  const totalConsumed = inventory.reduce((acc, curr) => acc + curr.consumedExportMT, 0);
  const totalRemaining = totalPurchased - totalConsumed;

  return (
    <div className="space-y-6">
      
      {/* Header & Mass Balance Metric Tiles */}
      <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              <span>Raw Material Heat Inventory Ledger (Mass Balance Tracker)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict mass-balance accounting preventing "phantom heat number reuse" during EU CBAM and TÜV Rheinland / SGS audits.
            </p>
          </div>

          <button
            onClick={() => setShowOverAllocationDemo(!showOverAllocationDemo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-mono font-bold border border-amber-300 transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Test Anti-Phantom Allocation Engine</span>
          </button>
        </div>

        {/* 3 Mass Balance Progress Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Total Steel Ingested (Verified 3.1)</span>
            <span className="text-2xl font-black font-mono text-slate-900">{totalPurchased.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">SAIL, Tata Steel, JSW Primary Heats</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Allocated to Cleared Invoices</span>
            <span className="text-2xl font-black font-mono text-amber-600">{totalConsumed.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">{((totalConsumed / totalPurchased) * 100).toFixed(1)}% factory utilization</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Available Remaining Quota</span>
            <span className="text-2xl font-black font-mono text-emerald-600">{totalRemaining.toFixed(1)} MT</span>
            <span className="text-[10px] text-slate-400 block mt-1">Legally claimable for future EU containers</span>
          </div>
        </div>

        {/* Interactive Anti-Phantom Over-Allocation Demo */}
        {showOverAllocationDemo && (
          <div className="p-4 rounded-xl bg-red-50 border border-crimson-oxide text-xs text-red-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2 text-crimson-oxide font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>SIMULATION: ATTEMPT TO EXPORT 25 MT ON HEAT #BOK-26-4910 (ONLY 17.5 MT AVAILABLE)</span>
              </span>
              <span className="font-mono text-crimson-oxide font-bold uppercase">Blocked by Database Trigger</span>
            </div>
            <p className="leading-relaxed">
              In Excel, a factory could accidentally or intentionally attribute 40 MT to a 32.5 MT heat lot. 
              HeatLedger AI enforces a PostgreSQL constraint: <code className="bg-red-100 text-red-800 px-1 py-0.5 rounded font-mono">consumed_mass_tonnes &lt;= purchased_mass_tonnes</code>.
              Your audit trail is cryptographically preserved, preventing disastrous retroactive penalties.
            </p>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-border-crisp shadow-card-light overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-border-crisp flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Heat #, Mill, or Grade..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:block">
            {filteredItems.length} Verified Upstream Heats In Stock
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-border-crisp text-slate-600 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-bold">Heat Number</th>
                <th className="py-3 px-4 font-bold">Supplier Mill</th>
                <th className="py-3 px-4 font-bold">Standard Grade</th>
                <th className="py-3 px-4 font-bold">Purchased</th>
                <th className="py-3 px-4 font-bold">Consumed</th>
                <th className="py-3 px-4 font-bold">Remaining Balance</th>
                <th className="py-3 px-4 font-bold">Precursor SEE</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-crisp font-sans">
              {filteredItems.map((item) => {
                const percentUsed = (item.consumedExportMT / item.totalPurchasedMT) * 100;
                return (
                  <tr key={item.heatNumber} className="hover:bg-slate-50 transition-colors">
                    
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        #{item.heatNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Cert: {item.certRef}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.supplierMill}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {item.grade}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-900 font-bold">
                      {item.totalPurchasedMT.toFixed(1)} MT
                    </td>

                    <td className="py-3.5 px-4 font-mono text-amber-700 font-bold">
                      {item.consumedExportMT.toFixed(1)} MT
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.remainingMT === 0 ? 'text-slate-400' : 'text-emerald-700'}`}>
                          {item.remainingMT.toFixed(1)} MT
                        </span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.remainingMT === 0 ? 'bg-slate-400' : 'bg-emerald-500'}`} 
                            style={{ width: `${100 - percentUsed}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">
                      {item.precursorSee} tCO₂e/t
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono">
                      {item.status === 'HEALTHY' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-badge text-emerald-darkText border border-emerald-300">
                          ACTIVE BATCH
                        </span>
                      )}
                      {item.status === 'LOW_BALANCE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-badge text-amber-darkText border border-amber-300">
                          LOW QUOTA
                        </span>
                      )}
                      {item.status === 'EXHAUSTED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-border-crisp flex justify-between text-xs font-mono text-slate-500">
          <span>Mass Balance Ledger cryptographically verified with upstream NABL lab stamps.</span>
          <span className="text-emerald-700 font-bold">TÜV / SGS Ready</span>
        </div>

      </div>

    </div>
  );
};
