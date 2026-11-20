import React from 'react';
import { FileLock2, Cpu, Stamp, ArrowRight, Check, X } from 'lucide-react';
import { GsapReveal, GsapStagger } from '../effects/GsapMotion';
import { SpotlightCard } from '../effects/SpotlightCard';

const COMPARISON_ROWS = [
  {
    criterion: 'Original mill 3.1 PDF',
    retyped: 'Omitted or altered onto stockist letterhead',
    clause6: 'Preserved byte-identical as Annex A',
  },
  {
    criterion: 'Cryptographic verification',
    retyped: 'None; impossible to prove document provenance',
    clause6: 'Tamper-evident SHA-256 hash linked to cover',
  },
  {
    criterion: 'Ladle chemistry transcription',
    retyped: 'Manually re-typed into Word or Excel templates',
    clause6: 'Coordinate-anchored extraction tied to source PDF',
  },
  {
    criterion: 'Heat tonnage reconciliation',
    retyped: 'Unchecked; prone to duplicate lot allocation',
    clause6: 'Atomic mass-balance lock per upstream heat',
  },
  {
    criterion: 'Authorised QA sign-off',
    retyped: 'Static pasted JPEG stamp with no audit trail',
    clause6: 'Digitally Signed (Ed25519) with inspector MFA log',
  },
];

export const Clause6Diagram: React.FC = () => {
  const stages = [
    {
      stage: '01',
      label: 'Intake & Hash',
      title: 'Byte-identical original preservation',
      desc: 'Ingests the upstream 3.1 MTC from primary mills (Tata Steel, SAIL, JSW). Computes a tamper-evident SHA-256 checksum and binds the unaltered PDF as Annex A.',
      checks: ['Zero re-typing of ladle chemistry', 'SHA-256 document fingerprint'],
      icon: FileLock2,
      accent: 'text-amber-400',
      spot: 'amber' as const,
    },
    {
      stage: '02',
      label: 'Deterministic Engine',
      title: 'ASTM / EN spec & mass balance',
      desc: 'Validates chemical composition and tensile properties against target standards, computes IIW Carbon Equivalent (CEV), and reconciles available heat tonnage.',
      checks: ['IIW Carbon Equivalent (CEV) check', 'Anti-phantom mass-balance ledger'],
      icon: Cpu,
      accent: 'text-blue-400',
      spot: 'blue' as const,
    },
    {
      stage: '03',
      label: 'Authorized Release',
      title: 'Ed25519 sign-off & CBAM XML',
      desc: 'Routes to the plant Authorised Inspection Representative for digital sign-off. Produces the Clause 6 merged dossier alongside the draft EU CBAM XML file.',
      checks: ['Digitally Signed (Ed25519) stamp', 'Draft EU CBAM communication XML'],
      icon: Stamp,
      accent: 'text-emerald-400',
      spot: 'emerald' as const,
    },
  ];

  return (
    <section
      id="clause-6"
      className="py-20 lg:py-28 bg-[#0A0C10] text-[#F4F4F5] border-b border-white/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold text-emerald-400 mb-3">
            European Standard EN 10204:2004 Clause 6
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            Unaltered upstream mill certificates by design
          </h2>
          <p className="mt-4 text-base text-[#A1A1AA] leading-relaxed">
            EN 10204 Clause 6 requires intermediaries to pass on the original inspection document
            without alteration, attaching a separate explanation sheet where needed. HeatLedger
            enforces that chain of custody cryptographically.
          </p>
        </GsapReveal>

        {/* Horizontal 3-Stage Technical Blueprint Flow */}
        <GsapStagger
          stagger={0.1}
          className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 mb-12"
        >
          {stages.map((item, idx) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.stage}>
                <SpotlightCard
                  data-gsap-item
                  spotlightColor={item.spot}
                  lift
                  className="flex-1 rounded-xl bg-[#111318] border-white/[0.08] p-6"
                >
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <span
                          className={`font-mono tabular-nums text-xs font-semibold ${item.accent}`}
                        >
                          Stage {item.stage} · {item.label}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-center text-[#A1A1AA]">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-[#F4F4F5] tracking-[-0.015em]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/[0.08] space-y-2 text-xs text-[#F4F4F5]">
                      {item.checks.map((chk) => (
                        <div key={chk} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{chk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>

                {idx < stages.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:flex items-center justify-center w-10 shrink-0"
                  >
                    <div className="h-px w-4 bg-white/15" />
                    <ArrowRight className="w-4 h-4 text-[#A1A1AA] -mx-0.5 shrink-0" />
                    <div className="h-px w-4 bg-white/15" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </GsapStagger>

        {/* Side-by-Side Comparison Table */}
        <GsapReveal y={22}>
          <div className="rounded-xl bg-[#111318] border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0D0F14] flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#F4F4F5]">
                Non-Conforming Re-Typed Sheet vs. EN 10204 Clause 6 Byte-Identical Package
              </h3>
              <span className="text-xs text-[#A1A1AA]">Customs &amp; verifier audit comparison</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#111318] text-[#A1A1AA]">
                    <th className="py-3.5 px-6 font-medium w-[24%]">Audit Criterion</th>
                    <th className="py-3.5 px-6 font-medium text-red-400 w-[38%]">
                      Non-Conforming Re-Typed Sheet
                    </th>
                    <th className="py-3.5 px-6 font-medium text-emerald-400 w-[38%]">
                      EN 10204 Clause 6 Byte-Identical Package
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.criterion} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-6 font-medium text-[#F4F4F5]">{row.criterion}</td>
                      <td className="py-3.5 px-6 text-[#A1A1AA]">
                        <span className="inline-flex items-start gap-2">
                          <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>{row.retyped}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-[#F4F4F5]">
                        <span className="inline-flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{row.clause6}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
};
