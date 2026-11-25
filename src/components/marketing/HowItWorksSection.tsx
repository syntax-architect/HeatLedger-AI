import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Scale, Lock, CheckCircle2, FileCode2 } from 'lucide-react';
import { GsapReveal } from '../effects/GsapMotion';

export const HowItWorksSection: React.FC = () => {
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  const steps = [
    {
      num: '1',
      title: 'Ingest and deterministic vector OCR',
      subtitle: 'PDF upload, plant inbox, or shop-floor camera',
      desc: 'Mill Test Certificates are parsed with anchored vector coordinates. Heat numbers, ladle chemistry, mechanical properties, and Melt-and-Pour origin are extracted with confidence checks—any reading below 85% routes to QA review.',
      artifact: 'Anchored bounding coordinates and SHA-256 hash',
      icon: UploadCloud,
      previewTitle: 'Stage 1 · Deterministic intake receipt',
      previewMetrics: [
        { label: 'Source PDF', value: 'Tata_Steel_3.1_TSJ-26-9021.pdf' },
        { label: 'SHA-256 digest', value: '878a3b75…4442f7da79' },
        { label: 'OCR confidence', value: '99.4% (8/8 ladle fields)' },
        { label: 'Melt & Pour origin', value: 'India (IN) · BOF/CC' },
      ],
    },
    {
      num: '2',
      title: 'Mass balance and emissions ledger',
      subtitle: 'Heat reconciliation and CBAM SEE calculation trace',
      desc: 'Each mill heat enters an atomic mass-balance ledger. Allocating tonnage to a container decrements available heat balance automatically while computing specific embedded emissions across precursor, fuel, and electricity inputs.',
      artifact: 'Reconciled tonnage and Annex IV SEE formula trace',
      icon: Scale,
      previewTitle: 'Stage 2 · Atomic heat mass-balance entry',
      previewMetrics: [
        { label: 'Mill heat lot', value: '#TSJ-26-9021 (40.00 MT)' },
        { label: 'Container allocation', value: '24.50 MT → EXP-2026-109' },
        { label: 'Remaining balance', value: '15.50 MT locked in ledger' },
        { label: 'Calculated SEE', value: '2.05 tCO₂e/t (vs 3.28 EU default)' },
      ],
    },
    {
      num: '3',
      title: 'Digital sign-off and customs package',
      subtitle: 'Ed25519 signature and Clause 6 Annex A bundle',
      desc: 'Authorised QA inspectors verify exceptions with step-up PIN sign-off. HeatLedger outputs a signed EN 10204 3.1 cover sheet, the byte-identical upstream mill PDF as Annex A, and a draft EU CBAM XML file for your buyer.',
      artifact: 'Digitally signed (Ed25519) PDF and draft CBAM XML',
      icon: Lock,
      previewTitle: 'Stage 3 · Sealed customs dossier package',
      previewMetrics: [
        { label: 'Signature standard', value: 'Ed25519 (Step-up inspector PIN)' },
        { label: 'Annex A preservation', value: 'Byte-identical upstream mill PDF' },
        { label: 'CBAM payload', value: 'CBAM_Communication_EXP-2026-109.xml' },
        { label: 'Public verification', value: '/verify/HL-2026-9021 (QR Seal)' },
      ],
    },
  ];

  const currentStep = steps[activeStepIdx];

  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 bg-[#F7F5F0] text-[#18181A] border-b border-[#18181A]/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-12">
          <div className="text-xs font-mono text-[#047857] mb-3">
            Compliance architecture · Three deterministic stages
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-[#18181A] tracking-[-0.025em] leading-[1.12] [text-wrap:balance]">
            From mill intake to customs dossier in three controlled steps
          </h2>
          <p className="mt-4 text-base text-[#55544E] leading-relaxed">
            Every calculation, heat allocation, and document hash traces back to the primary mill
            certificate without manual re-keying. Select a stage to inspect its output record.
          </p>
        </GsapReveal>

        {/* Unified 3-Column Interactive Pipeline */}
        <GsapReveal y={12}>
          <div className="rounded-2xl border border-[#18181A]/10 bg-[#FCFBF8] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#18181A]/[0.08]">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isSelected = activeStepIdx === idx;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setActiveStepIdx(idx)}
                    aria-pressed={isSelected}
                    className={`relative p-6 sm:p-8 text-left flex flex-col justify-between gap-6 transition-colors duration-150 cursor-pointer ${
                      isSelected ? 'bg-[#EFECE5]/60' : 'bg-[#FCFBF8] hover:bg-[#EFECE5]/35'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="how-it-works-active-top"
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 top-0 h-[2px] bg-[#059669]"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono tabular-nums text-xs font-medium ${
                              isSelected ? 'text-[#047857]' : 'text-[#78766E]'
                            }`}
                          >
                            Stage {step.num}
                          </span>
                          {isSelected && (
                            <span className="text-xs font-mono text-[#047857]">· Active</span>
                          )}
                        </div>
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected ? 'text-[#047857]' : 'text-[#78766E]'
                          }`}
                          strokeWidth={1.5}
                        />
                      </div>

                      <h3 className="text-lg font-medium text-[#18181A] tracking-[-0.015em]">
                        {step.title}
                      </h3>
                      <p className="text-xs text-[#78766E] mt-1">{step.subtitle}</p>
                      <p className="text-sm text-[#55544E] leading-relaxed mt-3">{step.desc}</p>
                    </div>

                    <div className="pt-4 border-t border-[#18181A]/[0.08]">
                      <div className="text-xs text-[#78766E]">Output artifact</div>
                      <div className="text-xs font-medium text-[#18181A] mt-1 flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-[#047857]' : 'text-[#78766E]'
                          }`}
                          strokeWidth={1.5}
                        />
                        <span>{step.artifact}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Stage Artifact Inspection Strip */}
            <div className="border-t border-[#18181A]/[0.08] bg-[#121316] text-[#EAEAEA] px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.num}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 font-medium text-[#EAEAEA]">
                      <FileCode2 className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                      <span>{currentStep.previewTitle}</span>
                    </div>
                    <span className="font-mono text-[#6F7480]">
                      Stage {currentStep.num} of 3 · Deterministic record
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {currentStep.previewMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="p-3 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08]"
                      >
                        <div className="text-xs text-[#9FA3AD]">{metric.label}</div>
                        <div className="font-mono tabular-nums text-xs font-medium text-[#EAEAEA] mt-1 truncate">
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
