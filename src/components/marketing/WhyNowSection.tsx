import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, AlertTriangle, ShieldCheck, ChevronRight, BookOpen } from 'lucide-react';
import { SOURCED_REGULATORY_FACTS } from '../../data/sourcedFacts';
import { GsapReveal, GsapStagger } from '../effects/GsapMotion';

const KEY_MILESTONES = [
  {
    date: '1 Jan 2026',
    jurisdiction: 'EU',
    title: 'CBAM Definitive Regime',
    detail: 'Transitional reporting ends; verified actual emissions and default markups enter force.',
    status: 'In Force',
  },
  {
    date: '1 Oct 2026',
    jurisdiction: 'EU',
    title: 'Melt & Pour Attestation',
    detail: 'Customs declarations require primary country of melt and pour evidence under EU 2026/1963.',
    status: 'Active',
  },
  {
    date: '1 Jan 2027',
    jurisdiction: 'UK',
    title: 'UK CBAM Enactment',
    detail: 'UK Carbon Border Adjustment Mechanism enters force for imported iron and steel.',
    status: 'Upcoming',
  },
  {
    date: '1 Feb 2027',
    jurisdiction: 'EU',
    title: 'CBAM Certificate Sales',
    detail: 'European Commission begins certificate sales to authorised declarants via central platform.',
    status: 'Upcoming',
  },
  {
    date: '30 Sep 2027',
    jurisdiction: 'EU',
    title: 'First Annual Surrender',
    detail: 'First annual CBAM declaration and certificate surrender due for 2026 imports.',
    status: 'Deadline',
  },
];

const ENFORCEMENT_DETAILS: Record<
  string,
  {
    shortTag: string;
    customsCheck: string;
    heatLedgerArtifact: string;
    impactMetric: string;
  }
> = {
  'cbam-definitive-start': {
    shortTag: 'CBAM Surrender',
    customsCheck:
      'Authorised declarants must reconcile imported steel tonnage against verified installation-level direct and precursor emissions—or default to higher EU benchmark cost factors.',
    heatLedgerArtifact:
      'Draft EU CBAM Communication XML with Annex IV Specific Embedded Emissions (SEE) calculation trace and mill-heat mass balance.',
    impactMetric: 'Actual SEE vs. EU Default Factor',
  },
  'sanctions-melt-and-pour': {
    shortTag: 'Melt & Pour',
    customsCheck:
      'Port customs brokers verify ISO 3166-1 country of melt and pour directly on upstream mill test certificates to confirm zero restricted Russian-origin crude steel inputs.',
    heatLedgerArtifact:
      'Extracted Melt-and-Pour origin tag anchored to primary mill heat coordinates, cross-checked against commercial invoice lots.',
    impactMetric: 'ISO 3166-1 Origin Verification',
  },
  'default-markups-schedule': {
    shortTag: 'Default Markups',
    customsCheck:
      'Unverified shipments trigger progressive statutory markups above default benchmark emission factors (0% in 2026, +10% in 2027, +20% in 2028).',
    heatLedgerArtifact:
      'Precursor & plant-level supplier intake links capturing audited actual fuel, electricity, and scrap ratios per reporting quarter.',
    impactMetric: '0% → +10% → +20% Schedule',
  },
  'en-10204-clause-6': {
    shortTag: 'Clause 6 Annex A',
    customsCheck:
      'European QA auditors reject certificates where intermediaries re-type chemistry onto their own letterhead without attaching the unaltered upstream mill certificate.',
    heatLedgerArtifact:
      'Signed EN 10204 3.1 cover sheet bundled with byte-identical original preservation of the upstream mill PDF as Annex A and SHA-256 digest.',
    impactMetric: 'Byte-Identical Annex A Bundle',
  },
};

