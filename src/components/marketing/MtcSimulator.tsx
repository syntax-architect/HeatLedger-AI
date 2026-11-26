import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SIMULATOR_PRESETS } from '../../data/marketingSamples';
import { SimulatorPreset } from '../../types';
import {
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  RotateCw,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { LaserScanBeam } from '../effects/LaserScanBeam';
import { AnimatedNumber } from '../effects/AnimatedNumber';
import { GsapReveal } from '../effects/GsapMotion';

interface MtcSimulatorProps {
  onOpenWorkbench: (presetId?: string) => void;
}

type HighlightRegion = 'origin' | 'chemistry' | 'mechanics' | null;

export const MtcSimulator: React.FC<MtcSimulatorProps> = ({ onOpenWorkbench }) => {
  const [selectedPreset, setSelectedPreset] = useState<SimulatorPreset>(SIMULATOR_PRESETS[0]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<HighlightRegion>(null);

  const handlePresetSelect = (preset: SimulatorPreset) => {
    setIsScanning(true);
    setSelectedPreset(preset);
    setActiveRegion(null);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  const handleTriggerScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 700);
  };

  const carbon = selectedPreset.chemistry[0];
  const manganese = selectedPreset.chemistry[1];
  const cev = selectedPreset.chemistry.find((c) => c.symbol === 'CEV');
  const carbonPct = carbon?.max ? Math.min(100, (carbon.measured / carbon.max) * 100) : 65;
  const mnPct = manganese?.max ? Math.min(100, (manganese.measured / manganese.max) * 100) : 78;
  const cevPct = cev?.max ? Math.min(100, (cev.measured / cev.max) * 100) : 82;

  return (
    <section
      id="simulator"
      className="py-20 lg:py-28 bg-[#0A0C10] text-[#F4F4F5] border-b border-white/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-12">
          <div className="text-xs font-semibold text-emerald-400 mb-3">
            Interactive 30-Second Simulator · Sample Mill Certificates
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            Inspect live MTC extraction and CBAM cost difference
          </h2>
          <p className="mt-4 text-base text-[#A1A1AA] leading-relaxed">
            Switch between Indian primary mill presets to inspect anchored vector extraction,
            ASTM/EN chemical tolerance validation, and container-level CBAM comparisons.
          </p>
        </GsapReveal>

        {/* Browser / Application Product Window */}
        <GsapReveal y={26}>
          <div className="rounded-xl bg-[#111318] border border-white/[0.08] shadow-[0_16px_44px_rgba(0,0,0,0.48)] overflow-hidden">
            {/* Window Chrome + Preset Tabs */}
            <div className="px-4 sm:px-5 py-3 bg-[#0D0F14] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                </div>

                {/* Preset Tabs with Sliding Pill */}
                <div
                  role="tablist"
                  aria-label="Sample mill presets"
                  className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-[#0A0C10] border border-white/[0.06]"
                >
                  {SIMULATOR_PRESETS.map((preset) => {
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => handlePresetSelect(preset)}
                        className={`relative px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                          isSelected ? 'text-white' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="simulator-preset-pill"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="absolute inset-0 rounded-md bg-[#181B22] border border-white/[0.14]"
                          />
                        )}
                        <span className="relative z-10 inline-flex items-center">
                          <span className="font-mono tabular-nums text-amber-400 mr-1.5">
                            {preset.code}
                          </span>
                          <span>{preset.mill.split(' ')[0]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B22] hover:bg-white/[0.08] text-xs font-medium text-[#F4F4F5] border border-white/[0.1] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Re-run check</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenWorkbench(selectedPreset.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Open in QA App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Certificate Metadata Strip */}
            <div className="px-5 py-2.5 bg-[#111318] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-[#A1A1AA]">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span>Precursor MTC</span>
                <span className="font-mono tabular-nums font-semibold text-[#F4F4F5]">
                  {selectedPreset.certNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedPreset.mill}</span>
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-amber-400">Heat #{selectedPreset.heatNumber}</span>
                <span>{selectedPreset.tonnage} MT</span>
              </div>
            </div>

            {/* 50/50 Split Pane */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
              {/* Left Pane: Sharp Industrial 3.1 Mill Test Certificate Sheet */}
              <div className="p-5 sm:p-6 bg-[#0D0F14] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-medium text-[#F4F4F5]">
                    Upstream Mill 3.1 Certificate Sheet
                  </span>
                  <span className="font-mono text-[#A1A1AA]">EN 10204:2004 Type 3.1</span>
                </div>

                {/* Realistic White Mill Document Canvas */}
                <div className="relative rounded-lg bg-[#FFFFFF] text-[#09090B] p-4 sm:p-5 border border-[#E4E4E7] text-xs overflow-hidden">
                  <LaserScanBeam isScanning={isScanning} />

                  {/* Mill Sheet Header */}
                  <div className="border-b border-[#09090B] pb-3 mb-3.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-[-0.015em] text-[#09090B]">
                        {selectedPreset.mill}
                      </div>
                      <div className="text-xs text-[#52525B] mt-0.5">
                        Quality Assurance &amp; Works Metallurgical Laboratory
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="font-semibold text-[#09090B]">MTC 3.1</div>
                      <div className="text-[#52525B]">{selectedPreset.certNumber}</div>
                      <div className="text-[#52525B]">{selectedPreset.issueDate}</div>
                    </div>
                  </div>

                  {/* Anchored Highlight Region 1: Heat & Melt-and-Pour Origin */}
                  <div
                    onMouseEnter={() => setActiveRegion('origin')}
                    onMouseLeave={() => setActiveRegion(null)}
                    className={`rounded-lg p-3 mb-3.5 border transition-all duration-150 cursor-default ${
                      activeRegion === 'origin'
                        ? 'bg-[#FFFBEB] border-[#D97706] shadow-xs'
                        : 'bg-[#FAFAFA] border-[#FDE68A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#B45309]">
                        Extracted: Heat &amp; Melt-and-Pour Origin
                      </span>
                      <span className="font-mono tabular-nums text-xs text-[#B45309]">99.4%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-[#52525B] block">Heat Number</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                          #{selectedPreset.heatNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#52525B] block">Country of Melt &amp; Pour</span>
                        <span className="font-semibold text-[#047857]">
                          {selectedPreset.meltCountry} (ISO IN)
                        </span>
                      </div>
                      <div>
                        <span className="text-[#52525B] block">Melting Route</span>
                        <span className="font-medium text-[#09090B]">
                          {selectedPreset.meltRoute}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#52525B] block">Specification</span>
                        <span className="font-medium text-[#09090B]">
                          {selectedPreset.productType.split('/')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Anchored Highlight Region 2: Ladle Chemistry Table */}
                  <div
                    onMouseEnter={() => setActiveRegion('chemistry')}
                    onMouseLeave={() => setActiveRegion(null)}
                    className={`rounded-lg p-3 mb-3.5 border transition-all duration-150 cursor-default ${
                      activeRegion === 'chemistry'
                        ? 'bg-[#EFF6FF] border-[#2563EB] shadow-xs'
                        : 'bg-[#FFFFFF] border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        Extracted: Ladle Chemical Composition (%)
                      </span>
                      <span className="text-xs text-[#52525B]">OES Analysis</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse font-mono tabular-nums text-xs">
                        <thead>
                          <tr className="bg-[#F4F4F5] text-[#09090B]">
                            {selectedPreset.chemistry.slice(0, 8).map((el) => (
                              <th
                                key={el.symbol}
                                className="py-1.5 px-1 border border-[#E4E4E7] font-semibold"
                              >
                                {el.symbol}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-[#FFFFFF]">
                            {selectedPreset.chemistry.slice(0, 8).map((el) => (
                              <td
                                key={el.symbol}
                                className="py-1.5 px-1 border border-[#E4E4E7] font-medium text-[#09090B]"
                              >
                                {el.measured.toFixed(
                                  el.symbol === 'P' || el.symbol === 'S' ? 3 : 2
                                )}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Anchored Highlight Region 3: Mechanical Tests & Mill QA Sign-off */}
                  <div
                    onMouseEnter={() => setActiveRegion('mechanics')}
                    onMouseLeave={() => setActiveRegion(null)}
                    className={`rounded-lg p-3 border transition-all duration-150 cursor-default ${
                      activeRegion === 'mechanics'
                        ? 'bg-[#ECFDF5] border-[#059669] shadow-xs'
                        : 'bg-[#FAFAFA] border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#047857]">
                        Extracted: Mechanical Properties &amp; QA Verification
                      </span>
                      <span className="font-mono tabular-nums text-xs text-[#047857]">23°C</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                      {selectedPreset.mechanics.map((m) => (
                        <div
                          key={m.property}
                          className="bg-[#FFFFFF] px-2.5 py-1.5 rounded border border-[#E4E4E7] flex items-center justify-between gap-2"
                        >
                          <span className="font-sans text-[#52525B] truncate">{m.property}</span>
                          <span className="font-semibold text-[#09090B] shrink-0">
                            {m.measured}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[#E4E4E7] flex items-center justify-between text-xs text-[#52525B]">
                      <span>Issued under EN 10204 Type 3.1</span>
                      <span className="font-medium text-[#047857]">Works Inspector Stamped</span>
                    </div>
                  </div>
                </div>

                {/* Clean Region Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#A1A1AA]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-amber-400">Amber: Origin &amp; Heat</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-blue-400">Blue: Ladle OES</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">Emerald: Tensile &amp; QA</span>
                  </div>
                  <span>Hover document sections to cross-check</span>
                </div>
              </div>

              {/* Right Pane: Tolerance Bars & Cost Difference Ledger */}
              <div className="p-5 sm:p-6 bg-[#111318] flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  {/* Metallurgy Tolerance Bars */}
                  <div
                    className={`p-4 rounded-xl bg-[#0A0C10] border transition-colors duration-200 ${
                      activeRegion === 'chemistry' || activeRegion === 'mechanics'
                        ? 'border-blue-500/60'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-semibold text-[#F4F4F5] inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>ASTM / EN Metallurgy Tolerances</span>
                      </span>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                        Within spec
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#A1A1AA]">Carbon (C)</span>
                          <span className="font-mono tabular-nums text-[#F4F4F5]">
                            <strong className="font-semibold text-emerald-400">
                              {carbon?.measured}%
                            </strong>{' '}
                            <span className="text-[#A1A1AA]">/ max {carbon?.max}%</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            animate={{ width: `${carbonPct}%` }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#A1A1AA]">Manganese (Mn)</span>
                          <span className="font-mono tabular-nums text-[#F4F4F5]">
                            <strong className="font-semibold text-emerald-400">
                              {manganese?.measured}%
                            </strong>{' '}
                            <span className="text-[#A1A1AA]">
                              / {manganese?.min}–{manganese?.max}%
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            animate={{ width: `${mnPct}%` }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#A1A1AA]">IIW Carbon Equivalent (CEV)</span>
                          <span className="font-mono tabular-nums text-[#F4F4F5]">
                            <strong className="font-semibold text-emerald-400">
                              {cev?.measured.toFixed(3)}
                            </strong>{' '}
                            <span className="text-[#A1A1AA]">/ max {cev?.max ?? 0.48}</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            animate={{ width: `${cevPct}%` }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Melt-and-Pour Origin Confirmation */}
                  <div
                    className={`p-4 rounded-xl bg-[#0A0C10] border transition-colors duration-200 ${
                      activeRegion === 'origin' ? 'border-amber-500/60' : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-xs font-semibold text-[#F4F4F5] inline-flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>EU Reg 2026/1963 &amp; UK CDS Origin</span>
                      </span>
                      <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md whitespace-nowrap">
                        Melted &amp; poured in India
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Primary crude steelmaking documented at{' '}
                      <span className="text-[#F4F4F5] font-medium">{selectedPreset.mill}</span>.
                      Tamper-evident SHA-256 original preservation established for Clause 6 customs
                      review.
                    </p>
                  </div>

                  {/* Understated CBAM Emissions & Euro Difference Summary */}
                  <div className="p-4 rounded-xl bg-[#0A0C10] border border-white/[0.08] space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F4F4F5]">
                        Embedded Emissions vs. EU Default
                      </span>
                      <span className="text-xs text-[#A1A1AA]">Estimate for planning</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#F4F4F5]">Actual verified SEE</span>
                          <span className="font-mono tabular-nums font-semibold text-emerald-400">
                            {selectedPreset.actualEmissions} tCO₂e/t
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            animate={{
                              width: `${(selectedPreset.actualEmissions / selectedPreset.defaultEmissions) * 100}%`,
                            }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#A1A1AA]">EU default + statutory markup</span>
                          <span className="font-mono tabular-nums font-medium text-red-400">
                            {selectedPreset.defaultEmissions} tCO₂e/t
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-red-500/80 rounded-full w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.08] flex items-end justify-between gap-4">
                      <div>
                        <div className="text-xs text-[#A1A1AA]">
                          Estimated cost difference vs. default values
                        </div>
                        <div className="text-2xl font-semibold font-mono tabular-nums text-white mt-0.5">
                          €<AnimatedNumber value={selectedPreset.euroSavings} duration={0.6} />
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums text-xs">
                        <span className="text-[#A1A1AA] block">Container payload</span>
                        <span className="text-[#F4F4F5] font-semibold">
                          {selectedPreset.tonnage} MT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Ready to prepare Clause 6 PDF &amp; draft CBAM XML</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenWorkbench(selectedPreset.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                  >
                    <span>Inspect in QA Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
};
