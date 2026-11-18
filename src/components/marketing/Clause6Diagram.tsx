import React from 'react';
import { 
  FileLock2, 
  Cpu, 
  Stamp, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  FileText,
  Binary,
  UserCheck
} from 'lucide-react';

export const Clause6Diagram: React.FC = () => {
  return (
    <section id="clause-6" className="py-16 bg-gunmetal-DEFAULT border-t border-slate-tempered relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-amber-500/30 text-amber-400 text-xs font-mono mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict European Standard Compliance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            The "Zero-Forgery" EN 10204:2004 Clause 6 Compliance Architecture
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            European customs declarants and TÜV/SGS auditors reject forged or re-typed mill certificates.
            HeatLedger AI strictly implements the legal Clause 6 standard to ensure 100% audit immunity.
          </p>
        </div>

        {/* 3-Step Interactive Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-obsidian-900 border border-slate-tempered flex flex-col justify-between relative group hover:border-amber-500/50 transition-all shadow-xl">
            <div className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full bg-amber-500 text-obsidian-900 font-black font-mono text-xs shadow-md">
              STEP 01
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400 group-hover:scale-110 transition-transform">
                <FileLock2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Ingest &amp; Tamper-Evident Lock
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Ingests the raw, original upstream steel mill 3.1 PDF from SAIL, Tata Steel, JSW, or RINL. 
                Computes a SHA-256 cryptographic hash and locks the original document as an unaltered <strong className="text-amber-300">"Annex A"</strong>.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Zero re-typing of upstream chemistry</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>SHA-256 document fingerprint</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-obsidian-900 border border-slate-tempered flex flex-col justify-between relative group hover:border-cobalt-blueprint/50 transition-all shadow-xl">
            <div className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full bg-cobalt-blueprint text-white font-black font-mono text-xs shadow-md">
              STEP 02
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-5 text-cobalt-blueprint group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Deterministic ASTM Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Checks chemical &amp; mechanical readings against target ASTM/EN standards. 
                Auto-populates the exporter's own certified template (Mode A: Transformed Goods) or generates the Clause 6 Pass-Through Packing List (Mode B).
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>IIW Carbon Equivalent (CEV) formula</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Mass balance allocation guard</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-obsidian-900 border border-slate-tempered flex flex-col justify-between relative group hover:border-emerald-500/50 transition-all shadow-xl">
            <div className="absolute -top-3.5 left-6 px-3 py-0.5 rounded-full bg-emerald-500 text-obsidian-900 font-black font-mono text-xs shadow-md">
              STEP 03
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5 text-emerald-400 group-hover:scale-110 transition-transform">
                <Stamp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Authorised QA Sign-Off &amp; XML
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Routes directly to the factory's Authorised Inspection Representative for legal attestation, timestamped digital signature, and factory stamp before compiling the final EU CBAM XML bundle.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Authorised Inspector legal stamp</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Ready for EU CBAM Registry upload</span>
              </div>
            </div>
          </div>

        </div>

        {/* Regulatory Comparison Callout */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-crimson-oxide/10 text-crimson-oxide shrink-0 mt-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-crimson-oxide uppercase font-mono tracking-wide">
                The Illegal Practice (Re-typed Excel Certificates)
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Intermediary stockists often re-type chemical values on their own letterhead without appending the original mill certificate. Under European standard EN 10204 Clause 6, this is classified as non-conforming documentation and triggers immediate customs detention at EU ports.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-1">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-400 uppercase font-mono tracking-wide">
                HeatLedger AI Clause 6 Standard
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                HeatLedger AI preserves the unbroken chain of custody. The factory's transformed 3.1 certificate cites the original heat number and attaches the untouched upstream steel mill document as a tamper-evident Annex, backed by digital inspection sign-off.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