export const WhyNowSection: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const facts = SOURCED_REGULATORY_FACTS.slice(0, 4);
  const activeFact = facts[selectedIdx] || facts[0];
  const activeDetail = ENFORCEMENT_DETAILS[activeFact.id] || {
    shortTag: 'Binding Statute',
    customsCheck: 'Customs authorities verify primary mill provenance and embedded emissions records.',
    heatLedgerArtifact: 'Tamper-evident SHA-256 customs dossier with signed EN 10204 3.1 cover.',
    impactMetric: 'Audit-Ready Dossier',
  };

  return (
    <section
      id="why-now"
      className="py-20 lg:py-28 bg-[#FFFFFF] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold text-[#047857] mb-3">
            Statutory Requirement & Timeline · Official Journal of the European Union
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            Why 2026 Ends Spreadsheet Self-Declarations
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            Every compliance deadline below is codified in binding European Union and UK customs
            statutes affecting Indian steel, pipe, flange, and fastener shipments.
          </p>
        </GsapReveal>

        {/* Horizontal 5-Milestone Regulatory Timeline with Progress Hairline */}
        <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] overflow-hidden mb-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="h-[2px] w-full bg-[#E4E4E7] overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#D97706] origin-left"
            />
          </div>

          <GsapStagger
            stagger={0.07}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E7]"
          >
            {KEY_MILESTONES.map((milestone) => (
              <div
                key={milestone.date}
                data-gsap-item
                className="p-5 flex flex-col justify-between gap-3 hover:bg-[#FFFFFF] transition-colors duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#09090B]">
                      {milestone.date}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                        milestone.status === 'In Force' || milestone.status === 'Active'
                          ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                          : milestone.status === 'Deadline'
                            ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                            : 'bg-[#FFFFFF] text-[#52525B] border-[#E4E4E7]'
                      }`}
                    >
                      {milestone.jurisdiction} · {milestone.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#09090B] tracking-[-0.015em]">
                    {milestone.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#52525B] leading-relaxed">
                    {milestone.detail}
                  </p>
                </div>
              </div>
            ))}
          </GsapStagger>
        </div>

        {/* Interactive Split Statutory Enforcement Explorer */}
        <GsapReveal y={22}>
          <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Explorer Top Bar */}
            <div className="px-5 sm:px-6 py-3.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#09090B]">
                <BookOpen className="w-4 h-4 text-[#059669]" />
                <span>Binding Statutory Requirement &amp; Customs Enforcement Brief</span>
              </div>
              <span className="font-mono text-xs text-[#52525B]">
                Select a regulation to inspect port checks &amp; required dossier output
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left Index Rail (5 cols) */}
              <div className="lg:col-span-5 bg-[#FAFAFA] border-b lg:border-b-0 lg:border-r border-[#E4E4E7] divide-y divide-[#E4E4E7]">
                {facts.map((fact, idx) => {
                  const isActive = idx === selectedIdx;
                  const meta = ENFORCEMENT_DETAILS[fact.id];
                  return (
                    <button
                      key={fact.id}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      aria-pressed={isActive}
                      className={`relative w-full text-left px-5 py-4 transition-colors duration-150 flex items-start justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#FFFFFF]'
                          : 'bg-[#FAFAFA] hover:bg-[#FFFFFF]/70'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="why-now-statute-indicator"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute left-0 inset-y-0 w-[3px] bg-[#059669]"
                        />
                      )}

                      <div className="min-w-0 space-y-1.5 pl-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono tabular-nums font-semibold text-[#047857]">
                            0{idx + 1}
                          </span>
                          <span className="text-[#D4D4D8]">·</span>
                          <span className="font-mono tabular-nums text-[#52525B]">
                            {fact.date}
                          </span>
                          {meta && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                                isActive
                                  ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                                  : 'bg-[#FFFFFF] text-[#52525B] border-[#E4E4E7]'
                              }`}
                            >
                              {meta.shortTag}
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-sm font-semibold tracking-[-0.015em] leading-snug ${
                            isActive ? 'text-[#09090B]' : 'text-[#52525B]'
                          }`}
                        >
                          {fact.title}
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 mt-1 transition-transform duration-150 ${
                          isActive
                            ? 'text-[#059669] translate-x-0.5'
                            : 'text-[#A1A1AA]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Inspection Canvas (7 cols) */}
              <div className="lg:col-span-7 bg-[#FFFFFF] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFact.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-mono font-medium text-[#047857] bg-[#ECFDF5] border border-emerald-200 px-2.5 py-1 rounded-md">
                          <span>Effective {activeFact.date}</span>
                        </span>
                        <span className="text-[#52525B] font-medium">{activeFact.source}</span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-[#09090B] tracking-[-0.025em] leading-snug">
                          {activeFact.title}
                        </h3>
                        <p className="mt-3 text-sm text-[#52525B] leading-relaxed">
                          {activeFact.description}
                        </p>
                      </div>

                      {/* Two-Tile Operational Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-[#FFFBEB]/70 border border-[#FDE68A] space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>What EU / UK Customs Checks</span>
                          </div>
                          <p className="text-xs text-[#52525B] leading-relaxed">
                            {activeDetail.customsCheck}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#ECFDF5]/70 border border-emerald-200 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>HeatLedger Compliance Output</span>
                          </div>
                          <p className="text-xs text-[#52525B] leading-relaxed">
                            {activeDetail.heatLedgerArtifact}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statutory Reference Footer */}
                    <div className="pt-4 border-t border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-2 min-w-0">
                        <Scale className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <span className="font-mono text-[#2563EB] truncate">
                          {activeFact.statutoryReference}
                        </span>
                      </div>
                      <span className="font-mono text-[#52525B] shrink-0 bg-[#FAFAFA] border border-[#E4E4E7] px-2.5 py-1 rounded-md">
                        {activeDetail.impactMetric}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </GsapReveal>

        {/* Quiet Source Footnote */}
        <GsapReveal delay={0.08}>
          <p className="mt-6 text-xs text-[#52525B] leading-relaxed max-w-3xl">
            Source verification note: Regulatory references reflect published Official Journal of the
            European Union texts and UK HM Treasury notices. Exporters and authorised CBAM declarants
            must verify final customs filings against official European Commission and HMRC guidance.
          </p>
        </GsapReveal>
      </div>
    </section>
  );
};
