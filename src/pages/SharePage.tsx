import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Download, ArrowLeft, FileCheck2, Lock, Check } from 'lucide-react';

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">
                SECURE BUYER COMPLIANCE PACKET
              </span>
              <h1 className="text-xl font-bold text-white">
                EU CBAM Communication &amp; Clause 6 Dossier
              </h1>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              SHARE TOKEN: {token ? token.slice(0, 8) + '...' : 'ACTIVE'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            This verification packet contains the tamper-evident EN 10204 Clause 6 Merged Dossier
            (Exporter Cover Certificate + original upstream mill MTC Annex A) and official EU CBAM
            XML declaration for import customs clearance.
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileCheck2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    Dossier_EXP-2026-109_Clause6.pdf
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    2 Pages · Digitally Sealed &amp; Watermark-Free
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.open('/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf', '_blank')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    CBAM_Communication_EXP-2026-109.xml
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Official EU Schema Communication Packet
                  </div>
                </div>
              </div>
              <button
                onClick={() => alert('EU XML Communication payload downloaded')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export XML</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Lock className="w-3.5 h-3.5" /> SHA-256 Tamper-Locked
            </span>
            <span>Port of Rotterdam &amp; Hamburg Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
