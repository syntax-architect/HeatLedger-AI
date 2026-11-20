import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { ScrollProgressRail } from '../components/navigation/ScrollProgressRail';
import { HeroSection } from '../components/marketing/HeroSection';
import { StandardsMarquee } from '../components/marketing/StandardsMarquee';
import { WhyNowSection } from '../components/marketing/WhyNowSection';
import { ProblemSection } from '../components/marketing/ProblemSection';
import { HowItWorksSection } from '../components/marketing/HowItWorksSection';
import { MtcSimulator } from '../components/marketing/MtcSimulator';
import { CnScopeChecker } from '../components/marketing/CnScopeChecker';
import { Clause6Diagram } from '../components/marketing/Clause6Diagram';
import { ReadinessGateShowcase } from '../components/marketing/ReadinessGateShowcase';
import { RoiCalculator } from '../components/marketing/RoiCalculator';
import { PricingSection } from '../components/marketing/PricingSection';
import { FaqSection } from '../components/marketing/FaqSection';
import { MarketingFooter } from '../components/marketing/MarketingFooter';
import { ExporterPitchModal } from '../components/dashboard/modals/ExporterPitchModal';
import { LenisScroller, scrollToTarget, scrollToTop } from '../components/effects/LenisScroller';
import { MobileStickyCta } from '../components/marketing/MobileStickyCta';
import { LeadBookingModal } from '../components/marketing/LeadBookingModal';

export const MarketingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    scrollToTarget(sectionId, { offset: -72, duration: 1.15 });
  };

  const handleLaunchApp = (view: string = 'command-center') => {
    navigate(`/app?view=${view}`);
    scrollToTop(true);
  };

  const handleOpenWorkbenchPreset = (presetId?: string) => {
    navigate(`/app?view=mtc-workbench${presetId ? `&preset=${presetId}` : ''}`);
    scrollToTop(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#09090B] selection:bg-emerald-600 selection:text-white relative overflow-x-clip">
      <LenisScroller />

      <div className="relative z-10 flex-1 flex flex-col">
        <TopNavbar
          currentMode="marketing"
          onToggleMode={() => handleLaunchApp('command-center')}
          onNavigateToSection={scrollToSection}
          currentDashboardView="command-center"
          onSelectDashboardView={(view) => handleLaunchApp(view)}
          onOpenPitchModal={() => setIsPitchModalOpen(true)}
        />

        {/* Scroll Progress Hairline & Floating Section Jump Dock */}
        <ScrollProgressRail onLaunchApp={() => handleLaunchApp('command-center')} />

        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          {/* Deep Carbon Hero */}
          <HeroSection
            onLaunchApp={() => handleLaunchApp('command-center')}
            onExplorePresets={() => scrollToSection('simulator')}
          />

          {/* Architectural Mill Formats & Statutory Frameworks Ribbon */}
          <StandardsMarquee />

          {/* Crisp White Regulatory Timeline */}
          <WhyNowSection />

          {/* Alabaster Problem / Architecture Ledger */}
          <ProblemSection />

          {/* Crisp White 3-Step Interactive Compliance Pipeline */}
          <HowItWorksSection />

          {/* Deep Carbon Live MTC & CBAM Interactive Simulator */}
          <MtcSimulator onOpenWorkbench={handleOpenWorkbenchPreset} />

          {/* Alabaster CN Code Scope Regulatory Lookup */}
          <CnScopeChecker />

          {/* Deep Carbon EN 10204 Clause 6 Technical Blueprint */}
          <Clause6Diagram />

          {/* Crisp White Shipment Readiness Gate Showcase */}
          <ReadinessGateShowcase />

          {/* Alabaster Financial Cost Difference Workbench */}
          <RoiCalculator onSelectPlan={() => handleLaunchApp('command-center')} />

          {/* Crisp White Pricing & Licensing */}
          <PricingSection
            onSelectPlan={() => handleLaunchApp('command-center')}
            onOpenBookingModal={() => setIsBookingModalOpen(true)}
          />

          {/* Alabaster Statutory & Technical FAQ */}
          <FaqSection />
        </main>

        {/* Deep Carbon Enterprise Footer */}
        <MarketingFooter onOpenPitchModal={() => setIsPitchModalOpen(true)} />

        {/* Compact Mobile Sticky CTA Bar (< md) */}
        <MobileStickyCta onOpenBooking={() => setIsBookingModalOpen(true)} />

        {/* Lead Booking Modal */}
        <LeadBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />

        {/* Exporter Field Pitch Guide Modal */}
        <ExporterPitchModal
          isOpen={isPitchModalOpen}
          onClose={() => setIsPitchModalOpen(false)}
          onJumpToSimulator={() => {
            setTimeout(() => scrollToSection('simulator'), 100);
          }}
        />
      </div>
    </div>
  );
};

export default MarketingPage;
