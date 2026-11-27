import { lazy } from 'react';
import { DashboardView } from '../../../types';

export const CommandCenterView = lazy(() =>
  import('../views/CommandCenterView').then((m) => ({ default: m.CommandCenterView }))
);
export const MtcWorkbenchView = lazy(() =>
  import('../views/MtcWorkbenchView').then((m) => ({ default: m.MtcWorkbenchView }))
);
export const HeatInventoryView = lazy(() =>
  import('../views/HeatInventoryView').then((m) => ({ default: m.HeatInventoryView }))
);
export const SignOffQueueView = lazy(() =>
  import('../views/SignOffQueueView').then((m) => ({ default: m.SignOffQueueView }))
);
export const CbamDossierView = lazy(() =>
  import('../views/CbamDossierView').then((m) => ({ default: m.CbamDossierView }))
);
export const SupplierIntelligenceView = lazy(() =>
  import('../views/SupplierIntelligenceView').then((m) => ({ default: m.SupplierIntelligenceView }))
);
export const SupplierRequestsView = lazy(() =>
  import('../views/SupplierRequestsView').then((m) => ({ default: m.SupplierRequestsView }))
);
export const IntakeChannelsView = lazy(() =>
  import('../views/IntakeChannelsView').then((m) => ({ default: m.IntakeChannelsView }))
);
export const RegulationRadarView = lazy(() =>
  import('../views/RegulationRadarView').then((m) => ({ default: m.RegulationRadarView }))
);
export const RoiReportView = lazy(() =>
  import('../views/RoiReportView').then((m) => ({ default: m.RoiReportView }))
);
export const AuditTrailView = lazy(() =>
  import('../views/AuditTrailView').then((m) => ({ default: m.AuditTrailView }))
);
export const ConsultantPortalView = lazy(() =>
  import('../views/ConsultantPortalView').then((m) => ({ default: m.ConsultantPortalView }))
);
export const InsightsTrendsView = lazy(() =>
  import('../views/InsightsTrendsView').then((m) => ({ default: m.InsightsTrendsView }))
);
export const ApiIntegrationsView = lazy(() =>
  import('../views/ApiIntegrationsView').then((m) => ({ default: m.ApiIntegrationsView }))
);
export const SettingsView = lazy(() =>
  import('../views/SettingsView').then((m) => ({ default: m.SettingsView }))
);
export const ShareVerifyView = lazy(() =>
  import('../views/ShareVerifyView').then((m) => ({ default: m.ShareVerifyView }))
);

const viewLoaders: Record<string, () => Promise<any>> = {
  'command-center': () => import('../views/CommandCenterView'),
  'mtc-workbench': () => import('../views/MtcWorkbenchView'),
  'heat-inventory': () => import('../views/HeatInventoryView'),
  'sign-off-queue': () => import('../views/SignOffQueueView'),
  'cbam-dossier': () => import('../views/CbamDossierView'),
  'share-portal': () => import('../views/ShareVerifyView'),
  'supplier-intelligence': () => import('../views/SupplierIntelligenceView'),
  'supplier-requests': () => import('../views/SupplierRequestsView'),
  'intake-channels': () => import('../views/IntakeChannelsView'),
  'regulation-radar': () => import('../views/RegulationRadarView'),
  'roi-reports': () => import('../views/RoiReportView'),
  'audit-trail': () => import('../views/AuditTrailView'),
  'consultant-portal': () => import('../views/ConsultantPortalView'),
  'insights-trends': () => import('../views/InsightsTrendsView'),
  'api-integrations': () => import('../views/ApiIntegrationsView'),
  settings: () => import('../views/SettingsView'),
};

export const preloadDashboardView = (view: DashboardView) => {
  const loader = viewLoaders[view];
  if (loader) {
    loader();
  }
};

export const getSkeletonPropsForView = (
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

export const VIEW_TITLES: Record<DashboardView, string> = {
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
