import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  ChevronsUpDown,
  Keyboard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
} from 'lucide-react';
import { DashboardView } from '../../../types';
import { Logo, HexagonalIngotIcon } from '../../brand/Logo';
import { PlantProfile } from '../PlantSwitcherModal';
import { preloadDashboardView } from './dashboardRoutes';

export interface SidebarNavItem {
  id: DashboardView;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

interface DashboardSidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activePlant: PlantProfile;
  onOpenPlantSwitcher: () => void;
  sidebarSections: SidebarSection[];
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onOpenSecurityDrawer: () => void;
  onOpenShortcuts: () => void;
  onReturnToMarketing: () => void;
  userName?: string;
  userEmpId?: string;
  role: string;
  onLogout: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  activePlant,
  onOpenPlantSwitcher,
  sidebarSections,
  currentView,
  onSelectView,
  onOpenSecurityDrawer,
  onOpenShortcuts,
  onReturnToMarketing,
  userName,
  userEmpId,
  role,
  onLogout,
}) => (
  <aside
    className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 select-none z-30 transition-[width] duration-200 ease-out bg-[#121316] text-[#EAEAEA] border-r border-[#EAEAEA]/[0.08] ${
      isSidebarCollapsed ? 'w-16' : 'w-64'
    }`}
  >
    <div className="flex-shrink-0 p-4 border-b border-[#EAEAEA]/[0.08] space-y-3 bg-[#121316]">
      <div className="flex items-center justify-between">
        {isSidebarCollapsed ? (
          <div className="mx-auto flex flex-col items-center">
            <HexagonalIngotIcon size={24} />
          </div>
        ) : (
          <>
            <Logo size="sm" />
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
              title="Collapse sidebar ([)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenPlantSwitcher}
        className={`w-full flex items-center rounded-lg bg-[#181A1F] hover:bg-[#22252B] border border-[#EAEAEA]/[0.08] text-left transition-colors cursor-pointer ${
          isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
        }`}
        title={`${activePlant.name} (${activePlant.installationId})`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#121316] border border-[#EAEAEA]/[0.08] text-[#10B981] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" strokeWidth={1.5} />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#EAEAEA] truncate leading-snug flex items-center gap-1.5">
                <span className="truncate">{activePlant.shortName}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" title="Operational" />
              </div>
              <div className="text-xs font-mono tabular-nums text-[#9FA3AD] truncate leading-tight mt-0.5">
                {activePlant.installationId}
              </div>
            </div>
          )}
        </div>
        {!isSidebarCollapsed && (
          <ChevronsUpDown className="w-4 h-4 text-[#6F7480] shrink-0 ml-1" strokeWidth={1.5} />
        )}
      </button>
    </div>

    <div
      data-lenis-prevent
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4"
    >
      <nav aria-label="Workspace Navigation">
        {sidebarSections.map((section, sectionIdx) => (
          <div key={section.title} className={sectionIdx > 0 ? 'mt-6' : ''}>
            {!isSidebarCollapsed && (
              <div className="px-2.5 mb-2 text-xs font-medium text-[#6F7480]">
                {section.title}
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
                    className={`relative w-full flex items-center rounded-lg text-sm transition-colors h-9 cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } ${
                      isActive
                        ? 'text-[#EAEAEA] font-medium'
                        : 'text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 rounded-lg bg-[#22252B] border border-[#EAEAEA]/[0.08]"
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">
                        <Icon
                          className={`w-4 h-4 ${isActive ? 'text-[#10B981]' : 'text-[#6F7480]'}`}
                        />
                      </span>
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isSidebarCollapsed && item.badge && (
                      <span className="relative z-10 text-xs font-mono tabular-nums text-[#9FA3AD]">
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

    <div className="flex-shrink-0 p-3 border-t border-[#EAEAEA]/[0.08] space-y-2 bg-[#121316]">
      {isSidebarCollapsed ? (
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
            title="Expand sidebar ([)"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onOpenSecurityDrawer}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#10B981] hover:bg-[#181A1F] transition-colors cursor-pointer"
            title="Security Telemetry (Ed25519)"
            aria-label="Security Telemetry"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onReturnToMarketing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
            title="Return to Public Site"
            aria-label="Return to Public Site"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpenSecurityDrawer}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
            title="Security & Cryptographic Telemetry"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" strokeWidth={1.5} />
              <span className="truncate">Security Telemetry</span>
            </span>
            <span className="text-xs font-mono text-[#6F7480]">Ed25519</span>
          </button>

          <div className="p-2.5 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#22252B] border border-[#EAEAEA]/[0.08] text-[#EAEAEA] font-medium text-xs flex items-center justify-center shrink-0">
                  {userName?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#EAEAEA] truncate leading-tight">
                    {userName || 'R. K. Chatterjee'}
                  </div>
                  <div className="text-xs text-[#9FA3AD] truncate leading-tight mt-0.5">
                    {role.replace('_', ' ')} ·{' '}
                    <span className="font-mono text-[#6F7480]">{userEmpId || 'Active'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-md text-[#9FA3AD] hover:text-[#F87171] hover:bg-[#22252B] transition-colors cursor-pointer shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#EAEAEA]/[0.06]">
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4 text-[#6F7480]" strokeWidth={1.5} />
              <span>Shortcuts</span>
              <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08] text-[#9FA3AD] leading-none">
                ?
              </kbd>
            </button>

            <button
              type="button"
              onClick={onReturnToMarketing}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] transition-colors cursor-pointer"
              title="Return to Public Site"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Exit</span>
            </button>
          </div>
        </>
      )}
    </div>
  </aside>
);
