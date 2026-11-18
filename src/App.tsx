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

export function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('marketing');
  const [dashboardView, setDashboardView] = useState<DashboardView>('command-center');
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

  const handleOpenWorkbenchPreset = (_presetId?: string) => {
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
    <div className="min-h-screen flex flex-col bg-obsidian text-slate-100 selection:bg-emerald-500 selection:text-obsidian-900">
      {/* Lenis Smooth Momentum Scroll Engine */}
      <LenisScroller />
      
      {/* Mode 1: Public Marketing Website */}
      {currentMode === 'marketing' && (
        <>
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
        </>
      )}

      {/* Mode 2: Factory QA & CBAM Web App Dashboard (Precision Daylight) */}
      {currentMode === 'dashboard' && (
        <DashboardShell
          currentView={dashboardView}
          onSelectView={setDashboardView}
          onReturnToMarketing={handleReturnToMarketing}
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
  );
}

export default App;
