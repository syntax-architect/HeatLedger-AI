import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardView, ShipmentRecord } from '../../types';
import { ViewSkeleton } from '../common/ViewSkeleton';

const CommandCenterView = lazy(() =>
  import('./views/CommandCenterView').then((m) => ({ default: m.CommandCenterView }))
);
const MtcWorkbenchView = lazy(() =>
  import('./views/MtcWorkbenchView').then((m) => ({ default: m.MtcWorkbenchView }))
);
const HeatInventoryView = lazy(() =>
  import('./views/HeatInventoryView').then((m) => ({ default: m.HeatInventoryView }))
);
const SignOffQueueView = lazy(() =>
  import('./views/SignOffQueueView').then((m) => ({ default: m.SignOffQueueView }))
);
const CbamDossierView = lazy(() =>
  import('./views/CbamDossierView').then((m) => ({ default: m.CbamDossierView }))
);
const SupplierIntelligenceView = lazy(() =>
  import('./views/SupplierIntelligenceView').then((m) => ({ default: m.SupplierIntelligenceView }))
);
const SupplierRequestsView = lazy(() =>
  import('./views/SupplierRequestsView').then((m) => ({ default: m.SupplierRequestsView }))
);
const IntakeChannelsView = lazy(() =>
  import('./views/IntakeChannelsView').then((m) => ({ default: m.IntakeChannelsView }))
);
const RegulationRadarView = lazy(() =>
  import('./views/RegulationRadarView').then((m) => ({ default: m.RegulationRadarView }))
);
const RoiReportView = lazy(() =>
  import('./views/RoiReportView').then((m) => ({ default: m.RoiReportView }))
);
const AuditTrailView = lazy(() =>
  import('./views/AuditTrailView').then((m) => ({ default: m.AuditTrailView }))
);
const ConsultantPortalView = lazy(() =>
  import('./views/ConsultantPortalView').then((m) => ({ default: m.ConsultantPortalView }))
);
const InsightsTrendsView = lazy(() =>
  import('./views/InsightsTrendsView').then((m) => ({ default: m.InsightsTrendsView }))
);
const ApiIntegrationsView = lazy(() =>
  import('./views/ApiIntegrationsView').then((m) => ({ default: m.ApiIntegrationsView }))
);
const SettingsView = lazy(() =>
  import('./views/SettingsView').then((m) => ({ default: m.SettingsView }))
);

const viewLoaders: Record<string, () => Promise<any>> = {
  'command-center': () => import('./views/CommandCenterView'),
  'mtc-workbench': () => import('./views/MtcWorkbenchView'),
  'heat-inventory': () => import('./views/HeatInventoryView'),
  'sign-off-queue': () => import('./views/SignOffQueueView'),
  'cbam-dossier': () => import('./views/CbamDossierView'),
  'supplier-intelligence': () => import('./views/SupplierIntelligenceView'),
  'supplier-requests': () => import('./views/SupplierRequestsView'),
  'intake-channels': () => import('./views/IntakeChannelsView'),
  'regulation-radar': () => import('./views/RegulationRadarView'),
  'roi-reports': () => import('./views/RoiReportView'),
  'audit-trail': () => import('./views/AuditTrailView'),
  'consultant-portal': () => import('./views/ConsultantPortalView'),
  'insights-trends': () => import('./views/InsightsTrendsView'),
  'api-integrations': () => import('./views/ApiIntegrationsView'),
  'settings': () => import('./views/SettingsView'),
};

export const preloadDashboardView = (view: DashboardView) => {
  const loader = viewLoaders[view];
  if (loader) {
    loader();
  }
};

