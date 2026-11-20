import React from 'react';
import { Drawer } from 'vaul';
import {
  FileCode,
  FlaskConical,
  Database,
  Stamp,
  Building2,
  FileText,
  Sliders,
  ShieldCheck,
  KeyRound,
  Globe,
  Sun,
  Moon,
  X,
  LogOut,
  ChevronRight,
  Compass,
  TrendingUp,
  Briefcase,
  BarChart3,
  Key,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PlantProfile } from './PlantSwitcherModal';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activePlant: PlantProfile;
  onOpenPlantSwitcher: () => void;
  onOpenSecurity: () => void;
  onOpenPinModal: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  activePlant,
  onOpenPlantSwitcher,
  onOpenSecurity,
  onOpenPinModal,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, expiryTimerString } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-[#FFFFFF] border-t border-[#E4E4E7] text-[#09090B] pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none font-sans shadow-xl">
          <div className="mx-auto mt-3 mb-2 h-1.5 w-11 shrink-0 rounded-full bg-[#D4D4D8]" />

          {/* Header */}
          <div className="px-5 py-3 border-b border-[#E4E4E7] flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <Drawer.Title className="text-sm font-semibold text-[#09090B]">
                Workspaces &amp; Controls
              </Drawer.Title>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlantSwitcher();
                }}
                className="flex items-center gap-1.5 text-xs text-[#52525B] hover:text-[#09090B] mt-0.5 cursor-pointer text-left"
              >
                <Building2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                <span className="font-medium truncate">{activePlant.shortName}</span>
                <span className="font-mono text-[#52525B]">({activePlant.installationId})</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors touch-target flex items-center justify-center cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="px-5 pt-4 overflow-y-auto space-y-5 flex-1 overscroll-contain">
            {/* 1. Customs & Compliance */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] font-mono">
                Customs &amp; Compliance
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('/app/cbam')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-[#059669] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">CBAM Declarations</div>
                  <div className="text-xs text-[#52525B] mt-0.5">EU XML &amp; Scope</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/dossiers')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#2563EB] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Customs Dossiers</div>
                  <div className="text-xs text-[#52525B] mt-0.5">ZIP &amp; SHA-256</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/suppliers')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-[#D97706] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Suppliers Registry</div>
                  <div className="text-xs text-[#52525B] mt-0.5">SAIL, Tata, JSW</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/reports')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#7C3AED] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Audit Reports</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Logs &amp; Exports</div>
                </button>
              </div>
            </div>

            {/* 2. Intelligence & Governance */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] font-mono">
                Intelligence &amp; Governance
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('/app/radar')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-[#059669] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Regulation Radar</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Statutory Deadlines</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/roi')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-[#2563EB] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">ROI &amp; Value Report</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Default Markups</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/consultant')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-[#D97706] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Consultant Mode</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Multi-Plant Radar</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/insights')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-[#7C3AED] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Insights &amp; Trends</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Chemistry &amp; Forecast</div>
                </button>
              </div>
            </div>

            {/* 3. System & Security Controls */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] font-mono">
                System &amp; Security Controls
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSecurity();
                  }}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#059669] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Security Telemetry</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Cryptographic logs</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPinModal();
                  }}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#D97706] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Inspector PIN</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Passkey 2FA</div>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-[#D97706] mb-1.5" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#2563EB] mb-1.5" />
                  )}
                  <div className="text-xs font-semibold text-[#09090B]">Toggle Theme</div>
                  <div className="text-xs text-[#52525B] mt-0.5">
                    {theme === 'dark' ? 'Obsidian Forge (Dark)' : 'Precision Daylight (Light)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/settings')}
                  className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] hover:bg-[#F4F4F5] text-left transition-colors touch-target cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#52525B] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Settings</div>
                  <div className="text-xs text-[#52525B] mt-0.5">API &amp; webhooks</div>
                </button>
              </div>
            </div>

            {/* 4. Interface Language */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] text-xs">
              <div className="flex items-center gap-2 text-[#09090B] font-medium">
                <Globe className="w-4 h-4 text-[#059669]" />
                <span>Interface Language:</span>
              </div>
              <LanguageSwitcher />
            </div>

            {/* 5. User Account & Sign Out */}
            <div className="pt-3 border-t border-[#E4E4E7] space-y-3">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-semibold uppercase text-xs shrink-0">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[#09090B] truncate">
                      {user?.name || 'Authorized Inspector'}
                    </div>
                    <div className="text-[#52525B] font-mono text-xs">
                      {user?.role || 'QA_INSPECTOR'} · {user?.emp_id || 'ID-ACTIVE'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-[#52525B]">{expiryTimerString}</div>
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={logout}
                      className="text-xs font-medium text-[#DC2626] hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
