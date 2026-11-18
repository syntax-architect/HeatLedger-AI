import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Scale, 
  Zap,
  Globe2,
  FileCheck
} from 'lucide-react';

interface HeroSectionProps {
  onLaunchApp: () => void;
  onExplorePresets: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onLaunchApp, 
  onExplorePresets 
}) => {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center py-20 sm:py-24 lg:py-28 border-b border-slate-800 bg-obsidian overflow-hidden">
      {/* Precision Technical Engineering Grid */}
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-obsidian/60 to-obsidian pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 my-auto">
        
        {/* Regulatory Scope Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 mb-8 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium tracking-wide text-slate-300">
            EU Regulation 2026/1963 &amp; CBAM Definitive Regime Compliant
          </span>
        </div>

        {/* Clear, Authoritative Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.4rem] font-semibold text-white tracking-[-0.03em] leading-[1.1] max-w-5xl mx-auto">
          From Raw Steel Mill Certificate to{' '}
          <span className="text-emerald-400">
            EU &amp; UK Customs Clearance
          </span>{' '}
          in 30 Seconds.
        </h1>

        {/* Technical Subheadline */}
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
          Eliminate €4,500/container in punitive CBAM default taxes. Automatically verify upstream SAIL, Tata Steel, and JSW 3.1 certificates into audit-proof Melt-and-Pour origin declarations and official CBAM dossiers.
        </p>

        {/* Primary and Secondary Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-semibold text-sm px-6 py-3 rounded-lg transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch Factory QA Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExplorePresets}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-sm px-6 py-3 rounded-lg border border-slate-700 transition-colors shadow-sm"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Test a Sample Shipment Free</span>
          </button>
        </div>

        {/* 4-Metric Proof Strip with Strict Horizontal Divider Rhythm */}
        <div className="mt-16 pt-8 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left max-w-5xl mx-auto">
          
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-wide">Zero-Forgery</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Untouched upstream mill PDF locked as tamper-evident Annex A
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-amber-400">
              <Scale className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-wide">Mass Balance</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              PostgreSQL ledger prevents phantom heat re-allocation audits
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-blue-400">
              <Globe2 className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-wide">Melt &amp; Pour Law</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ISO 3166 Melt &amp; Pour attestation for EU Reg 2026/1963
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-400">
              <FileCheck className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-wide">CBAM Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Saves €4,500+ per container vs EU default penalty markups
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
