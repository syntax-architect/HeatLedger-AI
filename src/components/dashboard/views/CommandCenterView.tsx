import React from 'react';
import { MOCK_SHIPMENTS } from '../../../data/mockData';
import { ShipmentRecord } from '../../../types';
import { 
  Box, 
  Flame, 
  ShieldCheck, 
  AlertOctagon, 
  Upload,
  CheckCircle2,
  Building2,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  FileCode2,
  Search
} from 'lucide-react';

interface CommandCenterViewProps {
  onOpenShipmentDossier: (shipment: ShipmentRecord) => void;
  onNavigateToWorkbench: () => void;
  onTriggerUpload: () => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  onOpenShipmentDossier,
  onNavigateToWorkbench,
  onTriggerUpload,
}) => {
  return (
    <div className="space-y-8 font-sans">
      
      {/* 4 Apple/Linear Style Minimalist Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              EU/UK Shipments
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
              100% On-Track
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Verified Precursors
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
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
            <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
              India Verified
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Plant Embedded SEE
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-emerald-600">
              1.79 <span className="text-sm font-normal text-slate-500 font-mono">tCO₂e/t</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>38% below EU default markup</span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Direct + Indirect Math</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
              Verified Pass
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending QA Sign-Off
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-red-600">
              3 <span className="text-base font-normal text-slate-500">Certificates</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Awaiting Authorised Stamp (#QA-04)
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dispatch Readiness</span>
            <span className="text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded-full text-[11px] animate-pulse">
              Action Required
            </span>
          </div>
        </div>

      </div>

      {/* Modern Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Invoice</span>
            </button>
          </div>
        </div>

        {/* Refined Data Table */}
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
              {MOCK_SHIPMENTS.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-slate-50/60 transition-colors group">
                  
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                      <span>Ready</span>
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onOpenShipmentDossier(shipment)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    >
                      <span>Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
