import React, { useMemo } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { DashboardView } from '../types';

export const AppShellPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams();

  // Map URL path or query parameter to DashboardView
  const currentView: DashboardView = useMemo(() => {
    const queryView = searchParams.get('view') as DashboardView;
    if (
      queryView &&
      [
        'command-center',
        'mtc-workbench',
        'sign-off-queue',
        'heat-inventory',
        'cbam-dossier',
        'regulation-radar',
        'roi-reports',
        'supplier-intelligence',
        'supplier-requests',
        'intake-channels',
        'audit-trail',
        'consultant-portal',
        'insights-trends',
        'api-integrations',
        'settings',
      ].includes(queryView)
    ) {
      return queryView;
    }

    const path = location.pathname.toLowerCase();
    if (path.includes('/integrations') || path.includes('/api-keys') || path.includes('/webhooks'))
      return 'api-integrations';
    if (path.includes('/insights') || path.includes('/trends'))
      return 'insights-trends';
    if (path.includes('/consultant') || path.includes('/multi-plant') || path.includes('/clients'))
      return 'consultant-portal';
    if (path.includes('/audit') || path.includes('/approvals') || path.includes('/hash-chain'))
      return 'audit-trail';
    if (path.includes('/roi') || path.includes('/proof-of-value') || path.includes('/reports'))
      return 'roi-reports';
    if (path.includes('/supplier-requests') || path.includes('/requests')) return 'supplier-requests';
    if (path.includes('/suppliers')) return 'supplier-intelligence';
    if (path.includes('/intake') || path.includes('/channels') || path.includes('/whatsapp'))
      return 'intake-channels';
    if (path.includes('/certificates') || path.includes('/review'))
      return 'mtc-workbench';
    if (path.includes('/sign-off') || path.includes('/queue')) return 'sign-off-queue';
    if (path.includes('/heats')) return 'heat-inventory';
    if (path.includes('/cbam') || path.includes('/dossiers'))
      return 'cbam-dossier';
    if (path.includes('/radar') || path.includes('/deadlines') || path.includes('/regulations'))
      return 'regulation-radar';
    if (path.includes('/settings')) return 'settings';

    // Default /app or /app/shipments
    return 'command-center';
  }, [location.pathname, searchParams]);

  const presetId = searchParams.get('preset') || undefined;

  const handleSelectView = (view: DashboardView) => {
    switch (view) {
      case 'command-center':
        navigate('/app/shipments');
        break;
      case 'mtc-workbench':
        navigate('/app/certificates');
        break;
      case 'sign-off-queue':
        navigate('/app/sign-off');
        break;
      case 'heat-inventory':
        navigate('/app/heats');
        break;
      case 'cbam-dossier':
        navigate('/app/dossiers');
        break;
      case 'regulation-radar':
        navigate('/app/radar');
        break;
      case 'roi-reports':
        navigate('/app/roi');
        break;
      case 'audit-trail':
        navigate('/app/audit');
        break;
      case 'consultant-portal':
        navigate('/app/consultant');
        break;
      case 'supplier-intelligence':
        navigate('/app/suppliers');
        break;
      case 'supplier-requests':
        navigate('/app/supplier-requests');
        break;
      case 'intake-channels':
        navigate('/app/intake');
        break;
      case 'insights-trends':
        navigate('/app/insights');
        break;
      case 'api-integrations':
        navigate('/app/integrations');
        break;
      case 'settings':
        navigate('/app/settings');
        break;
      default:
        navigate('/app');
    }
  };

  const handleReturnToMarketing = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardShell
      currentView={currentView}
      onSelectView={handleSelectView}
      onReturnToMarketing={handleReturnToMarketing}
      initialPresetId={presetId}
    />
  );
};

export default AppShellPage;
