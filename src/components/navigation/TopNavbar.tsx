import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { AppMode, DashboardView } from '../../types';
import { 
  ArrowRight, 
  Menu, 
  X,
  PhoneCall,
  Sparkles,
  Layers,
  Globe
} from 'lucide-react';

interface TopNavbarProps {
  currentMode: AppMode;
  onToggleMode: (mode: AppMode) => void;
  onNavigateToSection?: (sectionId: string) => void;
  currentDashboardView?: DashboardView;
  onSelectDashboardView?: (view: DashboardView) => void;
  onOpenPitchModal?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentMode,
  onToggleMode,
  onNavigateToSection,
  onOpenPitchModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Simulator', href: '#simulator' },
    { label: 'CN Scope', href: '#cn-checker' },
    { label: 'Clause 6', href: '#clause-6' },
    { label: 'CBAM Calculator', href: '#roi-calculator' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    onNavigateToSection?.(href.replace('#', ''));
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-obsidian/80 border-b border-white/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Logo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="px-3 py-1.5 text-xs lg:text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Action Hub */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Field Pitch Script Trigger */}
            <button
              onClick={onOpenPitchModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/15 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Pitch Guide</span>
            </button>

            {/* Apple-Style Segmented Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs">
              <button
                onClick={() => onToggleMode('marketing')}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  currentMode === 'marketing'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Marketing
              </button>
              <button
                onClick={() => onToggleMode('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all ${
                  currentMode === 'dashboard'
                    ? 'bg-emerald-500 text-obsidian-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Factory QA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </div>

            {/* Sleek Primary CTA Pill */}
            <button
              onClick={() => onToggleMode('dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-semibold text-xs px-4 py-1.5 rounded-full transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-obsidian-950/95 backdrop-blur-2xl px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.href)}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPitchModal?.();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Exporter Field Pitch Script</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onToggleMode('dashboard');
              }}
              className="w-full py-2.5 rounded-full text-xs font-semibold bg-emerald-500 text-obsidian-950 text-center"
            >
              Open Factory QA Workbench
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
