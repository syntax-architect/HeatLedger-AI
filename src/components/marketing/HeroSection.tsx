import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Scale, 
  Sparkles,
  Zap,
  Globe2
} from 'lucide-react';
import { ForgeSparks } from '../effects/ForgeSparks';

interface HeroSectionProps {
  onLaunchApp: () => void;
  onExplorePresets: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onLaunchApp, 
  onExplorePresets 
}) => {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center pt-8 pb-14 overflow-hidden">
      {/* Ambient Forge Embers & Subtle Light Gradients */}
      <ForgeSparks density={30} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/[0.07] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-amber-500/[0.04] rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 my-auto">
        
        {/* Subtle Regulatory Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-8 hover:border-white/20 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wide text-slate-300">
            EU Regulation 2026/1963 &amp; CBAM 2026 Definitive Regime Ready
          </span>
        </div>

        {/* Refined Apple-Grade Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-[-0.035em] leading-[1.08] max-w-5xl mx-auto">
          From Raw Steel Mill Certificate to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-300 to-emerald-400">
            EU &amp; UK Customs Clearance
          </span>{' '}
          in 30 Seconds.
        </h1>

        {/* Concise, Elegant Subheadline */}
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Eliminate €4,500/container in punitive CBAM default markups. Automatically verify upstream SAIL, Tata Steel, and JSW 3.1 certificates into container-ready Melt-and-Pour and CBAM dossiers.
        </p>

        {/* Tactile Call To Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-semibold text-sm px-6 py-3 rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch Interactive QA Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExplorePresets}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-medium text-sm px-6 py-3 rounded-full border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Test a Sample Shipment Free</span>
          </button>
        </div>

        {/* Minimalist 4-Metric Proof Bar (Clean Linear / Apple Style) */}
        <div className="mt-14 pt-8 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-4xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Forgery</span>
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              Unaltered upstream mill PDF locked as tamper-evident Annex A
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-400">
              <Scale className="w-3.5 h-3.5" />
              <span>Mass Balance</span>
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              PostgreSQL ledger prevents phantom heat allocation audits
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-blue-400">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Melt &amp; Pour Law</span>
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              ISO 3166 Melt &amp; Pour attestation for EU Reg 2026/1963
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CBAM Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              Saves €4,500+ per container vs EU default penalty markups
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
