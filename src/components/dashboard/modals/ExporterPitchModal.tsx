import React, { useEffect } from 'react';
import { CheckCircle2, X, PhoneCall, ArrowRight } from 'lucide-react';

interface ExporterPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToSimulator: () => void;
}

export const ExporterPitchModal: React.FC<ExporterPitchModalProps> = ({
  isOpen,
  onClose,
  onJumpToSimulator,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const questions = [
    {
      num: '01',
      title: 'Explicit Melt & Pour Attestation',
      detail:
        "Does your upstream mill certificate explicitly declare 'Country of Melt & Pour: INDIA', or could European customs flag your container under EU Regulation 2026/1963?",
      proof:
        'HeatLedger AI validates the ISO 3166 Melt & Pour field and raises an immediate pre-shipment warning before dispatch.',
    },
    {
      num: '02',
      title: 'EN 10204 Clause 6 Byte-Identical Preservation',
      detail:
        'Are you re-typing chemical analysis into Excel certificates? European declarants routinely reject re-typed sheets without untouched original mill annexes.',
      proof:
        'HeatLedger AI bundles the untouched upstream mill PDF byte-identically as Annex A behind a signed exporter cover sheet.',
    },
    {
      num: '03',
      title: 'Anti-Phantom Mass Balance',
      detail:
        'If a verifier reviews your past 6 months, can you prove you never shipped 80 tonnes attributed to a 50-tonne upstream heat batch?',
      proof:
        'The mass-balance ledger decrements remaining tonnage in real time with tamper-evident SHA-256 audit trails.',
    },
    {
      num: '04',
      title: 'CBAM Default Markup Defense',
      detail: 'Are European buyers requesting deductions based on EU CBAM default values?',
      proof:
        'Our recursive precursor calculator models verified facility emissions (~2.03 tCO2e/t vs. 4.20 t default), illustrating an estimated cost difference vs. default values of ~€4,000 per container.',
    },
    {
      num: '05',
      title: '24-Hour Single-Container Pilot',
      detail:
        'Would you test a single-container audit via the ₹4,999 First Container Express Pass (100% credited on Plant OS upgrade) on an upcoming European shipment?',
      proof:
        'Delivers the signed Clause 6 PDF bundle, Country of Melt & Pour attestation, and EU CBAM XML template within 24 hours.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exporter-pitch-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] rounded-xl max-w-2xl w-full border border-[#E4E4E7] shadow-xl max-h-[90vh] flex flex-col overflow-hidden font-sans text-[#09090B]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-xs font-medium text-[#B45309]">
              <PhoneCall className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Exporter Field Discovery Guide</span>
            </div>
            <h3
              id="exporter-pitch-title"
              className="text-base font-semibold text-[#09090B] tracking-tight"
            >
              5 Validation Questions for Indian Steel Exporters
            </h3>
            <p className="text-xs text-[#52525B]">
              Structured discovery guide for Export Directors and QA Heads across tube, flange,
              and fastener plants.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer shrink-0"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hairline-Divided Question List */}
        <div className="overflow-y-auto flex-1 divide-y divide-[#E4E4E7]">
          {questions.map((item) => (
            <div key={item.num} className="px-6 py-4 space-y-1.5 hover:bg-[#FAFAFA] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B]">
                  {item.num}
                </span>
                <h4 className="text-xs font-semibold text-[#09090B]">{item.title}</h4>
              </div>
              <p className="text-xs text-[#52525B] leading-relaxed pl-7">{item.detail}</p>
              <div className="pt-1 text-xs text-[#047857] flex items-start gap-1.5 pl-7">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-[#065F46]">HeatLedger:</strong> {item.proof}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Hairline Footer */}
        <div className="px-6 py-3.5 border-t border-[#E4E4E7] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-mono text-[#52525B]">
            Pilot: ₹4,999 Express Pass (credited on Plant OS)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToSimulator();
              }}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open MTC Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
