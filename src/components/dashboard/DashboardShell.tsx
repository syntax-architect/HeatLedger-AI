import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
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
const ShareVerifyView = lazy(() =>
  import('./views/ShareVerifyView').then((m) => ({ default: m.ShareVerifyView }))
);
import { getFeatureFlags } from '../../config/features';

const viewLoaders: Record<string, () => Promise<any>> = {
  'command-center': () => import('./views/CommandCenterView'),
  'mtc-workbench': () => import('./views/MtcWorkbenchView'),
  'heat-inventory': () => import('./views/HeatInventoryView'),
  'sign-off-queue': () => import('./views/SignOffQueueView'),
  'cbam-dossier': () => import('./views/CbamDossierView'),
  'share-portal': () => import('./views/ShareVerifyView'),
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
    case 'share-portal':
      return { title: 'Share & Verify Portal', type: 'table', hasKpis: false };
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
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { InspectorPinChallengeModal } from './modals/InspectorPinChallengeModal';
import { SecurityTelemetryDrawer } from './modals/SecurityTelemetryDrawer';
import { PlantSwitcherModal, PlantProfile, REGISTERED_PLANTS } from './PlantSwitcherModal';
import { NotificationsModal } from './NotificationsModal';
import { CaptureChoiceModal } from './CaptureChoiceModal';
import { CommandPalette } from './CommandPalette';
import { MobileMoreSheet } from './MobileMoreSheet';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { PullToRefresh } from '../common/PullToRefresh';
import { ErrorBoundary } from '../common/ErrorBoundary';
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
  Share2,
  Settings as SettingsIcon,
  Sparkles,
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
  'share-portal': 'Share & Verify',
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
  const { t } = useTranslation();
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
            r: 'supplier-requests',
            i: 'intake-channels',
            w: 'regulation-radar',
            o: 'roi-reports',
            a: 'audit-trail',
            p: 'consultant-portal',
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

  const dynamicViewTitles: Record<DashboardView, string> = {
    'command-center': t('nav.command_center', 'Command Center'),
    'mtc-workbench': t('nav.workbench', 'MTC Workbench'),
    'heat-inventory': t('nav.heats', 'Heat Inventory'),
    'sign-off-queue': t('nav.sign_off_queue', 'Clause 6 Sign-Off'),
    'cbam-dossier': t('nav.dossier', 'Customs Dossier'),
    'share-portal': t('nav.share_portal', 'Share & Verify'),
    'supplier-intelligence': t('nav.supplier_intel', 'Supplier Intelligence'),
    'supplier-requests': t('nav.supplier_requests', 'CBAM Data Requests'),
    'intake-channels': t('nav.intake_channels', 'Intake Channels'),
    'regulation-radar': t('nav.regulation_radar', 'Regulation Radar'),
    'roi-reports': t('nav.roi_reports', 'ROI & Value Report'),
    'audit-trail': t('nav.audit_trail', 'Audit Trail & Approvals'),
    'consultant-portal': t('nav.consultant_portal', 'Consultant & Multi-Plant'),
    'insights-trends': t('nav.insights_trends', 'Insights & Trends'),
    'api-integrations': t('nav.api_integrations', 'API & Integrations'),
    settings: t('nav.settings', 'Plant Settings'),
  };

  const flags = getFeatureFlags();

  const coreItems: {
    id: DashboardView;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'command-center', label: t('nav.home', 'Home'), icon: LayoutDashboard },
    { id: 'mtc-workbench', label: t('nav.upload_review', 'Upload & Review'), icon: FlaskConical },
    { id: 'heat-inventory', label: t('nav.heats_short', 'Heats'), icon: Database },
    {
      id: 'cbam-dossier',
      label: t('nav.shipments', 'Shipments'),
      icon: FileCode,
      badge: pendingSignOffCount > 0 ? String(pendingSignOffCount) : undefined,
    },
    { id: 'share-portal', label: t('nav.share_portal', 'Share & Verify'), icon: Share2 },
    { id: 'settings', label: t('nav.settings_nav', 'Settings'), icon: SettingsIcon },
  ];

  const advancedItems: {
    id: DashboardView;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [];

  if (flags.supplierIntelligence) {
    advancedItems.push({ id: 'supplier-intelligence', label: t('nav.supplier_intel', 'Supplier Intel'), icon: Building2 });
  }
  if (flags.supplierRequests) {
    advancedItems.push({ id: 'supplier-requests', label: t('nav.supplier_requests', 'CBAM Requests'), icon: Send });
  }
  if (flags.intakeChannels) {
    advancedItems.push({ id: 'intake-channels', label: t('nav.intake_channels', 'Intake Channels'), icon: MessageSquare });
  }
  if (flags.regulationRadar) {
    advancedItems.push({ id: 'regulation-radar', label: t('nav.regulation_radar', 'Regulation Radar'), icon: Compass });
  }
  if (flags.insightsTrends) {
    advancedItems.push({ id: 'insights-trends', label: t('nav.insights_trends', 'Insights & Trends'), icon: TrendingUp });
  }
  if (flags.roiReports) {
    advancedItems.push({ id: 'roi-reports', label: t('nav.roi_reports', 'ROI Report'), icon: FileText });
  }
  if (flags.auditTrailStandalone) {
    advancedItems.push({ id: 'audit-trail', label: t('nav.audit_trail', 'Audit Trail'), icon: ShieldCheck });
  }
  if (flags.consultantPortal) {
    advancedItems.push({ id: 'consultant-portal', label: t('nav.consultant_portal', 'Multi-Plant Mode'), icon: Briefcase });
  }
  if (flags.apiIntegrations) {
    advancedItems.push({ id: 'api-integrations', label: t('nav.api_integrations', 'Integrations & API'), icon: Sliders });
  }

  const isFullOperationsMode = useMemo(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('preset') || params.get('mode') === 'operations' || localStorage.getItem('hl_nav_style') === 'operations') {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return Boolean(initialPresetId);
  }, [initialPresetId]);

  const factoryOperationsItems = [
    { id: 'command-center' as DashboardView, label: t('nav.command_center', 'Command Center'), icon: LayoutDashboard },
    { id: 'mtc-workbench' as DashboardView, label: t('nav.mtc_workbench', 'MTC Workbench'), icon: FlaskConical },
    { id: 'heat-inventory' as DashboardView, label: t('nav.heat_inventory', 'Heat Inventory'), icon: Database },
    {
      id: 'sign-off-queue' as DashboardView,
      label: t('nav.sign_off_queue', 'Clause 6 Sign-Off'),
      icon: Stamp,
      badge: pendingSignOffCount > 0 ? String(pendingSignOffCount) : undefined,
    },
  ];

  const customsPrecursorsItems = [
    { id: 'cbam-dossier' as DashboardView, label: t('nav.cbam_dossier', 'Customs Dossier'), icon: FileCode },
    { id: 'supplier-intelligence' as DashboardView, label: t('nav.supplier_intel', 'Supplier Intelligence'), icon: Building2 },
    { id: 'supplier-requests' as DashboardView, label: t('nav.supplier_requests', 'CBAM Data Requests'), icon: MessageSquare },
    { id: 'intake-channels' as DashboardView, label: t('nav.intake_channels', 'Intake Channels'), icon: Send },
  ];

  const complianceIntelligenceItems = [
    { id: 'regulation-radar' as DashboardView, label: t('nav.regulation_radar', 'Regulation Radar'), icon: Compass },
    { id: 'roi-reports' as DashboardView, label: t('nav.roi_reports', 'ROI & Value Report'), icon: TrendingUp },
    { id: 'audit-trail' as DashboardView, label: t('nav.audit_trail', 'Audit Trail & Approvals'), icon: FileText },
    { id: 'consultant-portal' as DashboardView, label: t('nav.consultant_portal', 'Consultant & Multi-Plant'), icon: Briefcase },
    { id: 'insights-trends' as DashboardView, label: t('nav.insights_trends', 'Insights & Trends'), icon: Sparkles },
    { id: 'api-integrations' as DashboardView, label: t('nav.api_integrations', 'API & Integrations'), icon: Sliders },
  ];

  const sidebarSections = isFullOperationsMode
    ? [
        {
          title: 'FACTORY OPERATIONS',
          items: factoryOperationsItems,
        },
        {
          title: 'CUSTOMS & PRECURSORS',
          items: customsPrecursorsItems,
        },
        {
          title: 'COMPLIANCE & INTELLIGENCE',
          items: complianceIntelligenceItems,
        },
      ]
    : [
        {
          title: t('dashboard.sections.core', 'Workspace'),
          items: coreItems,
        },
        ...(advancedItems.length > 0
          ? [
              {
                title: t('dashboard.sections.advanced', 'Advanced (Beta)'),
                items: advancedItems,
              },
            ]
          : []),
      ];

  const role = user?.role || 'QA_INSPECTOR';
  const currentTitle = dynamicViewTitles[currentView] || VIEW_TITLES[currentView] || 'Workspace';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FAFAFA] flex flex-col lg:flex-row font-sans text-[#09090B] selection:bg-emerald-600/20 selection:text-[#09090B]">
      {/* 1. DESKTOP LEFT RAIL (Spacious 256px deep carbon #0B0F17, collapsible to 68px) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 select-none z-30 transition-[width] duration-200 ease-out bg-[#0B0F17] text-[#F4F4F5] border-r border-white/[0.08] shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)] ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Pinned Top Zone: Brand Header & Workspace Plant Switcher (Fixed - Never Scrolls) */}
        <div className="flex-shrink-0 px-3.5 pt-3.5 pb-3 border-b border-white/[0.08] space-y-3 bg-[#0B0F17]">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            {isSidebarCollapsed ? (
              <div className="mx-auto flex flex-col items-center gap-1">
                <HexagonalIngotIcon size={26} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    QA App
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Collapse sidebar ([)"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Workspace Plant Switcher */}
          <button
            type="button"
            onClick={() => setIsPlantSwitcherOpen(true)}
            className={`w-full flex items-center rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.15] text-left transition-all cursor-pointer group shadow-sm ${
              isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
            }`}
            title={`${activePlant.name} (${activePlant.installationId})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-100 truncate leading-snug flex items-center gap-1.5">
                    <span className="truncate">{activePlant.shortName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Operational" />
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-zinc-400 truncate leading-tight mt-0.5">
                    {activePlant.installationId}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0 ml-1" />
            )}
          </button>
        </div>

        {/* Middle Zone: Scrollable Workspace Navigation */}
        <div
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-4"
        >
          <nav className="space-y-4" aria-label="Workspace Navigation">
            {sidebarSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {!isSidebarCollapsed && (
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
                    <span>{section.title}</span>
                  </div>
                )}
                <div className="space-y-0.5">
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
                        className={`relative w-full flex items-center rounded-lg text-[13px] font-medium transition-all min-h-[35px] cursor-pointer group ${
                          isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
                        } ${
                          isActive
                            ? 'text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            className="absolute inset-0 rounded-lg bg-emerald-500/12 border border-emerald-500/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                          />
                        )}

                        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]'
                                : 'text-zinc-400 group-hover:text-zinc-200'
                            }`}
                          />
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isSidebarCollapsed && item.badge && (
                          <span className="relative z-10 text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 leading-none">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Zone: Pinned Inspector Session, Security & Utilities (Fixed - Never Scrolls) */}
        <div className="flex-shrink-0 p-3 border-t border-white/[0.08] space-y-2 bg-[#0B0F17]">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Expand sidebar ([)"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSecurityDrawerOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                title="Security Telemetry (Ed25519)"
                aria-label="Security Telemetry"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Keyboard Shortcuts (?)"
                aria-label="Keyboard Shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onReturnToMarketing}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Return to Public Site"
                aria-label="Return to Public Site"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Security Telemetry Trigger */}
              <button
                type="button"
                onClick={() => setIsSecurityDrawerOpen(true)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer group"
                title="Security & Cryptographic Telemetry"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Security Telemetry</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">
                  Ed25519
                </span>
              </button>

              {/* User Profile Card (Google AI Studio visual fidelity) */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                        {user?.name || 'R. K. Chatterjee'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                        {role.replace('_', ' ')} · <span className="font-mono">{user?.emp_id || 'Session: Active'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Clean Footer Row: Return to Marketing & Shortcuts */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsShortcutsOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Keyboard Shortcuts (?)"
                  aria-label="Keyboard Shortcuts"
                >
                  <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Shortcuts</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-400 leading-none">
                    ?
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={onReturnToMarketing}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Return to Public Site"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Exit</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-clip pb-24 lg:pb-8">
        {/* DESKTOP TOP WORKSPACE BAR (Compact 56px daylight white) */}
        <header className="hidden lg:flex h-14 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E4E4E7] px-6 sticky top-0 z-20 items-center justify-between gap-4">
          {/* Left: Breadcrumb matching AI Studio screenshot */}
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="text-[#52525B] font-medium truncate">HeatLedger AI</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            <span className="font-semibold text-[#09090B] truncate">{currentTitle}</span>
          </div>

          {/* Right: Studio CTA Order (Capture MTC -> Search -> Sparkles -> Alerts -> Security) */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsCaptureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
              title="Upload or capture MTC (U)"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture MTC</span>
            </motion.button>

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
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-9 h-9 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-amber-500 border border-[#E4E4E7] flex items-center justify-center transition-colors cursor-pointer"
              title="AI Assistant"
              aria-label="AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
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

            <LanguageSwitcher compact />
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

            <LanguageSwitcher compact />
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
                <ErrorBoundary inline>
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

                  {currentView === 'share-portal' && <ShareVerifyView />}

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
                  {currentView === 'settings' && (
                    <SettingsView
                      activePlant={activePlant}
                      onOpenPlantSwitcher={() => setIsPlantSwitcherOpen(true)}
                      onOpenSecurity={() => setIsSecurityDrawerOpen(true)}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
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
          aria-label="Home"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-xs mt-0.5">{t('nav.home', 'Home')}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('mtc-workbench')}
          onMouseEnter={() => preloadDashboardView('mtc-workbench')}
          onTouchStart={() => preloadDashboardView('mtc-workbench')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'mtc-workbench'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Upload"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs mt-0.5">{t('nav.upload', 'Upload')}</span>
        </button>

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
          aria-label="Heats"
        >
          <Database className="w-5 h-5" />
          <span className="text-xs mt-0.5">{t('nav.heats_short', 'Heats')}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView('cbam-dossier')}
          onMouseEnter={() => preloadDashboardView('cbam-dossier')}
          onTouchStart={() => preloadDashboardView('cbam-dossier')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'cbam-dossier' || currentView === 'sign-off-queue'
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="Shipments"
        >
          <FileCode className="w-5 h-5" />
          <span className="text-xs mt-0.5">{t('nav.shipments_short', 'Shipments')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
            isMobileMoreOpen
              ? 'text-emerald-400 font-medium'
              : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
          }`}
          aria-label="More"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs mt-0.5">{t('nav.more', 'More')}</span>
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
