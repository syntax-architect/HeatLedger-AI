import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { AppMode, DashboardView } from '../../types';
import { 
  Layers, 
  Globe, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Menu, 
  X,
  FileCheck2,
  Calculator,
  Search,
  Scale,
  PhoneCall
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
    { label: 'Live MTC Simulator', href: '#simulator', icon: FileCheck2 },
    { label: 'CN Code Scope Checker', href: '#cn-checker', icon: Search },
    { label: 'EN 10204 Clause 6 Workflow', href: '#clause-6', icon: Scale },
    { label: 'CBAM Savings Calculator', href: '#roi-calculator', icon: Calculator },
    { label: 'Pricing', href: '#pricing', icon: Sparkles },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    if (currentMode === 'dashboard') {
      onToggleMode('marketing');
      setTimeout(() => {
        onNavigateToSection?.(href.replace('#', ''));
      }, 100);
    } else {
      onNavigateToSection?.(href.replace('#', ''));
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-obsidian border-b border-slate-tempered transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo with Hexagonal Ingot */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => {
              if (currentMode === 'dashboard') onToggleMode('marketing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Logo size="md" />
          </div>

          {/* Desktop Navigation Links (Marketing view) */}
          <nav className="hidden xl:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              return (
                <button
                  key={link.label}
                  onClick={() => handleLinkClick(link.href)}
                  className="px-3 py-1.5 text-xs lg:text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-slate-800/40 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Hub: Mode Toggle + Pitch Guide + Direct Launch */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Field Pitch & 5 Questions Button */}
            <button
              onClick={onOpenPitchModal}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
              title="Open Exporter Discovery Script & 5 Validation Questions"
            >
              <PhoneCall className="w-3 h-3 text-amber-400" />
              <span>Pitch Guide (5 Questions)</span>
            </button>

            {/* Live Exporter Compliance Badge */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>EU Reg 2026/1963 · Oct 1 Compliant</span>
            </div>

            {/* Prominent Mode Toggle Button */}
            <div className="p-0.5 rounded-xl bg-slate-800/80 border border-slate-700/80 p-1 flex items-center shadow-inner">
              <button
                onClick={() => onToggleMode('marketing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === 'marketing'
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm border border-slate-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Public Marketing Landing Page"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Marketing</span>
              </button>

              <button
                onClick={() => onToggleMode('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === 'dashboard'
                    ? 'bg-emerald-500 text-obsidian-900 shadow-glow-emerald font-bold'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                }`}
                title="Switch to Full Factory QA & CBAM Web App Dashboard"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Factory QA App</span>
                <span className="hidden md:inline-block ml-0.5 px-1.5 py-0.2 bg-emerald-950 text-emerald-300 text-[10px] rounded uppercase font-mono tracking-wider border border-emerald-400/40">
                  Live
                </span>
              </button>
            </div>

            {/* Direct CTA Button in Marketing Mode */}
            {currentMode === 'marketing' ? (
              <button
                onClick={() => onToggleMode('dashboard')}
                className="hidden md:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-viridian text-obsidian-900 font-bold text-xs uppercase tracking-wide px-3.5 py-2 rounded-lg transition-all shadow-glow-emerald group"
              >
                <span>Launch QA Workbench</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Shop-Floor QA Terminal</span>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-tempered bg-obsidian-900/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Navigation</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              EU 2026/1963 · CBAM
            </span>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenPitchModal?.();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-amber-300 bg-amber-950/40 rounded-lg border border-amber-500/40"
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>Exporter Field Pitch Script</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60 rounded-lg text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{link.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            );
          })}
          
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onToggleMode('dashboard');
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-obsidian-900 font-bold py-2.5 px-4 rounded-lg text-sm shadow-glow-emerald"
            >
              <Layers className="w-4 h-4" />
              <span>Open Factory QA & CBAM Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
