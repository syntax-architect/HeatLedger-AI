import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { GsapReveal, GsapStagger } from '../effects/GsapMotion';

export const ProblemSection: React.FC = () => {
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const rows = [
    {
      code: '01',
      area: 'Certificate integrity',
      habit: 'Re-typing mill ladle chemistry onto exporter company letterheads',
      consequence:
        'Violates EN 10204 Clause 6 (EN 10204:2004). German and Italian customs auditors reject re-typed inspection certificates lacking the unaltered mill sheet.',
      standard:
        'Byte-identical original preservation of the upstream mill PDF with tamper-evident SHA-256 verification attached as Annex A.',
    },
    {
      code: '02',
      area: 'Melt-and-Pour origin',
      habit: 'Shipping without explicit Country of Melt and Pour on mill certificates',
      consequence:
        'Containers held at Rotterdam, Antwerp, or Genoa under Council Regulation (EU) 2023/1214 (Art. 3g) and EU Reg 2026/1963.',
      standard:
        'Mandatory extraction and verification of primary crude steel melt plant and ISO 3166 origin prior to factory gate release.',
    },
    {
      code: '03',
      area: 'CBAM emissions basis',
      habit: 'Falling back to EU default emissions factors to avoid factory data collection',
      consequence:
        'Triggers progressive statutory markups under Implementing Regulation (EU) 2025/2621, materially increasing landed CBAM certificate costs per container.',
      standard:
        'Deterministic specific embedded emissions (SEE) calculation trace per tonne covering precursor route, direct fuel, and electricity.',
    },
    {
      code: '04',
      area: 'Heat mass balance',
      habit: 'Tracking heat number allocations across disconnected plant spreadsheets',
      consequence:
        'Phantom over-allocation across split export lots (e.g., invoicing 60 MT against a 40 MT mill heat), failing verifier mass-balance reconciliation.',
      standard:
        'Atomic heat mass-balance ledger locks remaining available tonnage and blocks over-allocations with exact deficit reporting.',
    },
  ];

  return (
    <section
      id="problem"
      className="py-20 lg:py-28 bg-[#FAFAFA] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold text-[#B45309] mb-3">
            Audit Exposure · Shop-Floor Failure Modes
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            How Excel Spreadsheets Cause Customs Impoundment
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            European border authorities and accredited verifiers inspect primary metallurgical
            evidence—not manual summaries. Compare legacy workflows against HeatLedger controls.
          </p>
        </GsapReveal>

        {/* Structured Architectural Ledger */}
        <GsapReveal y={26}>
          <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#E4E4E7]">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid lg:grid-cols-12 bg-[#FAFAFA] px-6 py-3.5 text-xs font-semibold text-[#52525B]">
              <div className="col-span-2">Control Area</div>
              <div className="col-span-5 pr-6">Legacy Shop-Floor Practice &amp; Port Risk</div>
              <div className="col-span-5 pl-6">HeatLedger Precision Control</div>
            </div>

            <GsapStagger stagger={0.08} className="divide-y divide-[#E4E4E7]">
              {rows.map((row) => {
                const isFocused = activeCode === row.code;
                return (
                  <div
                    key={row.code}
                    data-gsap-item
                    onMouseEnter={() => setActiveCode(row.code)}
                    onMouseLeave={() => setActiveCode(null)}
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-0 p-6 transition-colors duration-200 ${
                      isFocused ? 'bg-[#FAFAFA]' : 'bg-[#FFFFFF]'
                    }`}
                  >
                    {/* Control Area */}
                    <div className="lg:col-span-2 lg:pr-4 flex lg:flex-col items-center lg:items-start gap-2.5 lg:gap-1">
                      <span
                        className={`font-mono tabular-nums text-xs font-semibold transition-colors ${
                          isFocused ? 'text-[#047857]' : 'text-[#52525B]'
                        }`}
                      >
                        {row.code}
                      </span>
                      <span className="text-sm font-semibold text-[#09090B]">{row.area}</span>
                    </div>

                    {/* Legacy Practice & Risk */}
                    <div className="lg:col-span-5 lg:pr-6 lg:border-r border-[#E4E4E7] space-y-2">
                      <div className="flex items-start gap-2.5">
                        <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-[#09090B] leading-snug">
                          {row.habit}
                        </p>
                      </div>
                      <p className="text-xs text-[#52525B] leading-relaxed pl-6">
                        {row.consequence}
                      </p>
                    </div>

                    {/* HeatLedger Standard */}
                    <div className="lg:col-span-5 lg:pl-6 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-[#047857] block mb-1">
                          HeatLedger standard
                        </span>
                        <p className="text-xs sm:text-sm text-[#09090B] leading-relaxed">
                          {row.standard}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </GsapStagger>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
};
