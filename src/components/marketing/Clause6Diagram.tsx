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
  UserCheck,
  Lock,
  Layers,
  FileCode
} from 'lucide-react';

export const Clause6Diagram: React.FC = () => {
  return (
    <section id="clause-6" className="py-20 sm:py-24 lg:py-28 bg-obsidian-900 border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>European Standard Compliance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-[-0.03em] leading-tight">
            The Zero-Forgery EN 10204 Clause 6 Architecture
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            European declarants and TÜV Rheinland auditors systematically reject re-typed certificates. HeatLedger AI locks the untouched upstream steel mill certificate as an unalterable Annex A.
          </p>
        </div>

        {/* Unified Chain-of-Custody Pipeline (Replaces 3 vibe-coded cards) */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-sm mb-12">
          <div className="flex flex-col lg:flex-row items-stretch gap-6 relative">
            
            {/* Stage 1: Ingest & Cryptographic Lock */}
            <div className="flex-1 rounded-lg bg-slate-950/80 border border-slate-800 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                    Stage 01 · Intake
                  </span>
                  <FileLock2 className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Ingest &amp; Cryptographic Lock
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ingests the original upstream steel mill 3.1 PDF from primary producers (SAIL, Tata Steel, JSW). Computes an immutable SHA-256 checksum and binds the document as tamper-evident <strong className="text-slate-200">Annex A</strong>.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Zero re-typing of ladle chemistry</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>SHA-256 document fingerprint</span>
                </div>
              </div>
            </div>

            {/* Stage Connector Arrow 1 */}
            <div className="hidden lg:flex items-center justify-center text-slate-600 px-1">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Stage 2: Metallurgy Verification & Mass Balance */}
            <div className="flex-1 rounded-lg bg-slate-950/80 border border-slate-800 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                    Stage 02 · Engine
                  </span>
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Deterministic ASTM Verification
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deterministic OCR matches chemical elements and tensile tests against target standards. Calculates IIW Carbon Equivalent (CEV) and runs PostgreSQL mass balance constraints to prevent phantom heat reuse.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>IIW Carbon Equivalent formula</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Anti-phantom mass balance ledger</span>
                </div>
              </div>
            </div>

            {/* Stage Connector Arrow 2 */}
            <div className="hidden lg:flex items-center justify-center text-slate-600 px-1">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Stage 3: Authorized Sign-Off & Customs XML */}
            <div className="flex-1 rounded-lg bg-slate-950/80 border border-slate-800 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    Stage 03 · Dispatch
                  </span>
                  <Stamp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Authorized Sign-Off &amp; XML
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Routes to the Authorized Inspection Representative for digital signature and official factory seal. Generates the compliant EN 10204 cover dossier alongside the European CBAM XML communication file.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Authorized Inspector digital stamp</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Official EU CBAM XML generation</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Regulatory Audit Comparison Panel */}
        <div className="p-6 sm:p-8 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase font-mono tracking-wider">
                The Non-Compliant Risk: Re-typed Spreadsheets
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Intermediary stockists often re-type chemical values on their own letterhead without appending the original mill certificate. Under European standard EN 10204 Clause 6, this is classified as non-conforming documentation and triggers immediate customs detention at EU ports.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono tracking-wider">
                HeatLedger AI Clause 6 Standard
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                HeatLedger AI preserves the unbroken chain of custody. The factory's transformed 3.1 certificate cites the original heat number and attaches the untouched upstream steel mill document as a tamper-evident Annex, backed by digital inspection sign-off.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
