import React, { useState, useEffect } from 'react';
import { DashboardView, ShipmentRecord } from '../../types';
import { CommandCenterView } from './views/CommandCenterView';
import { MtcWorkbenchView } from './views/MtcWorkbenchView';
import { HeatInventoryView } from './views/HeatInventoryView';
import { SignOffQueueView } from './views/SignOffQueueView';
import { CbamDossierView } from './views/CbamDossierView';
import { Logo } from '../brand/Logo';
import { 
  LayoutDashboard, 
  FlaskConical, 
  Database, 
  Stamp, 
  FileCode, 
  Upload, 
  Building2, 
  ArrowLeft,
  CheckCircle2,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  X
} from 'lucide-react';

interface DashboardShellProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onReturnToMarketing: () => void;
  initialPresetId?: string;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentView,
  onSelectView,
  onReturnToMarketing,
  initialPresetId,
}) => {
  const [selectedPresetIdForWorkbench, setSelectedPresetIdForWorkbench] = useState<string | undefined>(initialPresetId);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (initialPresetId) {
      setSelectedPresetIdForWorkbench(initialPresetId);
    }
  }, [initialPresetId]);

  const sidebarItems: { id: DashboardView; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'mtc-workbench', label: 'MTC Workbench', icon: FlaskConical },
    { id: 'heat-inventory', label: 'Heat Inventory', icon: Database },
    { id: 'sign-off-queue', label: 'Clause 6 Sign-Off', icon: Stamp, badge: '3' },
    { id: 'cbam-dossier', label: 'Customs Dossier', icon: FileCode },
  ];

  const handleOpenShipmentDossier = (_shipment: ShipmentRecord) => {
    onSelectView('cbam-dossier');
  };

  const handleNavigateToWorkbenchWithPreset = (presetId?: string) => {
    setSelectedPresetIdForWorkbench(presetId);
    onSelectView('mtc-workbench');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Persistent Left Sidebar (Full Height, Linear / Apple Style) */}
      <aside className="w-full md:w-64 bg-[#090D16] border-r border-slate-800/80 flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 select-none z-30">
        
        {/* Sidebar Top: Brand & Menu */}
        <div className="p-4 space-y-6">
          
          {/* Logo Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <Logo size="sm" />
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              v2.4
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              Factory QA Workspace
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Return to Marketing & Inspector Status */}
        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-[11px] text-slate-400 leading-tight">
              <span className="text-white font-medium block">R. K. Chatterjee</span>
              <span className="text-slate-500">Head of QA (#QA-04)</span>
            </div>
          </div>

          <button
            onClick={onReturnToMarketing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Marketing</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Sleek Workspace Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-4">
          
          {/* Active Plant Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Howrah Precision Forgings Pvt. Ltd.
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Plant 1 · Liluah
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Installation ID: <span className="text-slate-700 font-medium">IN-WB-4409</span> · UN/LOCODE: IN CCU
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            
            {/* Status Pills */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                EU Reg 2026/1963: Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                EU CBAM: Active
              </span>
            </div>

            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-xs transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload MTC / Invoice</span>
            </button>
          </div>
        </header>

        {/* Workspace Body Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentView === 'command-center' && (
            <CommandCenterView
              onOpenShipmentDossier={handleOpenShipmentDossier}
              onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
              onNavigateToInventory={() => onSelectView('heat-inventory')}
              onNavigateToSignOff={() => onSelectView('sign-off-queue')}
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

      {/* Upload Modal with Polished Drag & Drop */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative font-sans">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Upload Supplier MTC / Export Invoice
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload PDF certificate from SAIL, Tata Steel, JSW, or WhatsApp image for Vision OCR extraction.
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer bg-slate-50/50 group">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">Click to upload or drag &amp; drop</div>
              <div className="text-[11px] text-slate-400 mt-1">PDF, PNG, JPG up to 25MB</div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  onSelectView('mtc-workbench');
                }}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
              >
                Go to Workbench
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
