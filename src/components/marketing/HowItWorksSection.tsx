import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Scale, Lock, CheckCircle2, FileCode2 } from 'lucide-react';
import { GsapReveal } from '../effects/GsapMotion';

export const HowItWorksSection: React.FC = () => {
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  const steps = [
    {
      num: '01',
      title: 'Ingest & deterministic vector OCR',
      subtitle: 'PDF upload, plant inbox, or shop-floor camera',
      desc: 'Mill Test Certificates are parsed with anchored vector coordinates. Heat numbers, chemical ladle composition, mechanical properties, and Melt-and-Pour origin are extracted with confidence flags—any reading below 85% routes to QA review.',
      artifact: 'Anchored bounding coordinates + SHA-256 hash',
      icon: UploadCloud,
      previewTitle: 'Stage 01 · Deterministic Intake Receipt',
      previewMetrics: [
        { label: 'Source PDF', value: 'Tata_Steel_3.1_TSJ-26-9021.pdf' },
        { label: 'SHA-256 Digest', value: '878a3b75…4442f7da79' },
        { label: 'OCR Confidence', value: '99.4% (8/8 ladle fields)' },
        { label: 'Melt & Pour Origin', value: 'India [IN] · BOF/CC' },
      ],
    },
    {
      num: '02',
      title: 'Mass balance & emissions ledger',
      subtitle: 'Heat reconciliation & CBAM SEE calculation trace',
      desc: 'Each mill heat is booked into an atomic mass-balance ledger. Allocating tonnage to a container decrements available heat balance automatically while computing specific embedded emissions across precursor, fuel, and electricity inputs.',
      artifact: 'Reconciled tonnage + Annex IV SEE formula trace',
      icon: Scale,
      previewTitle: 'Stage 02 · Atomic Heat Mass-Balance Entry',
      previewMetrics: [
        { label: 'Mill Heat Lot', value: '#TSJ-26-9021 (40.000 MT)' },
        { label: 'Container Allocation', value: '24.500 MT → EXP-2026-109' },
        { label: 'Remaining Balance', value: '15.500 MT locked in ledger' },
        { label: 'Calculated SEE', value: '2.05 tCO₂e/t (vs 3.28 EU default)' },
      ],
    },
    {
      num: '03',
      title: 'Digital sign-off & customs package',
      subtitle: 'Ed25519 signature & Clause 6 Annex A bundle',
      desc: 'Authorised QA inspectors verify exceptions with step-up PIN sign-off. HeatLedger outputs a signed EN 10204 3.1 cover sheet, the byte-identical upstream mill PDF as Annex A, and a draft EU CBAM XML file for your buyer.',
      artifact: 'Digitally Signed (Ed25519) PDF + Draft CBAM XML',
      icon: Lock,
      previewTitle: 'Stage 03 · Sealed Customs Dossier Package',
      previewMetrics: [
        { label: 'Signature Standard', value: 'Ed25519 (Step-Up Inspector PIN)' },
        { label: 'Annex A Preservation', value: 'Byte-identical upstream mill PDF' },
        { label: 'CBAM Payload', value: 'CBAM_Communication_EXP-2026-109.xml' },
        { label: 'Public Verification', value: '/verify/HL-2026-9021 (QR Seal)' },
      ],
    },
  ];

  const currentStep = steps[activeStepIdx];

  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 bg-[#FFFFFF] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold text-[#047857] mb-3">
            Compliance Architecture · Three Deterministic Stages
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            From mill intake to customs dossier in three controlled steps
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            Every calculation, heat allocation, and document hash is traceable back to the primary
            mill certificate with zero manual re-keying. Select any stage to inspect its output trace.
          </p>
        </GsapReveal>

        {/* Unified 3-Column Interactive Pipeline */}
        <GsapReveal y={24}>
          <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E4E4E7]">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isSelected = activeStepIdx === idx;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setActiveStepIdx(idx)}
                    aria-pressed={isSelected}
                    className={`relative overflow-hidden p-6 sm:p-8 text-left flex flex-col justify-between gap-6 transition-colors duration-200 cursor-pointer ${
                      isSelected ? 'bg-[#FAFAFA]' : 'bg-[#FFFFFF] hover:bg-[#FAFAFA]/70'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="how-it-works-active-top"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-x-0 top-0 h-[3px] bg-[#059669]"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono tabular-nums text-sm font-semibold ${
                              isSelected ? 'text-[#047857]' : 'text-[#52525B]'
                            }`}
                          >
                            {step.num}.
                          </span>
                          {isSelected && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                              Inspecting
                            </span>
                          )}
                        </div>
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
                              : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#52525B]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-[#09090B] tracking-[-0.02em]">
                        {step.title}
                      </h3>
                      <p className="text-xs font-medium text-[#52525B] mt-1">{step.subtitle}</p>
                      <p className="text-sm text-[#52525B] leading-relaxed mt-3">{step.desc}</p>
                    </div>

                    <div className="pt-4 border-t border-[#E4E4E7]/80">
                      <div className="text-xs text-[#52525B]">Output artifact</div>
                      <div className="text-xs font-medium text-[#09090B] mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[#059669]' : 'text-[#A1A1AA]'
                          }`}
                        />
                        <span>{step.artifact}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Stage Artifact Inspection Strip */}
            <div className="border-t border-[#E4E4E7] bg-[#0A0C10] text-[#F4F4F5] px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.num}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 font-medium text-[#F4F4F5]">
                      <FileCode2 className="w-4 h-4 text-emerald-400" />
                      <span>{currentStep.previewTitle}</span>
                    </div>
                    <span className="font-mono text-[#A1A1AA]">
                      Step {currentStep.num} of 03 · Deterministic record
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {currentStep.previewMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="p-3 rounded-lg bg-[#111318] border border-white/[0.08]"
                      >
                        <div className="text-xs text-[#A1A1AA]">{metric.label}</div>
                        <div className="font-mono tabular-nums text-xs font-medium text-[#F4F4F5] mt-1 truncate">
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
};
