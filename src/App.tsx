import { useState } from 'react';
import { AppMode, DashboardView } from './types';
import { TopNavbar } from './components/navigation/TopNavbar';
import { HeroSection } from './components/marketing/HeroSection';
import { MtcSimulator } from './components/marketing/MtcSimulator';
import { CnScopeChecker } from './components/marketing/CnScopeChecker';
import { Clause6Diagram } from './components/marketing/Clause6Diagram';
import { RoiCalculator } from './components/marketing/RoiCalculator';
import { MarketingFooter } from './components/marketing/MarketingFooter';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { ExporterPitchModal } from './components/dashboard/modals/ExporterPitchModal';
import { LenisScroller } from './components/effects/LenisScroller';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';

export function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('marketing');
  const [dashboardView, setDashboardView] = useState<DashboardView>('command-center');
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(undefined);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunchApp = (view: DashboardView = 'command-center') => {
    setDashboardView(view);
    setCurrentMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToMarketing = () => {
    setCurrentMode('marketing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenWorkbenchPreset = (presetId?: string) => {
    if (presetId) {
      setSelectedPresetId(presetId);
    }
    setDashboardView('mtc-workbench');
    setCurrentMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPricingPlan = (_planName: string) => {
    setDashboardView('command-center');
    setCurrentMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden">
          {/* Subtle Dynamic Ambient Lighting Orbs for Marketing Mode */}
          {currentMode === 'marketing' && (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              {/* Top Emerald Radiant Orb */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] animate-pulse-slow" />
              {/* Mid-Left Molten Amber Orb */}
              <div className="absolute top-[35%] -left-48 w-[650px] h-[550px] bg-amber-500/10 rounded-full blur-[160px] animate-float-slow" />
              {/* Mid-Right Cobalt Blueprint Orb */}
              <div className="absolute top-[65%] -right-48 w-[700px] h-[600px] bg-blue-600/12 rounded-full blur-[160px] animate-float-reverse" />
              {/* Bottom Cyan Shimmer Orb */}
              <div className="absolute -bottom-40 left-1/3 w-[600px] h-[450px] bg-teal-500/10 rounded-full blur-[150px]" />
              {/* Delicate Technical Grid Layer */}
              <div className="absolute inset-0 bg-tech-grid opacity-25" />
            </div>
          )}

          {/* Lenis Smooth Momentum Scroll Engine */}
          <LenisScroller />
        
        {/* Mode 1: Public Marketing Website */}
        {currentMode === 'marketing' && (
          <div className="relative z-10 flex-1 flex flex-col">
            {/* Sticky Top Navigation Bar with Glassmorphic Backdrop */}
            <TopNavbar
              currentMode={currentMode}
              onToggleMode={(mode) => {
                setCurrentMode(mode);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateToSection={scrollToSection}
              currentDashboardView={dashboardView}
              onSelectDashboardView={setDashboardView}
              onOpenPitchModal={() => setIsPitchModalOpen(true)}
            />

            <main className="flex-1">
              {/* Hero Section */}
              <HeroSection
                onLaunchApp={() => handleLaunchApp('command-center')}
                onExplorePresets={() => scrollToSection('simulator')}
              />

              {/* Interactive "30-Second MTC-to-Customs" Simulator */}
              <MtcSimulator
                onOpenWorkbench={handleOpenWorkbenchPreset}
              />

              {/* HS/CN Code Scope & Legal Deadline Checker */}
              <CnScopeChecker />

              {/* The "Zero-Forgery" EN 10204:2004 Clause 6 Compliance Visualizer */}
              <Clause6Diagram />

              {/* CBAM Penalty & Time Savings Calculator + Pricing Tiers */}
              <RoiCalculator
                onSelectPlan={handleSelectPricingPlan}
              />

              {/* Marketing Footer with Regulatory Disclaimers */}
              <MarketingFooter />
            </main>
          </div>
        )}

        {/* Mode 2: Factory QA & CBAM Web App Dashboard (Precision Daylight) */}
        {currentMode === 'dashboard' && (
          <DashboardShell
            currentView={dashboardView}
            onSelectView={setDashboardView}
            onReturnToMarketing={handleReturnToMarketing}
            initialPresetId={selectedPresetId}
          />
        )}

        {/* Exporter Discovery & 5 Validation Questions Modal */}
        <ExporterPitchModal
          isOpen={isPitchModalOpen}
          onClose={() => setIsPitchModalOpen(false)}
          onJumpToSimulator={() => {
            if (currentMode === 'dashboard') {
              setCurrentMode('marketing');
            }
            setTimeout(() => scrollToSection('simulator'), 100);
          }}
        />

      </div>
    </ToastProvider>
  </AuthProvider>
  );
}

export default App;
