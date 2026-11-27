import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardView, ShipmentRecord } from '../../types';
import { ViewSkeleton } from '../common/ViewSkeleton';
import { getFeatureFlags } from '../../config/features';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
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
  ShieldCheck,
  WifiOff,
  Compass,
  TrendingUp,
  FileText,
  Sliders,
  Briefcase,
  Share2,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  ApiIntegrationsView,
  AuditTrailView,
  CbamDossierView,
  CommandCenterView,
  ConsultantPortalView,
  HeatInventoryView,
  InsightsTrendsView,
  IntakeChannelsView,
  MtcWorkbenchView,
  RegulationRadarView,
  RoiReportView,
  SettingsView,
  ShareVerifyView,
  SignOffQueueView,
  SupplierIntelligenceView,
  SupplierRequestsView,
  VIEW_TITLES,
  getSkeletonPropsForView,
  preloadDashboardView,
} from './shell/dashboardRoutes';
import { DashboardSidebar, SidebarNavItem, SidebarSection } from './shell/DashboardSidebar';
import {
  DashboardDesktopHeader,
  DashboardMobileBottomNav,
  DashboardMobileHeader,
} from './shell/DashboardHeadersAndNav';

export { preloadDashboardView };

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
  const { t } = useTranslation();
  const { user, openPinModal, isPinModalOpen, closePinModal, logout } = useAuth();

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

  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isPlantSwitcherOpen, setIsPlantSwitcherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSecurityDrawerOpen, setIsSecurityDrawerOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());

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

  const coreItems: SidebarNavItem[] = [
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

  const advancedItems: SidebarNavItem[] = [];
  if (flags.supplierIntelligence)
    advancedItems.push({ id: 'supplier-intelligence', label: t('nav.supplier_intel', 'Supplier Intel'), icon: Building2 });
  if (flags.supplierRequests)
    advancedItems.push({ id: 'supplier-requests', label: t('nav.supplier_requests', 'CBAM Requests'), icon: Send });
  if (flags.intakeChannels)
    advancedItems.push({ id: 'intake-channels', label: t('nav.intake_channels', 'Intake Channels'), icon: MessageSquare });
  if (flags.regulationRadar)
    advancedItems.push({ id: 'regulation-radar', label: t('nav.regulation_radar', 'Regulation Radar'), icon: Compass });
  if (flags.insightsTrends)
    advancedItems.push({ id: 'insights-trends', label: t('nav.insights_trends', 'Insights & Trends'), icon: TrendingUp });
  if (flags.roiReports)
    advancedItems.push({ id: 'roi-reports', label: t('nav.roi_reports', 'ROI Report'), icon: FileText });
  if (flags.auditTrailStandalone)
    advancedItems.push({ id: 'audit-trail', label: t('nav.audit_trail', 'Audit Trail'), icon: ShieldCheck });
  if (flags.consultantPortal)
    advancedItems.push({ id: 'consultant-portal', label: t('nav.consultant_portal', 'Multi-Plant Mode'), icon: Briefcase });
  if (flags.apiIntegrations)
    advancedItems.push({ id: 'api-integrations', label: t('nav.api_integrations', 'Integrations & API'), icon: Sliders });

  const isFullOperationsMode = useMemo(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (
          params.has('preset') ||
          params.get('mode') === 'operations' ||
          localStorage.getItem('hl_nav_style') === 'operations'
        ) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return Boolean(initialPresetId);
  }, [initialPresetId]);

  const sidebarSections: SidebarSection[] = isFullOperationsMode
    ? [
        {
          title: 'Factory operations',
          items: [
            { id: 'command-center', label: t('nav.command_center', 'Command Center'), icon: LayoutDashboard },
            { id: 'mtc-workbench', label: t('nav.mtc_workbench', 'MTC Workbench'), icon: FlaskConical },
            { id: 'heat-inventory', label: t('nav.heat_inventory', 'Heat Inventory'), icon: Database },
            {
              id: 'sign-off-queue',
              label: t('nav.sign_off_queue', 'Clause 6 Sign-Off'),
              icon: Stamp,
              badge: pendingSignOffCount > 0 ? String(pendingSignOffCount) : undefined,
            },
          ],
        },
        {
          title: 'Customs and precursors',
          items: [
            { id: 'cbam-dossier', label: t('nav.cbam_dossier', 'Customs Dossier'), icon: FileCode },
            { id: 'supplier-intelligence', label: t('nav.supplier_intel', 'Supplier Intelligence'), icon: Building2 },
            { id: 'supplier-requests', label: t('nav.supplier_requests', 'CBAM Data Requests'), icon: MessageSquare },
            { id: 'intake-channels', label: t('nav.intake_channels', 'Intake Channels'), icon: Send },
          ],
        },
        {
          title: 'Compliance and intelligence',
          items: [
            { id: 'regulation-radar', label: t('nav.regulation_radar', 'Regulation Radar'), icon: Compass },
            { id: 'roi-reports', label: t('nav.roi_reports', 'ROI & Value Report'), icon: TrendingUp },
            { id: 'audit-trail', label: t('nav.audit_trail', 'Audit Trail & Approvals'), icon: FileText },
            { id: 'consultant-portal', label: t('nav.consultant_portal', 'Consultant & Multi-Plant'), icon: Briefcase },
            { id: 'insights-trends', label: t('nav.insights_trends', 'Insights & Trends'), icon: TrendingUp },
            { id: 'api-integrations', label: t('nav.api_integrations', 'API & Integrations'), icon: Sliders },
          ],
        },
      ]
    : [
        { title: t('dashboard.sections.core', 'Workspace'), items: coreItems },
        ...(advancedItems.length > 0
          ? [{ title: t('dashboard.sections.advanced', 'Advanced (Beta)'), items: advancedItems }]
          : []),
      ];

  const role = user?.role || 'QA_INSPECTOR';
  const currentTitle = dynamicViewTitles[currentView] || VIEW_TITLES[currentView] || 'Workspace';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F7F5F0] flex flex-col lg:flex-row font-sans text-[#18181A] selection:bg-[#059669]/20 selection:text-[#18181A]">
      <DashboardSidebar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        activePlant={activePlant}
        onOpenPlantSwitcher={() => setIsPlantSwitcherOpen(true)}
        sidebarSections={sidebarSections}
        currentView={currentView}
        onSelectView={onSelectView}
        onOpenSecurityDrawer={() => setIsSecurityDrawerOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onReturnToMarketing={onReturnToMarketing}
        userName={user?.name}
        userEmpId={user?.emp_id}
        role={role}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-clip pb-24 lg:pb-8">
        <DashboardDesktopHeader
          currentTitle={currentTitle}
          onOpenCapture={() => setIsCaptureModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSecurity={() => setIsSecurityDrawerOpen(true)}
        />

        <DashboardMobileHeader
          activePlant={activePlant}
          isOnline={isOnline}
          offlineCount={offlineCount}
          onOpenPlantSwitcher={() => setIsPlantSwitcherOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSecurity={() => setIsSecurityDrawerOpen(true)}
        />

        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="bg-[#FFFBEB] border-b border-[#B45309]/20 px-4 py-2 flex items-center justify-between text-xs text-[#92400E]"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-[#B45309] shrink-0" strokeWidth={1.5} />
              <span>
                <span className="font-medium">Offline mode active:</span> Network disconnected.
                Local audits and allocations are queued ({offlineCount} queued) and will sync upon
                reconnection.
              </span>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FCFBF8] text-[#B45309] border border-[#B45309]/25">
              Cached
            </span>
          </div>
        )}

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
                      <IntakeChannelsView onNavigateToWorkbench={() => onSelectView('mtc-workbench')} />
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

      <DashboardMobileBottomNav
        currentView={currentView}
        isMobileMoreOpen={isMobileMoreOpen}
        onSelectView={onSelectView}
        onOpenMobileMore={() => setIsMobileMoreOpen(true)}
      />

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
