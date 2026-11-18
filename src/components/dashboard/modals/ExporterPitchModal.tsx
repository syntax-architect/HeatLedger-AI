import React from 'react';
import { 
  Building2, 
  HelpCircle, 
  ShieldCheck, 
  TrendingDown, 
  CheckCircle2, 
  X, 
  Sparkles,
  PhoneCall,
  Flame,
  ArrowRight
} from 'lucide-react';

interface ExporterPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToSimulator: () => void;
}

export const ExporterPitchModal: React.FC<ExporterPitchModalProps> = ({
  isOpen,
  onClose,
  onJumpToSimulator
}) => {
  if (!isOpen) return null;

  const questions = [
    {
      q: "1. Explicit Melt & Pour Attestation",
      detail: "Does your upstream mill certificate explicitly print 'Country of Melt & Pour: INDIA', or will European customs hold your container under EU Regulation 2026/1963?",
      proof: "HeatLedger AI highlights the ISO 3166 Melt & Pour coordinate box or flags an immediate warning before the vessel sails."
    },
    {
      q: "2. The Zero-Forgery Clause 6 Rule",
      detail: "Are you re-typing chemical analysis into Excel certificates? European declarants are rejecting re-typed stockist sheets without original mill annexes.",
      proof: "HeatLedger AI locks the original upstream mill PDF as an unalterable Annex A behind your factory cover sheet."
    },
    {
      q: "3. Anti-Phantom Mass Balance",
      detail: "If a TÜV or SGS auditor reviews your past 6 months, did your factory export 80 tonnes attributed to a 50-tonne SAIL heat batch?",
      proof: "Our PostgreSQL mass balance ledger decrements quota in real time, guaranteeing 100% audit defense."
    },
    {
      q: "4. CBAM Default Tax Defense",
      detail: "Are European buyers asking for €3,000 to €5,000 per container in CBAM default markup deductions?",
      proof: "Our recursive precursor calculator proves verified emissions at ~1.79 tCO2e/t, saving your buyer ~€4,500 per container."
    },
    {
      q: "5. Fast Pilot Clearance",
      detail: "Would you test a 1-container pilot audit for ₹25,000 to unblock an urgent European invoice in 24 hours?",
      proof: "We deliver the complete 3.1 PDF bundle, Country of Melt & Pour statement, and EU CBAM XML within 24 hours."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-900/85 backdrop-blur-md">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit mb-3 border border-amber-300">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Exporter Discovery &amp; Field Pitch Script</span>
        </div>

        <h3 className="text-xl font-black text-slate-900 tracking-tight">
          The 5 Exporter Validation Questions (Howrah / Liluah / Kolkata)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Use this script when meeting with Export Directors and QA Heads of tube, flange, and fastener manufacturing plants.
        </p>

        {/* Question Cards */}
        <div className="mt-5 space-y-3">
          {questions.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 font-mono">
                {item.q}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {item.detail}
              </p>
              <div className="pt-1 text-[11px] font-mono text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>The HeatLedger Solution:</strong> {item.proof}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono text-slate-500">
            Target Pilot: ₹25,000 per fast audit
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onJumpToSimulator();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-extrabold text-xs flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-4 h-4" />
              <span>Demo 30-Sec MTC Simulator</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
