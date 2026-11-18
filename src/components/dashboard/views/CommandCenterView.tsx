import React from 'react';
import { MOCK_SHIPMENTS } from '../../../data/mockData';
import { ShipmentRecord } from '../../../types';
import { 
  Box, 
  Flame, 
  ShieldCheck, 
  AlertOctagon, 
  FileCheck2, 
  ExternalLink, 
  ArrowUpRight, 
  TrendingDown, 
  Upload,
  CheckCircle2,
  FileCode,
  Building2,
  Clock
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
    <div className="space-y-6">
      
      {/* 4 High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active EU/UK Shipments */}
        <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cobalt-blueprint" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>ACTIVE EU/UK SHIPMENTS</span>
            <Box className="w-4 h-4 text-cobalt-blueprint" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900">
              14 Containers
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              312 Metric Tonnes in Transit / Port
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Destinations: DE, NL, GB, IT</span>
            <span className="text-cobalt-blueprint font-bold">100% On-Track</span>
          </div>
        </div>

        {/* KPI 2: Verified Precursor Heat Batches */}
        <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>UPSTREAM HEAT BATCHES</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900">
              48 Upstream Heats
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-0.5">
              100% Melt &amp; Pour Traceable (INDIA)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Primary: SAIL, Tata, JSW</span>
            <span className="text-emerald-600 font-bold">Zero Grey Scrap</span>
          </div>
        </div>

        {/* KPI 3: Plant Specific Embedded Emissions */}
        <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>PLANT SPECIFIC EMBEDDED SEE</span>
            <Flame className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              1.79 tCO₂e / t
            </div>
            <div className="text-xs font-semibold text-emerald-800 mt-0.5 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>38% Below EU Default Penalty</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Direct + Indirect Math</span>
            <span className="text-emerald-600 font-bold">Definitive Pass</span>
          </div>
        </div>

        {/* KPI 4: Pending QA Manager Sign-Offs */}
        <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-crimson-oxide" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>ACTION REQUIRED</span>
            <AlertOctagon className="w-4 h-4 text-crimson-oxide animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-crimson-oxide">
              3 Certificates
            </div>
            <div className="text-xs font-semibold text-red-700 mt-0.5">
              Awaiting Authorised QA Stamp
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Inspector: R.K. Chatterjee</span>
            <span className="text-crimson-oxide font-bold">Urgent Dispatch</span>
          </div>
        </div>

      </div>

      {/* Active Shipment Container Table */}
      <div className="bg-white rounded-xl border border-border-crisp shadow-card-light overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-5 border-b border-border-crisp flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <span>Active Container Dispatch &amp; Export Compliance Register</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time monitoring of EU Reg 2026/1963 Melt-and-Pour proof and CBAM communication XML dossiers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToWorkbench}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Verify Incoming MTC
            </button>
            <button
              onClick={onTriggerUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 text-xs font-bold transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Invoice</span>
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-border-crisp text-slate-600 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-bold">Container / Invoice #</th>
                <th className="py-3 px-4 font-bold">Customer &amp; Port</th>
                <th className="py-3 px-4 font-bold">CN Code</th>
                <th className="py-3 px-4 font-bold">Linked Upstream Heats</th>
                <th className="py-3 px-4 font-bold">Metallurgy Check</th>
                <th className="py-3 px-4 font-bold">Melt &amp; Pour Proof</th>
                <th className="py-3 px-4 font-bold">CBAM XML</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-crisp font-sans">
              {MOCK_SHIPMENTS.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Container / Invoice */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div>{shipment.containerInvoice.split('/')[0]}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {shipment.containerInvoice.split('/')[1] || '20ft FCL'} ({shipment.netTonnage} MT)
                    </div>
                  </td>

                  {/* Customer & Port */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{shipment.buyerName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <span>{shipment.destinationPort}</span>
                    </div>
                  </td>

                  {/* CN Code */}
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {shipment.cnCode}
                    </span>
                  </td>

                  {/* Linked Upstream Heats */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {shipment.linkedHeatNumbers.map(heat => (
                      <span key={heat} className="inline-block mr-1 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                        #{heat}
                      </span>
                    ))}
                  </td>

                  {/* Metallurgy Check */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-emerald-badge text-emerald-darkText border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{shipment.metallurgyStatus}</span>
                    </span>
                  </td>

                  {/* Melt & Pour Proof */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-badge text-amber-darkText border border-amber-300">
                      <span>🇮🇳 MELTED &amp; POURED IN INDIA</span>
                    </span>
                  </td>

                  {/* CBAM XML */}
                  <td className="py-3.5 px-4 font-mono">
                    {shipment.cbamXmlStatus === 'GENERATED_VALID' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                        <span>XML Ready ({shipment.specificEmissions} t)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pending Energy Input</span>
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onOpenShipmentDossier(shipment)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-obsidian-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold transition-colors"
                    >
                      <span>Open Dossier</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-border-crisp flex flex-wrap items-center justify-between text-xs font-mono text-slate-500">
          <span>Showing 5 of 14 active export shipments</span>
          <span className="text-emerald-700 font-bold">Mass Balance Ledger: Consumed 142.1 MT / In-Transit 312.0 MT</span>
        </div>

      </div>

    </div>
  );
};
