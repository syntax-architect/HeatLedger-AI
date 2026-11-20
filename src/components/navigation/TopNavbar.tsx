import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Logo } from '../brand/Logo';
import { AppMode, DashboardView } from '../../types';
import { ArrowRight, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { scrollToTop } from '../effects/LenisScroller';

interface TopNavbarProps {
  currentMode?: AppMode;
  onToggleMode: (mode: AppMode) => void;
  onNavigateToSection?: (sectionId: string) => void;
  currentDashboardView?: DashboardView;
  onSelectDashboardView?: (view: DashboardView) => void;
  onOpenPitchModal?: () => void;
}

const NAV_LINKS = [
  { key: 'how_it_works', fallback: 'How It Works', id: 'how-it-works' },
  { key: 'simulator', fallback: 'Simulator', id: 'simulator' },
  { key: 'cn_scope', fallback: 'CN Scope', id: 'cn-checker' },
  { key: 'clause_6', fallback: 'Clause 6', id: 'clause-6' },
  { key: 'readiness_gate', fallback: 'Readiness Gate', id: 'readiness-gate' },
  { key: 'roi', fallback: 'ROI', id: 'roi-calculator' },
  { key: 'pricing', fallback: 'Pricing', id: 'pricing' },
  { key: 'faq', fallback: 'FAQ', id: 'faq' },
];

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentMode = 'landing',
  onToggleMode,
  onNavigateToSection,
  onOpenPitchModal,
}) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);

      let active = '';
      for (const link of NAV_LINKS) {
        const el = document.getElementById(link.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180 && rect.bottom > 100) {
            active = link.id;
          }
        }
      }
      setActiveSection(active);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigateToSection?.(id);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full h-16 transition-all duration-200 ${
        isScrolled
          ? 'bg-[#0A0C10]/95 backdrop-blur-md border-b border-white/[0.12] shadow-[0_6px_24px_rgba(0,0,0,0.32)]'
          : 'bg-[#0A0C10] border-b border-white/[0.08]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between gap-6 lg:gap-8 h-full">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => scrollToTop(false)}
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-lg cursor-pointer"
            aria-label="HeatLedger AI Home"
          >
            <Logo size="md" />
          </button>

          {/* Zone 2: Serialized Navigation Links with Animated Underline */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#A1A1AA] h-full overflow-x-auto no-scrollbar"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              const label = t(`nav.${link.key}`, link.fallback);
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`relative h-full inline-flex items-center text-xs lg:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-white cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  <span>{label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="top-navbar-active-indicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[#10B981] rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Language, Log in, and Single Primary CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <LanguageSwitcher className="hidden sm:inline-block" compact />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t('nav.login', 'Log in')}
            </Link>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggleMode('dashboard')}
              className="inline-flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0C10] cursor-pointer group"
            >
              <span>{currentMode === 'dashboard' ? t('common.back_to_website', 'Back to Website') : t('nav.open_qa_app', 'Open QA App')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
            </motion.button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer with Smooth Framer Motion Collapse */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden border-b border-white/[0.08] bg-[#0A0C10]/95 backdrop-blur-md"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    activeSection === link.id
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-[#F4F4F5] hover:bg-[#181B22]'
                  }`}
                >
                  {t(`nav.${link.key}`, link.fallback)}
                </button>
              ))}

              <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 px-1">
                <LanguageSwitcher />
                <div className="flex items-center gap-3">
                  {onOpenPitchModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenPitchModal();
                      }}
                      className="text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t('nav.field_pitch_guide', 'Field Pitch Guide')}
                    </button>
                  )}
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-medium text-[#F4F4F5] hover:text-emerald-400 transition-colors whitespace-nowrap"
                  >
                    {t('nav.login', 'Log in')}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
