import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { ScrollProgressRail } from '../components/navigation/ScrollProgressRail';
import { HeroSection } from '../components/marketing/HeroSection';
import { HowItWorksSection } from '../components/marketing/HowItWorksSection';
import { SampleBuyerPackSection } from '../components/marketing/SampleBuyerPackSection';
import { PricingSection } from '../components/marketing/PricingSection';
import { FaqSection } from '../components/marketing/FaqSection';
import { MarketingFooter } from '../components/marketing/MarketingFooter';
import { ExporterPitchModal } from '../components/dashboard/modals/ExporterPitchModal';
import { LenisScroller, scrollToTarget, scrollToTop } from '../components/effects/LenisScroller';
import { MobileStickyCta } from '../components/marketing/MobileStickyCta';
import { LeadBookingModal } from '../components/marketing/LeadBookingModal';

export const MarketingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    scrollToTarget(sectionId, { offset: -72, duration: 1.0 });
  };

  useEffect(() => {
    if (location.pathname === '/pricing') {
      setTimeout(() => scrollToSection('pricing'), 150);
    } else if (location.pathname === '/sample') {
      setTimeout(() => scrollToSection('sample-pack'), 150);
    }
  }, [location.pathname]);

  const handleLaunchApp = (view: string = 'command-center') => {
    navigate(`/app?view=${view}`);
    scrollToTop(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121316] text-[#EAEAEA] selection:bg-[#059669] selection:text-white relative overflow-x-clip">
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

        <ScrollProgressRail onLaunchApp={() => handleLaunchApp('command-center')} />

        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          {/* 1. Forged Graphite Scene Hero */}
          <HeroSection
            onLaunchApp={() => handleLaunchApp('command-center')}
            onExplorePresets={() => scrollToSection('sample-pack')}
          />

          {/* 2. Three-Stage Compliance Pipeline */}
          <HowItWorksSection />

          {/* 3. Sample Consignment Buyer Pack */}
          <SampleBuyerPackSection />

          {/* 4. Transparent INR Pricing & GST Licensing */}
          <PricingSection
            onSelectPlan={() => handleLaunchApp('command-center')}
            onOpenBookingModal={() => setIsBookingModalOpen(true)}
          />

          {/* 5. Statutory & Technical FAQ */}
          <FaqSection />
        </main>

        <MarketingFooter onOpenPitchModal={() => setIsPitchModalOpen(true)} />

        <MobileStickyCta onOpenBooking={() => setIsBookingModalOpen(true)} />

        <LeadBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />

        <ExporterPitchModal
          isOpen={isPitchModalOpen}
          onClose={() => setIsPitchModalOpen(false)}
          onJumpToSimulator={() => {
            setTimeout(() => scrollToSection('sample-pack'), 100);
          }}
        />
      </div>
    </div>
  );
};

export default MarketingPage;
