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
  ArrowLeft,
  X,
  LogOut,
  ChevronRight,
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
              <div className="text-xs font-medium text-[#52525B]">Customs &amp; Compliance</div>
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
                  <FileText className="w-4 h-4 text-[#52525B] mb-1.5" />
                  <div className="text-xs font-semibold text-[#09090B]">Audit Reports</div>
                  <div className="text-xs text-[#52525B] mt-0.5">Logs &amp; Exports</div>
                </button>
              </div>
            </div>

            {/* 2. Factory Workspaces */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#52525B]">Factory Workspaces</div>
              <div className="rounded-xl border border-[#E4E4E7] divide-y divide-[#E4E4E7] overflow-hidden bg-[#FFFFFF]">
                <button
                  type="button"
                  onClick={() => handleNavigate('/app/certificates')}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[#FAFAFA] transition-colors touch-target text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#059669] flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B]">MTC Workbench</div>
                      <div className="text-xs text-[#52525B] truncate">
                        OCR extraction &amp; ladle chemistry
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/sign-off')}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[#FAFAFA] transition-colors touch-target text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center shrink-0">
                      <Stamp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B]">
                        Clause 6 Sign-Off Queue
                      </div>
                      <div className="text-xs text-[#52525B] truncate">
                        Ed25519 digital certificate sealing
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626] font-semibold border border-[#FECACA] shrink-0">
                    3
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/app/heats')}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[#FAFAFA] transition-colors touch-target text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B]">
                        Heat Inventory &amp; Mass Balance
                      </div>
                      <div className="text-xs text-[#52525B] truncate">
                        Ladle tracking, allocation &amp; scrap
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                </button>
              </div>
            </div>

            {/* 3. Tools & Telemetry */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#52525B]">Tools &amp; Telemetry</div>
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
                  <div className="text-xs text-[#52525B] mt-0.5">Headers &amp; audit</div>
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
                  <div className="text-xs text-[#52525B] mt-0.5">Step-up 2FA</div>
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
                    {theme === 'dark' ? 'Carbon Dark' : 'Daylight'}
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

            {/* 4. Language */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] text-xs">
              <div className="flex items-center gap-2 text-[#09090B] font-medium">
                <Globe className="w-4 h-4 text-[#059669]" />
                <span>Language:</span>
              </div>
              <LanguageSwitcher />
            </div>

            {/* 5. User Account & Return Link */}
            <div className="pt-3 border-t border-[#E4E4E7] space-y-3">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#09090B] text-white flex items-center justify-center font-semibold uppercase text-xs shrink-0">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[#09090B] truncate">
                      {user?.name || 'Authorized User'}
                    </div>
                    <div className="text-[#52525B] font-mono text-xs">
                      {user?.role || 'SANDBOX'} · {user?.emp_id || 'ID-ACTIVE'}
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

              <button
                type="button"
                onClick={() => handleNavigate('/')}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-xs font-medium text-[#09090B] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#52525B]" />
                <span>Return to Marketing Site</span>
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
