import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Scale, 
  Zap,
  Globe2, 
  FileCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Flame,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  onLaunchApp: () => void;
  onExplorePresets: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onLaunchApp, 
  onExplorePresets 
}) => {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center py-20 sm:py-24 lg:py-28 bg-gradient-to-b from-slate-900 via-slate-900/95 to-[#0B1120] border-b border-slate-700/60 overflow-hidden">
      
      {/* Precision Technical Engineering Grid & Vibrant Ambient Glows */}
      <div className="absolute inset-0 bg-tech-grid-bright opacity-30 pointer-events-none" />
      
      {/* Top Center Radiant Emerald/Cyan Aura */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[950px] h-[480px] bg-gradient-to-r from-emerald-500/25 via-teal-400/20 to-cyan-500/25 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      
      {/* Molten Amber Forge Glow */}
      <div className="absolute top-1/3 -right-24 w-[550px] h-[450px] bg-amber-500/18 rounded-full blur-[150px] pointer-events-none animate-float-slow" />
      
      {/* Cobalt Blueprint Depth Glow */}
      <div className="absolute bottom-10 -left-28 w-[600px] h-[450px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none animate-float-reverse" />
      
      {/* Subtle Radiant Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-900/30 to-[#0B1120] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 my-auto">
        
        {/* Animated Regulatory Scope Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-slate-850/90 border border-emerald-400/30 text-emerald-300 text-xs font-mono mb-8 shadow-[0_0_25px_rgba(16,185,129,0.2)] backdrop-blur-xl cursor-default"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide font-medium">
            EU Regulation 2026/1963 &amp; CBAM Definitive Regime Compliant
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
            2026 AUDIT-READY
          </span>
        </motion.div>

        {/* Clear, Authoritative Headline with Silk Gradient & Motion Text Reveal */}
        <motion.h1 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl lg:text-[4.75rem] font-extrabold text-white tracking-[-0.035em] leading-[1.08] max-w-5xl mx-auto drop-shadow-sm"
        >
          From Raw Steel Mill Certificate to{' '}
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]">
            EU &amp; UK Customs Clearance
          </span>{' '}
          in 30 Seconds.
        </motion.h1>

        {/* Technical Subheadline with Refined High-Contrast Typography */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-base sm:text-lg lg:text-xl text-slate-200 max-w-3xl mx-auto font-normal leading-relaxed"
        >
          Eliminate <strong className="text-white font-semibold underline decoration-emerald-400/60 underline-offset-4">€4,500/container</strong> in punitive CBAM default taxes. Automatically verify upstream SAIL, Tata Steel, and JSW 3.1 certificates into audit-proof Melt-and-Pour origin declarations and official CBAM dossiers.
        </motion.p>

        {/* Primary and Secondary Actions with Tactile Apple-Style Polish */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm px-8 py-3.5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_45px_rgba(16,185,129,0.6)] transition-all duration-200 group"
          >
            <Zap className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" />
            <span>Launch Factory QA Workbench</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onExplorePresets}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-slate-800/80 hover:bg-slate-750 text-slate-100 hover:text-white font-semibold text-sm px-7 py-3.5 rounded-full border border-slate-700/80 hover:border-slate-500 backdrop-blur-xl shadow-lg active:scale-[0.98] transition-all duration-200"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Test a Sample Shipment Free</span>
          </button>
        </motion.div>

        {/* Live Interactive Telemetry Showcase Card (Floating Hologram Widget) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 max-w-4xl mx-auto rounded-2xl p-1 bg-gradient-to-r from-emerald-500/30 via-slate-700/40 to-blue-500/30 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)]"
        >
          <div className="rounded-[14px] bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-4 sm:p-5 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  PORT OF ROTTERDAM / HAMBURG TELEMETRY GATEWAY
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-semibold">
                  STATUS 200 · CLEARANCE DIRECT
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>HMAC: hl_sig_v1_8e4b7...</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">VERIFIED HEAT</span>
                <span className="font-mono font-bold text-amber-400 text-xs">#HEAT-IN-4409</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">STEEL STANDARD</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">ASTM A106 Gr. B</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">DIRECT EMISSIONS</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">1.78 tCO₂/t (Actual)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">SAVINGS VS DEFAULT</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">€4,500 / 25t Container</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4-Metric Proof Strip with Refined Frosted Cards & Scroll Reveal */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-14 pt-10 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 text-left max-w-5xl mx-auto"
        >
          
          <div className="p-5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-400/50 shadow-md hover:shadow-glow-emerald transition-all duration-300 space-y-2 backdrop-blur-xl group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-emerald-400">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <span className="uppercase tracking-wider font-bold">Zero-Forgery</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
              Untouched upstream mill PDF locked as tamper-evident Annex A per EN 10204 Clause 6.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-400/50 shadow-md hover:shadow-glow-amber transition-all duration-300 space-y-2 backdrop-blur-xl group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-amber-400">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scale className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <span className="uppercase tracking-wider font-bold">Mass Balance</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
              PostgreSQL ledger prevents phantom heat re-allocation audits across multiple invoices.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-700/70 hover:border-blue-400/50 shadow-md hover:shadow-glow-blue transition-all duration-300 space-y-2 backdrop-blur-xl group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-blue-400">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe2 className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <span className="uppercase tracking-wider font-bold">Melt &amp; Pour Law</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
              ISO 3166 Melt &amp; Pour country of origin attestation mandated by EU Reg 2026/1963.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-850/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-400/50 shadow-md hover:shadow-glow-emerald transition-all duration-300 space-y-2 backdrop-blur-xl group">
            <div className="flex items-center gap-2.5 text-xs font-mono font-medium text-emerald-400">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileCheck className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <span className="uppercase tracking-wider font-bold">CBAM Defense</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
              Saves €4,500+ per container vs EU punitive default markups on steel products.
            </p>
          </div>

        </motion.div>

      </div>
    </section>
  );
};
