import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { DashboardView, ShipmentRecord } from '../../types';
import { CommandCenterView } from './views/CommandCenterView';
import { MtcWorkbenchView } from './views/MtcWorkbenchView';
import { HeatInventoryView } from './views/HeatInventoryView';
import { SignOffQueueView } from './views/SignOffQueueView';
import { CbamDossierView } from './views/CbamDossierView';
import { RegulationRadarView } from './views/RegulationRadarView';
import { SupplierIntelligenceView } from './views/SupplierIntelligenceView';
import { SupplierRequestsView } from './views/SupplierRequestsView';
import { IntakeChannelsView } from './views/IntakeChannelsView';
import { RoiReportView } from './views/RoiReportView';
import { AuditTrailView } from './views/AuditTrailView';
import { ConsultantPortalView } from './views/ConsultantPortalView';
import { InsightsTrendsView } from './views/InsightsTrendsView';
import { ApiIntegrationsView } from './views/ApiIntegrationsView';
import { AssistantBottomSheet } from './AssistantBottomSheet';
import { Logo, HexagonalIngotIcon } from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { InspectorPinChallengeModal } from './modals/InspectorPinChallengeModal';
import { SecurityTelemetryDrawer } from './modals/SecurityTelemetryDrawer';
import { PlantSwitcherModal, PlantProfile, REGISTERED_PLANTS } from './PlantSwitcherModal';
import { NotificationsModal } from './NotificationsModal';
import { CaptureChoiceModal } from './CaptureChoiceModal';
import { CommandPalette } from './CommandPalette';
import { MobileMoreSheet } from './MobileMoreSheet';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { PullToRefresh } from '../common/PullToRefresh';
import { subscribeToOfflineQueue, isDeviceOnline } from '../../lib/offlineQueue';
import {
  LayoutDashboard,
  FlaskConical,
  Database,
  Stamp,
  FileCode,
  Compass,
  Building2,
  MessageSquare,
  Send,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  Menu,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Camera,
  WifiOff,
  BarChart3,
  Sparkles,
  Key,
  ChevronsUpDown,
  LogOut,
  Keyboard,
} from 'lucide-react';

interface DashboardShellProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onReturnToMarketing: () => void;
  initialPresetId?: string;
}

