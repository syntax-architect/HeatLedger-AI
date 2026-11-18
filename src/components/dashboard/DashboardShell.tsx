import React, { useState } from 'react';
import { DashboardView, ShipmentRecord } from '../../types';
import { CommandCenterView } from './views/CommandCenterView';
import { MtcWorkbenchView } from './views/MtcWorkbenchView';
import { HeatInventoryView } from './views/HeatInventoryView';
import { SignOffQueueView } from './views/SignOffQueueView';
import { CbamDossierView } from './views/CbamDossierView';
import { 
  LayoutDashboard, 
  FlaskConical, 
  Database, 
  Stamp, 
  FileCode, 
  Upload, 
  Building2, 
  ShieldCheck, 
  ChevronRight, 
  ExternalLink,
  Layers,
  ArrowLeft
} from 'lucide-react';

interface DashboardShellProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onReturnToMarketing: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentView,
  onSelectView,
  onReturnToMarketing,
}) => {
  const [selectedPresetIdForWorkbench, setSelectedPresetIdForWorkbench] = useState<string | undefined>(undefined);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const sidebarItems: { id: DashboardView; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'mtc-workbench', label: 'MTC & Chemistry Workbench', icon: FlaskConical },
    { id: 'heat-inventory', label: 'Raw Material Heat Inventory', icon: Database },
    { id: 'sign-off-queue', label: 'Clause 6 & 3.1 Sign-Off Queue', icon: Stamp, badge: '3 Pending' },
    { id: 'cbam-dossier', label: 'EU/UK CBAM & Customs Dossier', icon: FileCode },
  ];

  const handleOpenShipmentDossier = (shipment: ShipmentRecord) => {
    onSelectView('cbam-dossier');
  };

  const handleNavigateToWorkbenchWithPreset = (presetId?: string) => {
    setSelectedPresetIdForWorkbench(presetId);
    onSelectView('mtc-workbench');
  };

  return (
    <div className="min-h-screen bg-alabaster flex flex-col font-sans">
      
      {/* Top Shop-Floor Workspace Header */}
      <div className="bg-white border-b border-border-crisp px-4 sm:px-6 py-3 shadow-card-light sticky top-16 sm:top-20 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Active Plant Selector */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-obsidian-900 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                  Howrah Precision Forgings Pvt. Ltd.
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-badge text-emerald-darkText border border-emerald-300">
                  Plant 1 · Liluah
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                EU Installation ID: <strong className="text-slate-800">IN-WB-4409</strong> · UN/LOCODE: IN CCU
              </div>
            </div>
          </div>

          {/* Export Regime Badges & Quick Upload Button */}
          <div className="flex items-center gap-3">
            
            {/* Status Badges */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono">
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                EU Reg 2026/1963: ACTIVE
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                EU CBAM Definitive: ACTIVE
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                UK CBAM: JAN 2027
              </span>
            </div>

            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-extrabold text-xs transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Supplier MTC / Invoice</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Workspace Body with Persistent Dark Left Navigation Rail */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Persistent Left Sidebar (#090D16 Background) */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-obsidian-900 rounded-2xl border border-slate-tempered p-3 text-slate-300 shadow-xl space-y-1 sticky top-36">
            
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Factory QA Console</span>
              <span className="text-emerald-400">v2.4 Live</span>
            </div>

            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-crimson-oxide text-white font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator Bar (#10B981) */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-500 rounded-r" />
                  )}
                </button>
              );
            })}

            {/* Back to Public Marketing Button */}
            <div className="pt-3 mt-2 border-t border-slate-800">
              <button
                onClick={onReturnToMarketing}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Marketing</span>
              </button>
            </div>

          </div>
        </aside>

        {/* Dynamic Precision Daylight View Canvas */}
        <main className="flex-1 min-w-0">
          {currentView === 'command-center' && (
            <CommandCenterView
              onOpenShipmentDossier={handleOpenShipmentDossier}
              onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
              onTriggerUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {currentView === 'mtc-workbench' && (
            <MtcWorkbenchView initialPresetId={selectedPresetIdForWorkbench} />
          )}

          {currentView === 'heat-inventory' && (
            <HeatInventoryView />
          )}

          {currentView === 'sign-off-queue' && (
            <SignOffQueueView />
          )}

          {currentView === 'cbam-dossier' && (
            <CbamDossierView />
          )}
        </main>

      </div>

      {/* Quick Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-300 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>Ingest Raw Material MTC / Commercial Invoice</span>
            </h3>
            <p className="text-xs text-slate-500">
              Accepts high-resolution scanned PDFs from SAIL, Tata Steel, JSW, RINL, or camera photos sent directly via WhatsApp from the factory weighbridge.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-mono text-slate-600">
                Drag &amp; drop PDF or <span className="text-emerald-600 font-bold">browse files</span>
              </div>
              <div className="text-[10px] text-slate-400">PDF, JPG, PNG up to 25MB</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  onSelectView('mtc-workbench');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-bold text-xs shadow"
              >
                Process with Vision OCR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
