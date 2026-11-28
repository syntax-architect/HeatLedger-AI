import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardView, ShipmentRecord } from '../../types';
import { ViewSkeleton, ViewSkeletonProps } from '../common/ViewSkeleton';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PullToRefresh } from '../common/PullToRefresh';
import { PlantProfile } from './PlantSwitcherModal';

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
} from './views';

function getSkeletonPropsForView(view: DashboardView): ViewSkeletonProps {
  switch (view) {
    case 'command-center':
      return { type: 'cards-and-table', cards: 4, rows: 6, hasActionHeader: true };
    case 'mtc-workbench':
      return { type: 'split-canvas', hasActionHeader: true };
    case 'heat-inventory':
    case 'sign-off-queue':
    case 'audit-trail':
      return { type: 'table-only', rows: 8, cols: 5, hasActionHeader: true };
    case 'cbam-dossier':
    case 'roi-reports':
      return { type: 'cards-and-table', cards: 3, rows: 5, hasActionHeader: true };
    case 'regulation-radar':
    case 'supplier-intelligence':
    case 'supplier-requests':
    case 'intake-channels':
    case 'consultant-portal':
    case 'insights-trends':
    case 'api-integrations':
      return { type: 'cards-and-table', cards: 4, rows: 4, hasActionHeader: true };
    case 'settings':
    case 'share-portal':
    default:
      return { type: 'form-and-cards', hasActionHeader: true };
  }
}

interface DashboardViewRouterProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  selectedShipment?: ShipmentRecord;
  selectedPresetIdForWorkbench?: string;
  uploadedFileForWorkbench?: File | null;
  pendingSignOffCount: number;
  setPendingSignOffCount: (count: number) => void;
  onOpenShipmentDossier: (shipment: ShipmentRecord) => void;
  onTriggerUpload: () => void;
  activePlant: PlantProfile;
  onOpenPlantSwitcher: () => void;
  onOpenSecurity: () => void;
}

export const DashboardViewRouter: React.FC<DashboardViewRouterProps> = ({
  currentView,
  onSelectView,
  selectedShipment,
  selectedPresetIdForWorkbench,
  uploadedFileForWorkbench,
  pendingSignOffCount,
  setPendingSignOffCount,
  onOpenShipmentDossier,
  onTriggerUpload,
  activePlant,
  onOpenPlantSwitcher,
  onOpenSecurity,
}) => {
  return (
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
                  onOpenShipmentDossier={onOpenShipmentDossier}
                  onNavigateToWorkbench={() => onSelectView('mtc-workbench')}
                  onNavigateToInventory={() => onSelectView('heat-inventory')}
                  onNavigateToSignOff={() => onSelectView('sign-off-queue')}
                  onTriggerUpload={onTriggerUpload}
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
                  onOpenPlantSwitcher={onOpenPlantSwitcher}
                  onOpenSecurity={onOpenSecurity}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </PullToRefresh>
  );
};
