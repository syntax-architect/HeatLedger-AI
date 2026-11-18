import React, { useState, useMemo } from 'react';
import { MOCK_SHIPMENTS } from '../../../data/mockData';
import { ShipmentRecord } from '../../../types';
import { 
  Box, 
  Flame, 
  ShieldCheck, 
  AlertOctagon, 
  Upload,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Search,
  Filter,
  XCircle
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'ACTION_REQUIRED'>('ALL');

  const filteredShipments = useMemo(() => {
    return MOCK_SHIPMENTS.filter((shipment) => {
      const matchesSearch = 
        shipment.containerInvoice.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.destinationPort.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.cnCode.includes(searchQuery) ||
        shipment.linkedHeatNumbers.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()));

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

  return (
    <div className="space-y-8 font-sans">
      
      {/* 4 Apple/Linear Style Minimalist Metric Cards (Interactive Drill-Downs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: EU/UK Shipments */}
        <div 
          onClick={() => {
            setStatusFilter('ALL');
            const tableEl = document.getElementById('shipments-table');
            if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-400 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View all EU/UK Shipments"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-mono group-hover:text-blue-600 transition-colors">
              EU/UK Shipments
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">
              14 <span className="text-base font-normal text-slate-500">Containers</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              312 Metric Tonnes active in transit
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ports: Hamburg, Rotterdam</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200/50">
              100% On-Track
            </span>
          </div>
        </div>

        {/* Metric 2: Verified Precursors */}
        <div 
          onClick={onNavigateToInventory}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-amber-400 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View Raw Material Heat Inventory Ledger"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-mono group-hover:text-amber-600 transition-colors">
              Verified Precursors
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">
              48 <span className="text-base font-normal text-slate-500">Heat Batches</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SAIL, Tata Steel, JSW allocated
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Melt-and-Pour Status</span>
            <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full text-[11px] border border-amber-200/50 flex items-center gap-1">
              <span>View Inventory</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Plant Embedded SEE */}
        <div 
          onClick={onNavigateToWorkbench}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="Open MTC Metallurgy Verification Workbench"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-mono group-hover:text-emerald-600 transition-colors">
              Plant Embedded SEE
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-emerald-600 font-mono">
              1.79 <span className="text-sm font-normal text-slate-500">tCO₂e/t</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>38% below EU default markup</span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Direct + Indirect Math</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200/50 flex items-center gap-1">
              <span>Inspect MTCs</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Pending QA Sign-Off */}
        <div 
          onClick={onNavigateToSignOff}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-rose-400 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View Pending QA Sign-Off Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-mono group-hover:text-rose-600 transition-colors">
              Pending QA Sign-Off
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-semibold tracking-tight ${pendingSignOffCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {pendingSignOffCount} <span className="text-base font-normal text-slate-500">Certificates</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pendingSignOffCount > 0 ? 'Awaiting Authorized Stamp (#QA-04)' : 'All Certificates Signed & Cleared'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dispatch Readiness</span>
            {pendingSignOffCount > 0 ? (
              <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-full text-[11px] border border-rose-200/50 animate-pulse flex items-center gap-1">
                <span>Sign Queue</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200/50">
                Fully Cleared
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Modern Data Table Card */}
      <div id="shipments-table" className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Container Dispatch &amp; Export Compliance Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live monitoring of EU Reg 2026/1963 Melt-and-Pour customs proof and CBAM communication XML dossiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateToWorkbench}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              Verify Incoming MTC
            </button>
            <button
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Invoice</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice, buyer, port, or heat #..."
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              All ({MOCK_SHIPMENTS.length})
            </button>
            <button
              onClick={() => setStatusFilter('READY')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'READY'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ready (CBAM)
            </button>
            <button
              onClick={() => setStatusFilter('ACTION_REQUIRED')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'ACTION_REQUIRED'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Action Required ({pendingSignOffCount})
            </button>
          </div>
        </div>

        {/* Refined Data Table or Empty State */}
        {filteredShipments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No shipments found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any export container matching "{searchQuery}" with the selected filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Reset Search &amp; Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-mono text-[11px]">
                  <th className="py-3.5 px-6 font-medium">Container / Invoice</th>
                  <th className="py-3.5 px-6 font-medium">Customer &amp; Port</th>
                  <th className="py-3.5 px-6 font-medium">CN Code</th>
                  <th className="py-3.5 px-6 font-medium">Linked Heats</th>
                  <th className="py-3.5 px-6 font-medium">Metallurgy</th>
                  <th className="py-3.5 px-6 font-medium">Melt &amp; Pour</th>
                  <th className="py-3.5 px-6 font-medium">CBAM XML</th>
                  <th className="py-3.5 px-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50/70 transition-colors group">
                    
                    {/* Container / Invoice */}
                    <td className="py-4 px-6 font-mono font-medium text-slate-900">
                      <div>{shipment.containerInvoice.split('/')[0]}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {shipment.containerInvoice.split('/')[1] || '20ft FCL'} · {shipment.netTonnage} MT
                      </div>
                    </td>

                    {/* Customer & Port */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900">{shipment.buyerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {shipment.destinationPort}
                      </div>
                    </td>

                    {/* CN Code */}
                    <td className="py-4 px-6 font-mono">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                        {shipment.cnCode}
                      </span>
                    </td>

                    {/* Linked Upstream Heats */}
                    <td className="py-4 px-6 font-mono text-[11px]">
                      {shipment.linkedHeatNumbers.map((heat, i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] mr-1">
                          #{heat}
                        </span>
                      ))}
                    </td>

                    {/* Metallurgy */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>In Spec</span>
                      </span>
                    </td>

                    {/* Melt & Pour */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span>India (IN)</span>
                      </span>
                    </td>

                    {/* CBAM XML */}
                    <td className="py-4 px-6">
                      {shipment.cbamXmlStatus === 'GENERATED_VALID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span>Pending Inputs</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onOpenShipmentDossier(shipment)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title={`Open customs dossier for ${shipment.containerInvoice.split('/')[0]}`}
                      >
                        <span>Open Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
