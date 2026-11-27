import React from 'react';
import {
  Bell,
  Building2,
  Camera,
  ChevronRight,
  Database,
  FileCode,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Upload,
  WifiOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardView } from '../../../types';
import { LanguageSwitcher } from '../../navigation/LanguageSwitcher';
import { PlantProfile } from '../PlantSwitcherModal';
import { preloadDashboardView } from './dashboardRoutes';

interface DashboardDesktopHeaderProps {
  currentTitle: string;
  onOpenCapture: () => void;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
}

export const DashboardDesktopHeader: React.FC<DashboardDesktopHeaderProps> = ({
  currentTitle,
  onOpenCapture,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenSecurity,
}) => (
  <header className="hidden lg:flex h-14 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#18181A]/[0.08] px-6 sticky top-0 z-20 items-center justify-between gap-4">
    <div className="flex items-center gap-2 min-w-0 text-xs">
      <span className="text-[#78766E] font-medium truncate">HeatLedger AI</span>
      <ChevronRight className="w-4 h-4 text-[#78766E] shrink-0" strokeWidth={1.5} />
      <span className="font-medium text-[#18181A] truncate">{currentTitle}</span>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onOpenCapture}
        className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-[#18181A] hover:bg-black text-[#FCFBF8] font-medium text-xs transition-colors active:scale-[0.98] cursor-pointer"
        title="Upload or capture MTC (U)"
      >
        <Camera className="w-4 h-4" strokeWidth={1.5} />
        <span>Capture MTC</span>
      </button>

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] text-xs border border-[#18181A]/10 transition-colors cursor-pointer"
        title="Open Command Palette (Cmd+K)"
      >
        <Search className="w-4 h-4" strokeWidth={1.5} />
        <span className="hidden xl:inline">Search</span>
        <kbd className="font-mono text-xs text-[#78766E] bg-[#FCFBF8] border border-[#18181A]/10 rounded px-1.5 py-0.5 leading-none">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative w-9 h-9 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/10 flex items-center justify-center transition-colors cursor-pointer"
        title="QA & Compliance Alerts"
        aria-label="QA & Compliance Alerts"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
      </button>

      <button
        type="button"
        onClick={onOpenSecurity}
        className="w-9 h-9 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#047857] border border-[#18181A]/10 flex items-center justify-center transition-colors cursor-pointer"
        title="Security & Cryptographic Telemetry"
        aria-label="Security Telemetry"
      >
        <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <LanguageSwitcher compact />
    </div>
  </header>
);

interface DashboardMobileHeaderProps {
  activePlant: PlantProfile;
  isOnline: boolean;
  offlineCount: number;
  onOpenPlantSwitcher: () => void;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
}

export const DashboardMobileHeader: React.FC<DashboardMobileHeaderProps> = ({
  activePlant,
  isOnline,
  offlineCount,
  onOpenPlantSwitcher,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenSecurity,
}) => (
  <header className="lg:hidden sticky top-0 z-30 bg-[#121316] border-b border-[#EAEAEA]/[0.08] text-[#EAEAEA] px-4 py-2 flex items-center justify-between pt-[max(0.5rem,env(safe-area-inset-top))]">
    <button
      type="button"
      onClick={onOpenPlantSwitcher}
      className="flex items-center gap-2.5 text-left cursor-pointer min-h-[44px] max-w-[210px]"
      aria-label="Switch factory plant"
    >
      <div className="w-8 h-8 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/10 flex items-center justify-center text-[#10B981] shrink-0">
        <Building2 className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-xs text-[#EAEAEA] leading-tight truncate flex items-center gap-1">
          <span>{activePlant.shortName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#6F7480] shrink-0" strokeWidth={1.5} />
        </div>
        <div className="text-xs text-[#9FA3AD] font-mono tabular-nums leading-tight mt-0.5 truncate">
          {activePlant.installationId}
        </div>
      </div>
    </button>

    <div className="flex items-center gap-1.5">
      {(!isOnline || offlineCount > 0) && (
        <span className="px-2 py-1 rounded bg-[#181A1F] border border-[#F59E0B]/30 text-[#F59E0B] flex items-center gap-1 text-xs font-mono tabular-nums">
          <WifiOff className="w-4 h-4" strokeWidth={1.5} />
          <span>{offlineCount}</span>
        </span>
      )}

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="w-11 h-11 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08] text-[#9FA3AD] hover:text-[#EAEAEA] flex items-center justify-center cursor-pointer"
        aria-label="Command search"
      >
        <Search className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative w-11 h-11 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08] text-[#9FA3AD] hover:text-[#EAEAEA] flex items-center justify-center cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
      </button>

      <button
        type="button"
        onClick={onOpenSecurity}
        className="w-11 h-11 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08] text-[#10B981] flex items-center justify-center cursor-pointer"
        aria-label="Security Telemetry"
      >
        <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <LanguageSwitcher compact />
    </div>
  </header>
);

interface DashboardMobileBottomNavProps {
  currentView: DashboardView;
  isMobileMoreOpen: boolean;
  onSelectView: (view: DashboardView) => void;
  onOpenMobileMore: () => void;
}

export const DashboardMobileBottomNav: React.FC<DashboardMobileBottomNavProps> = ({
  currentView,
  isMobileMoreOpen,
  onSelectView,
  onOpenMobileMore,
}) => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#121316]/95 border-t border-[#EAEAEA]/[0.08] backdrop-blur-md px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <button
        type="button"
        onClick={() => onSelectView('command-center')}
        onMouseEnter={() => preloadDashboardView('command-center')}
        onTouchStart={() => preloadDashboardView('command-center')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
          currentView === 'command-center'
            ? 'text-[#10B981] font-medium'
            : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
        }`}
        aria-label="Home"
      >
        <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs mt-1">{t('nav.home', 'Home')}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('mtc-workbench')}
        onMouseEnter={() => preloadDashboardView('mtc-workbench')}
        onTouchStart={() => preloadDashboardView('mtc-workbench')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
          currentView === 'mtc-workbench'
            ? 'text-[#10B981] font-medium'
            : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
        }`}
        aria-label="Upload"
      >
        <Upload className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs mt-1">{t('nav.upload', 'Upload')}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('heat-inventory')}
        onMouseEnter={() => preloadDashboardView('heat-inventory')}
        onTouchStart={() => preloadDashboardView('heat-inventory')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
          currentView === 'heat-inventory'
            ? 'text-[#10B981] font-medium'
            : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
        }`}
        aria-label="Heats"
      >
        <Database className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs mt-1">{t('nav.heats_short', 'Heats')}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('cbam-dossier')}
        onMouseEnter={() => preloadDashboardView('cbam-dossier')}
        onTouchStart={() => preloadDashboardView('cbam-dossier')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
          currentView === 'cbam-dossier' || currentView === 'sign-off-queue'
            ? 'text-[#10B981] font-medium'
            : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
        }`}
        aria-label="Shipments"
      >
        <FileCode className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs mt-1">{t('nav.shipments_short', 'Shipments')}</span>
      </button>

      <button
        type="button"
        onClick={onOpenMobileMore}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors cursor-pointer ${
          isMobileMoreOpen ? 'text-[#10B981] font-medium' : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
        }`}
        aria-label="More"
      >
        <Menu className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs mt-1">{t('nav.more', 'More')}</span>
      </button>
    </nav>
  );
};
