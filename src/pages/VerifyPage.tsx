import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Lock, ArrowLeft, FileText, Download } from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to HeatLedger Home
        </Link>

        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-400">
                EU REGULATION 2026/1963 · VERIFIED
              </span>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              STATUS: VALID
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">Public Customs Verification Gateway</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Cryptographic verification code: <span className="text-emerald-300 font-bold">{code || 'EXP-2026-109-VERIFIED'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">EXPORTER</span>
              <span className="text-white font-bold">Howrah Precision Forgings</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">INSTALLATION ID</span>
              <span className="text-cyan-300 font-bold">IN-WB-4409</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">HEAT NUMBER</span>
              <span className="text-amber-400 font-bold">#TSJ-26-9021</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">MELT &amp; POUR</span>
              <span className="text-emerald-400 font-bold">India [IN] (BOF/CC)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 font-mono text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>HMAC-SHA256 SIGNATURE VALID</span>
            </div>
            <div className="text-slate-400 text-xs truncate">
              hl_sig_v1_17af54387e554162e6031e600d780d1067bddb03bea69187eaa685b0178a56c5
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-slate-500">Fast-Track Customs Inspection Pass</span>
            <Link
              to="/app"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition-all"
            >
              Open in Workbench
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
