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
      {/* Precision Technical Engineering Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-obsidian/60 to-obsidian pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 my-auto">
        
        {/* Apple/Linear-Style Regulatory Scope Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-300 text-xs font-mono mb-8 shadow-[0_0_20px_rgba(16,185,129,0.08)] backdrop-blur-md cursor-default">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wide">
            EU Regulation 2026/1963 &amp; CBAM Definitive Regime Compliant
          </span>
        </div>

        {/* Clear, Authoritative Headline with Silk Gradient */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.5rem] font-bold text-white tracking-[-0.035em] leading-[1.08] max-w-5xl mx-auto">
          From Raw Steel Mill Certificate to{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
            EU &amp; UK Customs Clearance
          </span>{' '}
          in 30 Seconds.
        </h1>

        {/* Technical Subheadline with Refined Typography */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300/80 max-w-3xl mx-auto font-normal leading-relaxed">
          Eliminate €4,500/container in punitive CBAM default taxes. Automatically verify upstream SAIL, Tata Steel, and JSW 3.1 certificates into audit-proof Melt-and-Pour origin declarations and official CBAM dossiers.
        </p>

        {/* Primary and Secondary Actions with Tactile Apple-Style Polish */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-obsidian-950 font-semibold text-sm px-7 py-3.5 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] transition-all duration-200"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch Factory QA Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExplorePresets}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white font-medium text-sm px-6 py-3.5 rounded-full border border-white/[0.12] hover:border-white/[0.2] backdrop-blur-md active:scale-[0.98] transition-all duration-200"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Test a Sample Shipment Free</span>
          </button>
        </div>

        {/* 4-Metric Proof Strip with Refined Frosted Cards */}
        <div className="mt-16 pt-10 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left max-w-5xl mx-auto">
          
          <div className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-emerald-500/30 transition-all duration-300 space-y-2 backdrop-blur-sm group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-emerald-400">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="uppercase tracking-wider">Zero-Forgery</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
              Untouched upstream mill PDF locked as tamper-evident Annex A
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-amber-500/30 transition-all duration-300 space-y-2 backdrop-blur-sm group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-amber-400">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <span className="uppercase tracking-wider">Mass Balance</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
              PostgreSQL ledger prevents phantom heat re-allocation audits
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-blue-500/30 transition-all duration-300 space-y-2 backdrop-blur-sm group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-blue-400">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Globe2 className="w-4 h-4 text-blue-400" />
              </div>
              <span className="uppercase tracking-wider">Melt &amp; Pour Law</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
              ISO 3166 Melt &amp; Pour attestation for EU Reg 2026/1963
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-emerald-500/30 transition-all duration-300 space-y-2 backdrop-blur-sm group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-emerald-400">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="uppercase tracking-wider">CBAM Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
              Saves €4,500+ per container vs EU default penalty markups
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
