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
        'share-portal',
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
    if (path.includes('/share') || path.includes('/portal')) return 'share-portal';
    if (path.includes('/home') || path.includes('/command')) return 'command-center';
    if (path.includes('/upload') || path.includes('/certificates') || path.includes('/review'))
      return 'mtc-workbench';
    if (path.includes('/sign-off') || path.includes('/queue')) return 'sign-off-queue';
    if (path.includes('/heats') || path.includes('/inventory')) return 'heat-inventory';
    if (path.includes('/cbam') || path.includes('/dossiers') || path.includes('/shipments'))
      return 'cbam-dossier';
    if (path.includes('/settings')) return 'settings';

    // Advanced feature routes (fallback/backward-compatibility)
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
    if (path.includes('/radar') || path.includes('/deadlines') || path.includes('/regulations'))
      return 'regulation-radar';

    // Default /app
    return 'command-center';
  }, [location.pathname, searchParams]);

  const presetId = searchParams.get('preset') || undefined;

  const handleSelectView = (view: DashboardView) => {
    switch (view) {
      case 'command-center':
        navigate('/app/home');
        break;
      case 'mtc-workbench':
        navigate('/app/upload');
        break;
      case 'heat-inventory':
        navigate('/app/heats');
        break;
      case 'cbam-dossier':
      case 'sign-off-queue':
        navigate('/app/shipments');
        break;
      case 'share-portal':
        navigate('/app/share');
        break;
      case 'settings':
        navigate('/app/settings');
        break;
      default:
        navigate(`/app/home?view=${view}`);
        break;
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
