import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Scale, 
  Sparkles,
  Zap,
  Building2,
  Globe2,
  Lock
} from 'lucide-react';
import { AppMode } from '../../types';
import { ForgeSparks } from '../effects/ForgeSparks';
import { SpotlightCard } from '../effects/SpotlightCard';

interface HeroSectionProps {
  onLaunchApp: () => void;
  onExplorePresets: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onLaunchApp, 
  onExplorePresets 
}) => {
  return (
    <section className="relative pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
      {/* Background Forge Sparks & Ambient Glow Mesh */}
      <ForgeSparks density={40} />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Pill Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gunmetal-DEFAULT border border-amber-500/40 shadow-glow-amber/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-amber-300">
              EU Reg 2026/1963 Melt-and-Pour + EU/UK CBAM Definitive Regime Ready
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-alabaster tracking-tight leading-[1.12]">
            From Raw Steel Mill Certificate to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
              EU & UK Customs Clearance
            </span>{' '}
            in 30 Seconds.
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Stop typing spectrometer numbers into Excel and losing European buyers to punitive CBAM default markups.
            Upload your upstream <strong className="text-white font-semibold">SAIL, Tata Steel, JSW, or RINL EN 10204 3.1 Mill Test Certificate + Electricity Bill</strong> to
            auto-verify ASTM/EN metallurgy, trace Heat Numbers, and generate container-ready EU/UK CBAM &amp; Melt-and-Pour dossiers.
          </p>

          {/* Call to Actions */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-extrabold text-sm sm:text-base px-7 py-4 rounded-xl shadow-glow-emerald transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Launch Interactive QA Workbench</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={onExplorePresets}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gunmetal-DEFAULT hover:bg-slate-800 text-slate-200 font-semibold text-sm sm:text-base px-6 py-4 rounded-xl border border-slate-tempered hover:border-slate-600 transition-all"
            >
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span>Test a Sample Shipment Free</span>
            </button>
          </div>

          {/* Quick Exporter Trust Points with Interactive Spotlight Effects */}
          <div className="mt-12 pt-8 border-t border-slate-tempered/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <SpotlightCard spotlightColor="emerald" className="p-3.5 bg-gunmetal-billets/70">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Zero Forgery</div>
                  <div className="text-[11px] text-slate-400 leading-tight">Unaltered upstream mill PDF locked as tamper-evident Annex A</div>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="amber" className="p-3.5 bg-gunmetal-billets/70">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Mass Balance Ledger</div>
                  <div className="text-[11px] text-slate-400 leading-tight">Prevents phantom heat reuse across multi-container shipments</div>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="blue" className="p-3.5 bg-gunmetal-billets/70">
              <div className="flex items-start gap-3">
                <Globe2 className="w-5 h-5 text-cobalt-blueprint shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Melt &amp; Pour Law</div>
                  <div className="text-[11px] text-slate-400 leading-tight">Full ISO 3166 compliance for EU 2026/1963 &amp; UK CDS</div>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="emerald" className="p-3.5 bg-gunmetal-billets/70">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">CBAM Tax Defense</div>
                  <div className="text-[11px] text-slate-400 leading-tight">Saves €4,500+ per container vs EU punitive default emission markup</div>
                </div>
              </div>
            </SpotlightCard>
          </div>

          {/* Exporter Hubs Banner */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Engineered for Industrial Hubs:
            </span>
            <span className="text-emerald-400 font-semibold">Howrah &amp; Liluah</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">Dankuni &amp; Hooghly</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">Jamshedpur</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">Vizag &amp; Bellary</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">Ludhiyana &amp; Rajkot</span>
          </div>

        </div>
      </div>
    </section>
  );
};
