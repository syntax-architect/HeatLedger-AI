import React, { useState, useEffect } from 'react';
import { DashboardView, ShipmentRecord } from '../../types';
import { CommandCenterView } from './views/CommandCenterView';
import { MtcWorkbenchView } from './views/MtcWorkbenchView';
import { HeatInventoryView } from './views/HeatInventoryView';
import { SignOffQueueView } from './views/SignOffQueueView';
import { CbamDossierView } from './views/CbamDossierView';
import { Logo } from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { InspectorPinChallengeModal } from './modals/InspectorPinChallengeModal';
import { SecurityTelemetryDrawer } from './modals/SecurityTelemetryDrawer';
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
  X,
  ShieldCheck,
  Lock,
  KeyRound,
  Clock
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
  const { 
    isAuthenticated, 
    user, 
    expiryTimerString, 
    openPinModal, 
    isPinModalOpen, 
    closePinModal,
    logout 
  } = useAuth();

  const [selectedPresetIdForWorkbench, setSelectedPresetIdForWorkbench] = useState<string | undefined>(initialPresetId);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [uploadedFileForWorkbench, setUploadedFileForWorkbench] = useState<File | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSecurityDrawerOpen, setIsSecurityDrawerOpen] = useState(false);

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

  const handleOpenShipmentDossier = (shipment: ShipmentRecord) => {
    setSelectedShipment(shipment);
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
          {isAuthenticated ? (
            <div className="px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-emerald-300">VERIFIED SESSION</span>
                </div>
                <Lock className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-[11px] text-slate-300 leading-tight">
                <span className="text-white font-medium block">R. K. Chatterjee</span>
                <span className="text-emerald-400/80 font-mono text-[10px]">#QA-04 · {expiryTimerString}</span>
              </div>
              <button
                onClick={logout}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-mono transition-colors pt-1 block cursor-pointer"
              >
                Lock Session (Logout)
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-amber-300">SANDBOX DEMO MODE</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Read/Test
                </span>
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                <span>Passkey required to sign certificates</span>
              </div>
              <button
                onClick={openPinModal}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] font-semibold border border-emerald-500/30 transition-all cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-emerald-400" />
                <span>Authenticate QA Inspector</span>
              </button>
            </div>
          )}

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
            
            {/* Security Session Indicator Pill */}
            {isAuthenticated ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-950 font-mono text-xs shadow-sm">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-emerald-900">VERIFIED SESSION · QA-04</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold hidden sm:inline">
                  JWT + HMAC Active
                </span>
                <span className="text-[11px] text-emerald-700 border-l border-emerald-200 pl-2 hidden md:flex items-center gap-1 font-semibold">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>{expiryTimerString}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-bold">SANDBOX DEMO MODE</span>
                  <span className="text-[10px] text-amber-700 hidden sm:inline">(Read/Test)</span>
                </div>
                <button
                  onClick={openPinModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authenticate QA Inspector</span>
                </button>
              </div>
            )}

            {/* Live Security & Cryptographic Audit Shield Button */}
            <button
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:border-emerald-400 font-mono text-xs font-semibold transition-all shadow-sm cursor-pointer group"
              title="Open Live Security & Cryptographic Telemetry Drawer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Security: Tier-1 Enforced</span>
              </span>
            </button>

            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-xs transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload MTC / Invoice</span>
              <span className="sm:hidden">Upload</span>
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
            <MtcWorkbenchView 
              initialPresetId={selectedPresetIdForWorkbench} 
              initialUploadedFile={uploadedFileForWorkbench}
            />
          )}

          {currentView === 'heat-inventory' && (
            <HeatInventoryView />
          )}

          {currentView === 'sign-off-queue' && (
            <SignOffQueueView />
          )}

          {currentView === 'cbam-dossier' && (
            <CbamDossierView initialShipment={selectedShipment} />
          )}
        </main>

      </div>

      {/* Upload Modal with Real File Input & Drag & Drop */}
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

            <label 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    alert('File exceeds 10MB limit. Please upload a file <= 10MB.');
                    return;
                  }
                  setUploadedFileForWorkbench(file);
                  setIsUploadModalOpen(false);
                  onSelectView('mtc-workbench');
                }
              }}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer bg-slate-50/50 group block"
            >
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alert('File exceeds 10MB limit. Please upload a file <= 10MB.');
                      return;
                    }
                    setUploadedFileForWorkbench(file);
                    setIsUploadModalOpen(false);
                    onSelectView('mtc-workbench');
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">Click to upload or drag &amp; drop</div>
              <div className="text-[11px] text-slate-400 mt-1">PDF, PNG, JPG up to 10MB (Magic-Byte Verified)</div>
            </label>

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

      {/* Inspector Passkey / 2FA Challenge Modal */}
      <InspectorPinChallengeModal
        isOpen={isPinModalOpen}
        onClose={closePinModal}
      />

      {/* Security & Cryptographic Telemetry Slide-Over Drawer */}
      <SecurityTelemetryDrawer
        isOpen={isSecurityDrawerOpen}
        onClose={() => setIsSecurityDrawerOpen(false)}
      />

    </div>
  );
};