const VIEW_TITLES: Record<DashboardView, string> = {
  'command-center': 'Command Center',
  'mtc-workbench': 'MTC Workbench',
  'heat-inventory': 'Heat Inventory',
  'sign-off-queue': 'Clause 6 Sign-Off',
  'cbam-dossier': 'Customs Dossier',
  'supplier-intelligence': 'Supplier Intelligence',
  'supplier-requests': 'CBAM Data Requests',
  'intake-channels': 'Intake Channels',
  'regulation-radar': 'Regulation Radar',
  'roi-reports': 'ROI & Value Report',
  'audit-trail': 'Audit Trail & Approvals',
  'consultant-portal': 'Consultant & Multi-Plant',
  'insights-trends': 'Insights & Trends',
  'api-integrations': 'API & Integrations',
  settings: 'Plant Settings',
};

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

  // Active Factory Plant State
  const [activePlant, setActivePlant] = useState<PlantProfile>(() => {
    try {
      const saved = localStorage.getItem('hl_active_plant');
      if (saved) {
        const found = REGISTERED_PLANTS.find((p) => p.id === saved);
        if (found) return found;
      }
    } catch {
      // localStorage may fail in private mode
    }
    return REGISTERED_PLANTS[0];
  });

  // Collapsible Sidebar State (Desktop >= lg)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hl_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [pendingSignOffCount, setPendingSignOffCount] = useState<number>(3);
  const [selectedPresetIdForWorkbench, setSelectedPresetIdForWorkbench] = useState<
    string | undefined
  >(initialPresetId);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [uploadedFileForWorkbench, setUploadedFileForWorkbench] = useState<File | null>(null);

  // Modals & Drawers States
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isPlantSwitcherOpen, setIsPlantSwitcherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSecurityDrawerOpen, setIsSecurityDrawerOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());

  // Chord key state for Linear-style G + <key> navigation
  const chordPrefixRef = useRef<{ key: string; ts: number } | null>(null);

  useEffect(() => {
    const unsub = subscribeToOfflineQueue((items) => {
      const pending = items.filter((i) => i.status === 'pending' || i.status === 'failed');
      setOfflineCount(pending.length);
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (initialPresetId) {
      setSelectedPresetIdForWorkbench(initialPresetId);
    }
  }, [initialPresetId]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hl_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (key === '[') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (key === 'u') {
        e.preventDefault();
        setIsCaptureModalOpen(true);
        return;
      }

      // Chord navigation: G then key
      const now = Date.now();
      if (chordPrefixRef.current && now - chordPrefixRef.current.ts < 850) {
        const prefix = chordPrefixRef.current.key;
        chordPrefixRef.current = null;
        if (prefix === 'g') {
          const map: Record<string, DashboardView> = {
            c: 'command-center',
            m: 'mtc-workbench',
            h: 'heat-inventory',
            q: 'sign-off-queue',
            d: 'cbam-dossier',
            s: 'supplier-intelligence',
            p: 'supplier-requests',
            i: 'intake-channels',
            r: 'regulation-radar',
            v: 'roi-reports',
            a: 'audit-trail',
            l: 'consultant-portal',
            t: 'insights-trends',
            k: 'api-integrations',
          };
          if (map[key]) {
            e.preventDefault();
            onSelectView(map[key]);
          }
        }
        return;
      }

      if (key === 'g') {
        chordPrefixRef.current = { key: 'g', ts: now };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectView, toggleSidebar]);

  const handleSelectPlant = (plant: PlantProfile) => {
    setActivePlant(plant);
    try {
      localStorage.setItem('hl_active_plant', plant.id);
    } catch {
      // ignore
    }
  };

  const handlePresetSelected = useCallback(
    (presetId: string) => {
      setSelectedPresetIdForWorkbench(presetId);
      onSelectView('mtc-workbench');
    },
    [onSelectView]
  );

  const handleFileCaptured = useCallback(
    (file: File) => {
      setUploadedFileForWorkbench(file);
      onSelectView('mtc-workbench');
    },
    [onSelectView]
  );

  const handleOpenShipmentDossier = (shipment: ShipmentRecord) => {
    setSelectedShipment(shipment);
    onSelectView('cbam-dossier');
  };

  // SERIALIZED WORKSPACE SECTIONS
  const navSections: {
    title: string;
    items: {
      id: DashboardView;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: string;
    }[];
  }[] = [
    {
      title: 'Factory Operations',
      items: [
        { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
        { id: 'mtc-workbench', label: 'MTC Workbench', icon: FlaskConical },
        { id: 'heat-inventory', label: 'Heat Inventory', icon: Database },
        {
          id: 'sign-off-queue',
          label: 'Clause 6 Sign-Off',
          icon: Stamp,
          badge: pendingSignOffCount > 0 ? String(pendingSignOffCount) : undefined,
        },
      ],
    },
    {
      title: 'Customs & Precursors',
      items: [
        { id: 'cbam-dossier', label: 'Customs Dossier', icon: FileCode },
        { id: 'supplier-intelligence', label: 'Supplier Intelligence', icon: Building2 },
        { id: 'supplier-requests', label: 'CBAM Data Requests', icon: Send },
        { id: 'intake-channels', label: 'Intake Channels', icon: MessageSquare },
      ],
    },
    {
      title: 'Compliance & Intelligence',
      items: [
        { id: 'regulation-radar', label: 'Regulation Radar', icon: Compass },
        { id: 'roi-reports', label: 'ROI & Value Report', icon: TrendingUp },
        { id: 'audit-trail', label: 'Audit Trail & Approvals', icon: ShieldCheck },
        { id: 'consultant-portal', label: 'Consultant & Multi-Plant', icon: Briefcase },
        { id: 'insights-trends', label: 'Insights & Trends', icon: BarChart3 },
        { id: 'api-integrations', label: 'API & Integrations', icon: Key },
      ],
    },
  ];

  const role = user?.role || 'QA_INSPECTOR';
  const currentTitle = VIEW_TITLES[currentView] || 'Workspace';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FAFAFA] flex flex-col lg:flex-row font-sans text-[#09090B] selection:bg-emerald-600/20 selection:text-[#09090B]">
      {/* 1. DESKTOP LEFT RAIL (240px deep carbon #0C0E14, collapsible to 68px) */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 transition-[width] duration-200 ease-out bg-[#0C0E14] text-[#F4F4F5] border-r border-white/[0.08] ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Top Zone: Brand, Compact Plant Switcher & Serial Navigation */}
        <div data-lenis-prevent className="p-3 space-y-4 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1.5 pt-1 pb-2.5 border-b border-white/[0.08]">
            {isSidebarCollapsed ? (
              <div className="mx-auto">
                <HexagonalIngotIcon size={24} />
              </div>
            ) : (
              <>
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Collapse sidebar ([)"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Compact Plant Switcher */}
          <button
            type="button"
            onClick={() => setIsPlantSwitcherOpen(true)}
            className={`w-full flex items-center rounded-lg bg-[#14171F] hover:bg-[#1B1F2A] border border-white/[0.08] text-left transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
            }`}
            title={`${activePlant.name} (${activePlant.installationId})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F4F4F5] truncate leading-tight">
                    {activePlant.shortName}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#A1A1AA] truncate leading-tight mt-0.5">
                    {activePlant.installationId}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            )}
          </button>

          {/* Serialized Navigation Sections */}
          <nav className="space-y-3" aria-label="Workspace Navigation">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-0.5">
                {!isSidebarCollapsed && (
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-mono uppercase tracking-wider text-[#71717A] font-semibold">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectView(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`relative w-full flex items-center rounded-lg text-xs transition-colors h-8.5 cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                      } ${
                        isActive
                          ? 'text-[#F4F4F5] font-medium'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.04]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-white/[0.09] border border-white/[0.08]"
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-emerald-400' : 'text-[#A1A1AA]'
                          }`}
                        />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isSidebarCollapsed && item.badge && (
                        <span className="relative z-10 text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 leading-none">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Zone: Expand Toggle, Shortcuts, Inspector Session */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="flex-1 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#F4F4F5] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Shortcuts</span>}
              <kbd className="hidden sm:inline-block px-1 rounded bg-white/[0.08] text-[10px]">
                ?
              </kbd>
            </button>

            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-8 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center transition-colors cursor-pointer"
                title="Expand sidebar ([)"
              >
                <PanelLeft className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>

          {/* User Session Mini Card */}
          <div
            className={`rounded-lg bg-[#14171F] border border-white/[0.08] ${
              isSidebarCollapsed ? 'p-1.5 flex justify-center' : 'p-2 flex items-center justify-between'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F4F4F5] truncate leading-tight">
                    {user?.name || 'R. K. Chatterjee'}
                  </div>
                  <div className="text-[10px] font-mono text-[#A1A1AA] truncate leading-tight mt-0.5">
                    {role} · {expiryTimerString}
                  </div>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="p-1 rounded text-[#A1A1AA] hover:text-[#DC2626] transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-[#FAFAFA]/95 backdrop-blur-md border-b border-[#E4E4E7] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          {/* Breadcrumb Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onReturnToMarketing}
              className="text-xs font-medium text-[#52525B] hover:text-[#09090B] transition-colors truncate cursor-pointer"
            >
              HeatLedger AI
            </button>
            <span className="text-[#A1A1AA]">/</span>
            <span className="text-xs font-semibold text-[#09090B] truncate">{currentTitle}</span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            {(!isOnline || offlineCount > 0) && (
              <span className="px-2 py-1 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center gap-1.5 text-xs font-mono">
                <WifiOff className="w-3.5 h-3.5" />
                <span>{offlineCount} queued</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCaptureModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture MTC</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="h-8 px-2.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs text-[#52525B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Search commands (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline font-mono text-[10px] bg-[#F4F4F5] px-1 rounded border border-[#E4E4E7]">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              className="w-8 h-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-amber-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Grounded Plant Data Assistant"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative w-8 h-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] flex items-center justify-center transition-colors cursor-pointer"
              title="Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <button
              type="button"
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="w-8 h-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#059669] flex items-center justify-center transition-colors cursor-pointer"
              title="Security & Cryptographic Telemetry"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMoreOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] flex items-center justify-center cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Content Body */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <PullToRefresh>
            {currentView === 'command-center' && (
              <CommandCenterView
                onOpenShipmentDossier={handleOpenShipmentDossier}
                onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
                onNavigateToInventory={() => onSelectView('heat-inventory')}
                onNavigateToSignOff={() => onSelectView('sign-off-queue')}
                onTriggerUpload={() => setIsCaptureModalOpen(true)}
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

            {currentView === 'cbam-dossier' && (
              <CbamDossierView initialShipment={selectedShipment} />
            )}

            {currentView === 'supplier-intelligence' && <SupplierIntelligenceView />}

            {currentView === 'supplier-requests' && <SupplierRequestsView />}

            {currentView === 'intake-channels' && (
              <IntakeChannelsView onNavigateToWorkbench={() => onSelectView('mtc-workbench')} />
            )}

            {currentView === 'regulation-radar' && <RegulationRadarView />}

            {currentView === 'roi-reports' && <RoiReportView />}

            {currentView === 'audit-trail' && <AuditTrailView />}

            {currentView === 'consultant-portal' && <ConsultantPortalView />}

            {currentView === 'insights-trends' && <InsightsTrendsView />}

            {currentView === 'api-integrations' && <ApiIntegrationsView />}
          </PullToRefresh>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM TAB BAR (< lg) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0C0E14] border-t border-white/[0.08] px-3 py-1 flex items-center justify-around pb-[max(0.35rem,env(safe-area-inset-bottom))] text-white shadow-xl">
        <button
          type="button"
          onClick={() => onSelectView('command-center')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'command-center'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Home"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-xs mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('mtc-workbench')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'mtc-workbench'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Workbench"
        >
          <FlaskConical className="w-5 h-5" />
          <span className="text-xs mt-0.5">Workbench</span>
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsCaptureModalOpen(true)}
          className="w-11 h-11 rounded-xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-md"
          aria-label="Capture or upload MTC"
        >
          <Camera className="w-5 h-5" />
        </motion.button>

        <button
          type="button"
          onClick={() => onSelectView('heat-inventory')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'heat-inventory'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Heat Inventory"
        >
          <Database className="w-5 h-5" />
          <span className="text-xs mt-0.5">Heats</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            isMobileMoreOpen
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="More Workspaces"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs mt-0.5">More</span>
        </button>
      </nav>

      {/* 4. MODALS & SHEETS */}
      <CaptureChoiceModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onSelectFile={handleFileCaptured}
        onSelectPreset={handlePresetSelected}
      />

      <PlantSwitcherModal
        isOpen={isPlantSwitcherOpen}
        onClose={() => setIsPlantSwitcherOpen(false)}
        activePlantId={activePlant.id}
        onSelectPlant={handleSelectPlant}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onTriggerCapture={() => {
          setIsCommandPaletteOpen(false);
          setIsCaptureModalOpen(true);
        }}
        onTriggerPlantSwitch={() => {
          setIsCommandPaletteOpen(false);
          setIsPlantSwitcherOpen(true);
        }}
        onTriggerSecurity={() => {
          setIsCommandPaletteOpen(false);
          setIsSecurityDrawerOpen(true);
        }}
        onTriggerPinModal={() => {
          setIsCommandPaletteOpen(false);
          openPinModal();
        }}
      />

      <MobileMoreSheet
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        activePlant={activePlant}
        onOpenPlantSwitcher={() => setIsPlantSwitcherOpen(true)}
        onOpenSecurity={() => setIsSecurityDrawerOpen(true)}
        onOpenPinModal={openPinModal}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <InspectorPinChallengeModal isOpen={isPinModalOpen} onClose={closePinModal} />

      <SecurityTelemetryDrawer
        isOpen={isSecurityDrawerOpen}
        onClose={() => setIsSecurityDrawerOpen(false)}
      />

      <AssistantBottomSheet
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
};
