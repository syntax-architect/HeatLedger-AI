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
  Clock,
  Menu,
  Plus,
  FileCheck2,
  Sun,
  Moon,
  Sparkles,
  HelpCircle,
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
    logout,
  } = useAuth();

  const [selectedPresetIdForWorkbench, setSelectedPresetIdForWorkbench] = useState<
    string | undefined
  >(initialPresetId);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [uploadedFileForWorkbench, setUploadedFileForWorkbench] = useState<File | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSecurityDrawerOpen, setIsSecurityDrawerOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  useEffect(() => {
    if (initialPresetId) {
      setSelectedPresetIdForWorkbench(initialPresetId);
    }
  }, [initialPresetId]);

  const sidebarItems: {
    id: DashboardView;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [
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

  const isStepUpActive = (user as any)?.step_up_valid ?? false;
  const isQaInspector = user?.role === 'QA_INSPECTOR' || user?.role === 'QA_HEAD';
  const role = user?.role || 'SANDBOX';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-slate-900 selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. DESKTOP LEFT SIDEBAR (Hidden on mobile/tablet below lg, sticky on desktop) */}
      <aside className="hidden lg:flex lg:w-64 bg-[#090D16] border-r border-slate-800/80 flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30">
        {/* Sidebar Top: Brand & Menu */}
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <Logo size="sm" />
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              v2.4
            </span>
          </div>

          <nav className="space-y-1">
            <div className="px-3 pb-2 text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
              Factory QA Workspace
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 min-h-[44px] ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
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
            <div className="px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${isStepUpActive ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`}
                  />
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    {role} SESSION
                  </span>
                </div>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {user?.emp_id || 'ACTIVE'}
                </span>
              </div>

              <div className="text-xs text-slate-300 leading-tight">
                <span className="text-white font-medium block truncate">
                  {user?.name || 'Authorized User'}
                </span>
                <span className="text-slate-400 font-mono text-xs truncate block">
                  {user?.organization_name || 'Howrah Precision Forgings'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
                <span className="text-slate-500">{expiryTimerString}</span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-amber-300">
                    SANDBOX DEMO MODE
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Simulated mill and shipment data. Signatures will carry diagonal demo watermark.
              </p>
            </div>
          )}

          <button
            onClick={onReturnToMarketing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Site</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden pb-28 lg:pb-8">
        {/* DESKTOP TOP HEADER (Hidden on mobile below lg) */}
        <header className="hidden lg:flex bg-white border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  Howrah Precision Forgings Pvt. Ltd.
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Plant 1 · Liluah
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Installation ID: <span className="text-slate-700 font-medium">IN-WB-4409</span> ·
                UN/LOCODE: IN CCU
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-semibold transition-all shadow-sm cursor-pointer group"
              title="Open Live Security & Cryptographic Telemetry Drawer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Security: Tier-1 Enforced</span>
              </span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-xs transition-all shadow-sm cursor-pointer min-h-[44px]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload MTC / Invoice</span>
            </button>
          </div>
        </header>

        {/* MOBILE TOP APP BAR (Below lg only) */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-tight truncate max-w-[170px]">
                Howrah Precision Forgings
              </div>
              <div className="text-xs text-slate-400 font-mono leading-none mt-0.5">
                IN-WB-4409 · Plant 1
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 active:scale-95 transition-all"
              aria-label="Security Telemetry"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              onClick={openPinModal}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 active:scale-95 transition-all"
              aria-label="Inspector PIN"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Workspace Body Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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

          {currentView === 'heat-inventory' && <HeatInventoryView />}

          {currentView === 'sign-off-queue' && <SignOffQueueView />}

          {currentView === 'cbam-dossier' && <CbamDossierView initialShipment={selectedShipment} />}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM TAB BAR (Below lg only, phone-first navigation) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-2xl px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {/* Tab 1: Overview */}
        <button
          onClick={() => onSelectView('command-center')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            currentView === 'command-center'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-xs font-mono mt-1">Home</span>
        </button>

        {/* Tab 2: Sign-Off Queue */}
        <button
          onClick={() => onSelectView('sign-off-queue')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl relative transition-all ${
            currentView === 'sign-off-queue'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="relative">
            <Stamp className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white font-mono text-xs font-bold leading-none">
              3
            </span>
          </span>
          <span className="text-xs font-mono mt-1">Sign-Off</span>
        </button>

        {/* Center Raised Capture Action Button */}
        <div className="relative -top-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all border-2 border-slate-900"
            aria-label="Upload MTC"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 4: Heat Inventory */}
        <button
          onClick={() => onSelectView('heat-inventory')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            currentView === 'heat-inventory'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span className="text-xs font-mono mt-1">Heats</span>
        </button>

        {/* Tab 5: More Menu Sheet Trigger */}
        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            isMobileMoreOpen ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="text-xs font-mono mt-1">More</span>
        </button>
      </nav>

      {/* 4. MOBILE "MORE" BOTTOM SHEET */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsMobileMoreOpen(false)} />
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[85dvh] overflow-y-auto space-y-4">
            {/* Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-700 mx-auto mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Additional Factory Workspaces
              </span>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onSelectView('mtc-workbench');
                  setIsMobileMoreOpen(false);
                }}
                className={`p-3 rounded-xl border text-left min-h-[44px] transition-all ${
                  currentView === 'mtc-workbench'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-white hover:bg-slate-800'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="text-xs font-bold">MTC Workbench</div>
                <div className="text-xs text-slate-400 font-mono">OCR &amp; Chemistry Spec</div>
              </button>

              <button
                onClick={() => {
                  onSelectView('cbam-dossier');
                  setIsMobileMoreOpen(false);
                }}
                className={`p-3 rounded-xl border text-left min-h-[44px] transition-all ${
                  currentView === 'cbam-dossier'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-white hover:bg-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4 text-cyan-400 mb-1" />
                <div className="text-xs font-bold">Customs Dossier</div>
                <div className="text-xs text-slate-400 font-mono">Clause 6 PDF &amp; XML</div>
              </button>

              <button
                onClick={() => {
                  setIsSecurityDrawerOpen(true);
                  setIsMobileMoreOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left min-h-[44px]"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="text-xs font-bold text-white">Security Telemetry</div>
                <div className="text-xs text-slate-400 font-mono">Audit Shield Active</div>
              </button>

              <button
                onClick={() => {
                  onReturnToMarketing();
                  setIsMobileMoreOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400 mb-1" />
                <div className="text-xs font-bold text-white">Public Site</div>
                <div className="text-xs text-slate-400 font-mono">Marketing &amp; ROI</div>
              </button>
            </div>

            {/* Auth Session Micro-Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{user?.name || 'Authorized Floor Staff'}</span>
              </span>
              <button onClick={logout} className="text-rose-400 hover:text-rose-300 font-bold">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal with Real File Input & Drag & Drop */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-obsidian-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative font-sans max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Upload Supplier MTC / Export Invoice
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload PDF certificate from SAIL, Tata Steel, JSW, or take camera capture for Vision
              OCR extraction.
            </p>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer bg-slate-50/50 group block min-h-[44px]"
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
              <div className="text-xs font-semibold text-slate-700">
                Click to upload or drag &amp; drop
              </div>
              <div className="text-xs text-slate-400 mt-1">
                PDF, PNG, JPG up to 10MB (Magic-Byte Verified)
              </div>
            </label>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  onSelectView('mtc-workbench');
                }}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all min-h-[44px]"
              >
                Go to Workbench
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Passkey / 2FA Challenge Modal */}
      <InspectorPinChallengeModal isOpen={isPinModalOpen} onClose={closePinModal} />

      {/* Security & Cryptographic Telemetry Slide-Over Drawer */}
      <SecurityTelemetryDrawer
        isOpen={isSecurityDrawerOpen}
        onClose={() => setIsSecurityDrawerOpen(false)}
      />
    </div>
  );
};
