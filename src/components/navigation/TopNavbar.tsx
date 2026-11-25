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
  onToggleMode?: (mode: AppMode) => void;
  onNavigateToSection?: (sectionId: string) => void;
  currentDashboardView?: DashboardView;
  onSelectDashboardView?: (view: DashboardView) => void;
  onOpenPitchModal?: () => void;
}

const NAV_LINKS = [
  { key: 'how_it_works', fallback: 'How it works', id: 'how-it-works' },
  { key: 'sample_pack', fallback: 'Sample pack', id: 'sample-pack' },
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
      className={`sticky top-0 z-50 w-full h-16 transition-colors duration-150 ${
        isScrolled
          ? 'bg-[#121316]/95 backdrop-blur-md border-b border-[#EAEAEA]/10'
          : 'bg-[#121316] border-b border-[#EAEAEA]/[0.08]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between gap-6 h-full">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => scrollToTop(false)}
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-lg cursor-pointer"
            aria-label="HeatLedger AI Home"
          >
            <Logo size="md" />
          </button>

          {/* Navigation Links matching actual sections + public tools */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-normal text-[#9FA3AD] h-full"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              const label = t(`nav.${link.key}`, link.fallback);
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`relative h-full inline-flex items-center text-sm transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-[#EAEAEA] cursor-pointer ${
                    isActive ? 'text-[#EAEAEA] font-medium' : 'text-[#9FA3AD] hover:text-[#EAEAEA]'
                  }`}
                >
                  <span>{label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="top-navbar-active-indicator"
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[#10B981]"
                    />
                  )}
                </button>
              );
            })}

            <Link
              to="/check"
              className="text-sm text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Free MTC check
            </Link>
          </nav>

          {/* Right Action Cluster: Language, quiet Log in text link, single primary CTA */}
          <div className="flex items-center gap-4 shrink-0">
            <LanguageSwitcher className="hidden sm:inline-block" compact />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center py-1.5 text-sm font-normal text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t('nav.login', 'Log in')}
            </Link>

            <button
              type="button"
              onClick={() => onToggleMode?.('dashboard')}
              className="inline-flex items-center gap-2 bg-[#EAEAEA] hover:bg-white text-[#121316] font-medium text-sm h-9 px-4 rounded-lg transition-colors duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121316] cursor-pointer"
            >
              <span>
                {currentMode === 'dashboard'
                  ? t('common.back_to_website', 'Back to website')
                  : t('nav.open_qa_app', 'Open QA App')}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#22252B] transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Menu className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-b border-[#EAEAEA]/[0.08] bg-[#121316]"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                    activeSection === link.id
                      ? 'bg-[#22252B] text-[#EAEAEA] font-medium'
                      : 'text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F]'
                  }`}
                >
                  {t(`nav.${link.key}`, link.fallback)}
                </button>
              ))}

              <Link
                to="/check"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2 text-sm rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F]"
              >
                Free MTC check
              </Link>

              <div className="pt-3 mt-3 border-t border-[#EAEAEA]/[0.08] flex items-center justify-between gap-4 px-1">
                <LanguageSwitcher />
                <div className="flex items-center gap-4">
                  {onOpenPitchModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenPitchModal();
                      }}
                      className="text-xs text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t('nav.field_pitch_guide', 'Field Pitch Guide')}
                    </button>
                  )}
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-medium text-[#EAEAEA] hover:text-[#10B981] transition-colors whitespace-nowrap"
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