const getSkeletonPropsForView = (
  view: DashboardView
): { title?: string; type?: 'table' | 'cards' | 'chart' | 'workbench'; hasKpis?: boolean } => {
  switch (view) {
    case 'command-center':
      return { title: 'Command Center', type: 'cards', hasKpis: true };
    case 'mtc-workbench':
      return { title: 'MTC Review Workbench', type: 'workbench', hasKpis: false };
    case 'heat-inventory':
      return { title: 'Heat Inventory & Mass Balance', type: 'table', hasKpis: true };
    case 'sign-off-queue':
      return { title: 'Release Gate & Clause 6 Sign-Off', type: 'table', hasKpis: true };
    case 'cbam-dossier':
      return { title: 'CBAM Dossier Packaging', type: 'workbench', hasKpis: true };
    case 'supplier-intelligence':
      return { title: 'Supplier Intelligence & Tier-1 Graph', type: 'cards', hasKpis: true };
    case 'supplier-requests':
      return { title: 'Supplier CBAM Data Intake Requests', type: 'table', hasKpis: true };
    case 'intake-channels':
      return { title: 'WhatsApp & Email Intake Channels', type: 'cards', hasKpis: false };
    case 'regulation-radar':
      return { title: 'Customs & CBAM Regulation Radar', type: 'cards', hasKpis: false };
    case 'roi-reports':
      return { title: 'ROI & Proof of Value Memorandum', type: 'chart', hasKpis: true };
    case 'audit-trail':
      return { title: 'Tamper-Evident Audit Trail', type: 'table', hasKpis: false };
    case 'consultant-portal':
      return { title: 'Consultant & Multi-Plant Headquarters', type: 'table', hasKpis: true };
    case 'insights-trends':
      return { title: 'Emissions Trends & CBAM Forecasts', type: 'chart', hasKpis: true };
    case 'api-integrations':
      return { title: 'API Keys, Webhooks & ERP Exports', type: 'table', hasKpis: false };
    default:
      return { type: 'table', hasKpis: true };
  }
};

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
  Building2,
  MessageSquare,
  Send,
  ArrowLeft,
  ChevronRight,
  ChevronsUpDown,
  ShieldCheck,
  Menu,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Upload,
  Camera,
  WifiOff,
  LogOut,
  Keyboard,
  Compass,
  TrendingUp,
  FileText,
  Sliders,
  Briefcase,
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

  // Global keyboard shortcuts (Cmd+K, ?, [, U, and G+<view> chords)
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

      // Chord navigation: G then C/M/H/Q/D/S
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

  const handleFileCaptured = useCallback(
    (file: File) => {
      setUploadedFileForWorkbench(file);
      onSelectView('mtc-workbench');
    },
    [onSelectView]
  );

  const handlePresetSelected = useCallback(
    (presetId: string) => {
      setSelectedPresetIdForWorkbench(presetId);
      onSelectView('mtc-workbench');
    },
    [onSelectView]
  );

  const handleOpenShipmentDossier = (shipment: ShipmentRecord) => {
    setSelectedShipment(shipment);
    onSelectView('cbam-dossier');
  };

  const sidebarSections: {
    title: string;
    items: {
      id: DashboardView;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: string;
    }[];
  }[] = [
    {
      title: 'Factory QA & Traceability',
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
        { id: 'cbam-dossier', label: 'Customs Dossier', icon: FileCode },
        { id: 'supplier-intelligence', label: 'Supplier Intel', icon: Building2 },
        { id: 'supplier-requests', label: 'CBAM Data Requests', icon: Send },
        { id: 'intake-channels', label: 'Intake Channels', icon: MessageSquare },
      ],
    },
    {
      title: 'Compliance & Intelligence',
      items: [
        { id: 'regulation-radar', label: 'Regulation Radar', icon: Compass },
        { id: 'insights-trends', label: 'Insights & Trends', icon: TrendingUp },
        { id: 'roi-reports', label: 'ROI & Grant Report', icon: FileText },
        { id: 'audit-trail', label: 'Audit Trail', icon: ShieldCheck },
        { id: 'consultant-portal', label: 'Multi-Plant Mode', icon: Briefcase },
        { id: 'api-integrations', label: 'Integrations & API', icon: Sliders },
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
          isSidebarCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Top Zone: Brand, Compact Plant Switcher & Navigation */}
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

          {/* Compact Plant Switcher at Top */}
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
                  <div className="text-xs font-mono tabular-nums text-[#A1A1AA] truncate leading-tight mt-0.5">
                    {activePlant.installationId}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            )}
          </button>

          {/* Navigation Items with Sliding Framer Motion Active Pill */}
          <nav className="space-y-3" aria-label="Workspace Navigation">
            {sidebarSections.map((section) => (
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
                      onMouseEnter={() => preloadDashboardView(item.id)}
                      onFocus={() => preloadDashboardView(item.id)}
                      onTouchStart={() => preloadDashboardView(item.id)}
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
                        <span className="relative z-10 text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-white/[0.1] text-[#F4F4F5] leading-none">
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

        {/* Bottom Zone: Expand Toggle, Shortcuts, Inspector Session & Security Telemetry */}
        <div className="p-3 border-t border-white/[0.08] space-y-1.5">
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Expand sidebar ([)"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Security Telemetry Trigger */}
          <button
            type="button"
            onClick={() => setIsSecurityDrawerOpen(true)}
            className={`w-full flex items-center rounded-lg text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.05] transition-colors h-8 cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
            }`}
            title="Security & Cryptographic Telemetry"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Security Telemetry</span>}
            </span>
            {!isSidebarCollapsed && (
              <span className="text-xs font-mono text-emerald-400">Ed25519</span>
            )}
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className={`w-full flex items-center rounded-lg text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.05] transition-colors h-8 cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
            }`}
            title="Keyboard Shortcuts (?)"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Keyboard className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Shortcuts</span>}
            </span>
            {!isSidebarCollapsed && (
              <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[#A1A1AA] leading-none">
                ?
              </kbd>
            )}
          </button>

          {/* Inspector Session Card */}
          {isAuthenticated ? (
            <div
              className={`rounded-lg bg-[#14171F] border border-white/[0.08] ${
                isSidebarCollapsed ? 'p-1.5 flex justify-center' : 'p-2.5 space-y-2'
              }`}
            >
              {isSidebarCollapsed ? (
                <button
                  type="button"
                  className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-semibold text-xs text-emerald-300 cursor-pointer"
                  title={`${user?.name || 'Inspector'} (${role})`}
                  onClick={() => setIsMobileMoreOpen(true)}
                >
                  {user?.name?.[0] || 'R'}
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#F4F4F5] truncate">
                        {user?.name || 'R. K. Chatterjee'}
                      </div>
                      <div className="text-xs text-[#A1A1AA] truncate">
                        {role.replace('_', ' ')} ·{' '}
                        <span className="font-mono tabular-nums">{user?.emp_id || 'QA-04'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                      title="Sign out"
                      aria-label="Sign out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-xs text-[#A1A1AA]">
                    <span>Session active</span>
                    <span className="font-mono tabular-nums">{expiryTimerString}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            !isSidebarCollapsed && (
              <div className="px-2.5 py-2 rounded-lg bg-[#14171F] border border-amber-500/25 space-y-1">
                <div className="text-xs font-medium text-amber-300">Sandbox Preview</div>
                <p className="text-xs text-[#A1A1AA] leading-snug">
                  Sample mill records active.
                </p>
              </div>
            )
          )}

          {/* Return to Public Site */}
          <button
            type="button"
            onClick={onReturnToMarketing}
            className={`w-full flex items-center rounded-lg text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.05] transition-colors h-8 cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-2.5'
            }`}
            title="Return to Public Site"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Back to website</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-clip pb-24 lg:pb-8">
        {/* DESKTOP TOP WORKSPACE BAR (Compact 56px daylight white) */}
        <header className="hidden lg:flex h-14 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E4E4E7] px-6 sticky top-0 z-20 items-center justify-between gap-4">
          {/* Left: Breadcrumb + Active Installation ID */}
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <button
              type="button"
              onClick={() => setIsPlantSwitcherOpen(true)}
              className="text-[#52525B] hover:text-[#09090B] font-medium truncate transition-colors cursor-pointer"
            >
              {activePlant.shortName}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            <span className="font-semibold text-[#09090B] truncate">{currentTitle}</span>
            <span className="text-[#E4E4E7] mx-1" aria-hidden="true">
              |
            </span>
            <span className="font-mono tabular-nums text-[#52525B] shrink-0">
              {activePlant.installationId}
            </span>
          </div>

          {/* Right: Status Pill (when needed), Cmd+K, Bell, Shield, Primary Upload MTC CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {!isOnline || offlineCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  {isOnline ? `${offlineCount} queued` : 'Offline'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                <span>EN 10204 3.1</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="inline-flex items-center gap-2 px-2.5 h-9 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] text-xs border border-[#E4E4E7] transition-colors cursor-pointer"
              title="Open Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="font-mono text-xs text-[#52525B] bg-[#FFFFFF] border border-[#E4E4E7] rounded px-1.5 py-0.5 leading-none">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative w-9 h-9 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] flex items-center justify-center transition-colors cursor-pointer"
              title="QA & Compliance Alerts"
              aria-label="QA & Compliance Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            </button>

            <button
              type="button"
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="w-9 h-9 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#059669] border border-[#E4E4E7] flex items-center justify-center transition-colors cursor-pointer"
              title="Security & Cryptographic Telemetry"
              aria-label="Security Telemetry"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsCaptureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors cursor-pointer"
              title="Upload or capture MTC (U)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload MTC</span>
            </motion.button>
          </div>
        </header>

        {/* MOBILE TOP APP BAR (Below lg only) */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0C0E14] border-b border-white/[0.08] text-[#F4F4F5] px-4 py-2 flex items-center justify-between pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setIsPlantSwitcherOpen(true)}
            className="flex items-center gap-2.5 text-left cursor-pointer min-h-[44px] max-w-[210px]"
            aria-label="Switch factory plant"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-[#F4F4F5] leading-tight truncate flex items-center gap-1">
                <span>{activePlant.shortName}</span>
                <ChevronRight className="w-3 h-3 text-[#A1A1AA] shrink-0" />
              </div>
              <div className="text-xs text-[#A1A1AA] font-mono tabular-nums leading-tight mt-0.5 truncate">
                {activePlant.installationId}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            {(!isOnline || offlineCount > 0) && (
              <span className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 text-xs font-mono tabular-nums">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>{offlineCount}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-11 h-11 rounded-lg bg-[#14171F] border border-white/[0.08] text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
              aria-label="Command search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative w-11 h-11 rounded-lg bg-[#14171F] border border-white/[0.08] text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            </button>

            <button
              type="button"
              onClick={() => setIsSecurityDrawerOpen(true)}
              className="w-11 h-11 rounded-lg bg-[#14171F] border border-white/[0.08] text-emerald-400 flex items-center justify-center cursor-pointer"
              aria-label="Security Telemetry"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Top Offline Notification Banner */}
        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> Network disconnected. Local audits and allocations are queued ({offlineCount} queued) and will sync automatically upon reconnection.
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
              Cached
            </span>
          </div>
        )}

        {/* Workspace Body with Smooth View Transitions */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1440px] mx-auto w-full">
          <PullToRefresh>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Suspense fallback={<ViewSkeleton {...getSkeletonPropsForView(currentView)} />}>
                  {currentView === 'command-center' && (
                    <CommandCenterView
                      onOpenShipmentDossier={handleOpenShipmentDossier}
                      onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
                      onNavigateToInventory={() => onSelectView('heat-inventory')}
                      onNavigateToSignOff={() => onSelectView('sign-off-queue')}
                      onTriggerUpload={() => setIsCaptureModalOpen(true)}
                      pendingSignOffCount={pendingSignOffCount}
                    />
                  )}

                  {currentView === 'mtc-workbench' && (
                    <MtcWorkbenchView
                      initialPresetId={selectedPresetIdForWorkbench}
                      initialUploadedFile={uploadedFileForWorkbench}
                    />
                  )}

                  {currentView === 'heat-inventory' && <HeatInventoryView />}

                  {currentView === 'sign-off-queue' && (
                    <SignOffQueueView
                      onSignCertificate={(remaining) => setPendingSignOffCount(remaining)}
                      onNavigateToDossier={() => onSelectView('cbam-dossier')}
                    />
                  )}

                  {currentView === 'cbam-dossier' && (
                    <CbamDossierView initialShipment={selectedShipment} />
                  )}

                  {currentView === 'supplier-intelligence' && <SupplierIntelligenceView />}

                  {currentView === 'supplier-requests' && <SupplierRequestsView />}

                  {currentView === 'intake-channels' && (
                    <IntakeChannelsView
                      onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
                    />
                  )}

                  {currentView === 'regulation-radar' && <RegulationRadarView />}
                  {currentView === 'roi-reports' && <RoiReportView />}
                  {currentView === 'audit-trail' && <AuditTrailView />}
                  {currentView === 'consultant-portal' && <ConsultantPortalView />}
                  {currentView === 'insights-trends' && <InsightsTrendsView />}
                  {currentView === 'api-integrations' && <ApiIntegrationsView />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Below lg only, >= 44px touch targets) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0C0E14]/95 border-t border-white/[0.08] backdrop-blur-md px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => onSelectView('command-center')}
          onMouseEnter={() => preloadDashboardView('command-center')}
          onTouchStart={() => preloadDashboardView('command-center')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'command-center'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Command Center"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-xs mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('cbam-dossier')}
          onMouseEnter={() => preloadDashboardView('cbam-dossier')}
          onTouchStart={() => preloadDashboardView('cbam-dossier')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'cbam-dossier'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Customs Dossier"
        >
          <FileCode className="w-5 h-5" />
          <span className="text-xs mt-0.5">Dossiers</span>
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsCaptureModalOpen(true)}
          className="w-12 h-12 rounded-xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label="Capture or upload MTC"
        >
          <Camera className="w-5 h-5" />
        </motion.button>

        <button
          type="button"
          onClick={() => onSelectView('heat-inventory')}
          onMouseEnter={() => preloadDashboardView('heat-inventory')}
          onTouchStart={() => preloadDashboardView('heat-inventory')}
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
    </div>
  );
};
