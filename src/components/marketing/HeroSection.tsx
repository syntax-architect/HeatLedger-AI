import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, FileText, Lock, BarChart3, ShieldCheck } from 'lucide-react';
import { MobileHeroMockup } from './MobileHeroMockup';
import { AnimatedNumber } from '../effects/AnimatedNumber';

interface HeroSectionProps {
  onLaunchApp: () => void;
  onExplorePresets: () => void;
}

interface HeatSample {
  id: string;
  shortLabel: string;
  millName: string;
  certNumber: string;
  heatNumber: string;
  standard: string;
  cev: number;
  country: string;
  chemistry: { [elem: string]: { val: number; spec: string } };
  actualSee: number;
  defaultSee: number;
  costDiffEur: number;
  dossierHash: string;
  signatureRef: string;
}

const SAMPLE_HEATS: HeatSample[] = [
  {
    id: 'tata',
    shortLabel: 'Tata Steel',
    millName: 'Tata Steel Jamshedpur',
    certNumber: 'MTC-IN-TSJ-26-9021',
    heatNumber: 'TSJ-26-9021',
    standard: 'ASTM A106 Gr. B / A105',
    cev: 0.408,
    country: 'India (IN) · BOF/CC',
    chemistry: {
      C: { val: 0.22, spec: '≤ 0.35%' },
      Mn: { val: 0.88, spec: '0.60–1.05%' },
      Si: { val: 0.25, spec: '0.10–0.35%' },
      P: { val: 0.015, spec: '≤ 0.035%' },
      S: { val: 0.01, spec: '≤ 0.040%' },
      Cr: { val: 0.12, spec: '≤ 0.30%' },
      Ni: { val: 0.08, spec: '≤ 0.40%' },
      Mo: { val: 0.02, spec: '≤ 0.12%' },
    },
    actualSee: 2.05,
    defaultSee: 3.28,
    costDiffEur: 4500,
    dossierHash: '878a3b7525344442f7da79',
    signatureRef: 'ed25519_sig_v1_17af54387e55',
  },
  {
    id: 'sail',
    shortLabel: 'SAIL Bokaro',
    millName: 'SAIL Bokaro Steel Plant',
    certNumber: 'MTC-IN-SAIL-4028',
    heatNumber: 'SAIL-BO-8812',
    standard: 'IS 2062 E250 / ASTM A36',
    cev: 0.384,
    country: 'India (IN) · BF-BOF',
    chemistry: {
      C: { val: 0.18, spec: '≤ 0.22%' },
      Mn: { val: 0.95, spec: '0.80–1.20%' },
      Si: { val: 0.22, spec: '0.10–0.35%' },
      P: { val: 0.018, spec: '≤ 0.030%' },
      S: { val: 0.012, spec: '≤ 0.030%' },
      Cr: { val: 0.08, spec: '≤ 0.25%' },
      Ni: { val: 0.05, spec: '≤ 0.20%' },
      Mo: { val: 0.01, spec: '≤ 0.08%' },
    },
    actualSee: 2.12,
    defaultSee: 3.28,
    costDiffEur: 4320,
    dossierHash: '4f9c1b993e110294da11',
    signatureRef: 'ed25519_sig_v1_8e4b7029cb01',
  },
  {
    id: 'jsw',
    shortLabel: 'JSW Steel',
    millName: 'JSW Steel Vijayanagar',
    certNumber: 'MTC-IN-JSW-9104',
    heatNumber: 'JSW-VY-4409',
    standard: 'ASTM A105 Piping Flanges',
    cev: 0.412,
    country: 'India (IN) · Corex/BOF',
    chemistry: {
      C: { val: 0.24, spec: '≤ 0.35%' },
      Mn: { val: 0.82, spec: '0.60–1.05%' },
      Si: { val: 0.28, spec: '0.10–0.35%' },
      P: { val: 0.014, spec: '≤ 0.035%' },
      S: { val: 0.009, spec: '≤ 0.040%' },
      Cr: { val: 0.14, spec: '≤ 0.30%' },
      Ni: { val: 0.09, spec: '≤ 0.40%' },
      Mo: { val: 0.03, spec: '≤ 0.12%' },
    },
    actualSee: 1.98,
    defaultSee: 3.28,
    costDiffEur: 4850,
    dossierHash: 'dec6e348b6a92338721b',
    signatureRef: 'ed25519_sig_v1_c491e08aa321',
  },
];

const HERO_TABS = [
  { id: 'ocr' as const, label: 'MTC chemistry', icon: FileText },
  { id: 'emissions' as const, label: 'CBAM cost delta', icon: BarChart3 },
  { id: 'dossier' as const, label: 'Clause 6 bundle', icon: Lock },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchApp, onExplorePresets }) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'emissions' | 'dossier'>('ocr');
  const [selectedHeatId, setSelectedHeatId] = useState<string>('tata');

  const currentHeat = SAMPLE_HEATS.find((h) => h.id === selectedHeatId) || SAMPLE_HEATS[0];

  return (
    <section className="relative bg-[#121316] text-[#EAEAEA] border-b border-[#EAEAEA]/[0.08] overflow-hidden">
      {/* Studio steel billet backdrop masked seamlessly into #121316 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden lg:block overflow-hidden"
      >
        <img
          src="/assets/hero-steel-graphite.jpg"
          alt="Rolled carbon steel billets on brushed steel plates"
          width={1408}
          height={768}
          fetchPriority="high"
          className="w-full h-full object-cover object-right opacity-55"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #121316 0%, #121316 44%, rgba(18,19,22,0.72) 68%, rgba(18,19,22,0.45) 100%), linear-gradient(180deg, rgba(18,19,22,0.5) 0%, transparent 25%, #121316 96%)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-24 relative z-10">
        {/* Asymmetric Scene Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Calm Dark Negative Space for Editorial Statement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#9FA3AD] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
              <span>EU Reg 2026/1963</span>
              <span aria-hidden="true">/</span>
              <span>CBAM definitive period</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-medium text-[#EAEAEA] tracking-[-0.03em] leading-[1.06] [text-wrap:balance]">
              Turn raw mill certificates into EU customs dossiers{' '}
              <span className="text-[#9FA3AD]">before dispatch</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#9FA3AD] font-normal leading-relaxed max-w-xl">
              Extract EN 10204 3.1 ladle chemistry, lock Melt-and-Pour origin evidence, and prepare
              tamper-evident SHA-256 packages for your authorised inspector and CBAM verifier.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onLaunchApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#EAEAEA] hover:bg-white text-[#121316] font-medium text-sm h-11 px-5 rounded-lg transition-colors duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121316] cursor-pointer"
              >
                <span>Open QA Workbench</span>
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </button>

              <button
                type="button"
                onClick={onExplorePresets}
                className="inline-flex items-center justify-center gap-2 bg-[#181A1F] hover:bg-[#22252B] text-[#EAEAEA] font-medium text-sm h-11 px-5 rounded-lg border border-[#EAEAEA]/[0.12] transition-colors duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Inspect sample pack</span>
              </button>
            </div>

            <p className="mt-6 text-xs text-[#6F7480]">
              Structured for primary mill certificates from Tata Steel, SAIL, JSW, and JSPL
            </p>
          </motion.div>

          {/* Mobile Compact Product Frame (< lg) */}
          <div className="block lg:hidden w-full">
            <MobileHeroMockup />
          </div>

          {/* Right Column: Tactile Verification Ledger Frame (>= lg) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block lg:col-span-6"
          >
            <div className="rounded-2xl bg-[#181A1F]/95 backdrop-blur-sm border border-[#EAEAEA]/10 overflow-hidden">
              {/* Ledger Header Bar (Signature Heat Lot Index + Mill Selector, no macOS traffic lights) */}
              <div className="px-4 py-3 bg-[#121316] border-b border-[#EAEAEA]/[0.08] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono tabular-nums text-xs text-[#10B981] px-2 py-0.5 rounded bg-[#22252B] border border-[#EAEAEA]/[0.08] shrink-0">
                    #{currentHeat.heatNumber}
                  </span>
                  <span className="text-xs font-medium text-[#9FA3AD] truncate">
                    {currentHeat.certNumber}
                  </span>
                </div>

                {/* Preset Mill Selector */}
                <div className="flex items-center gap-1 shrink-0 p-1 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
                  {SAMPLE_HEATS.map((heat) => {
                    const isSelected = selectedHeatId === heat.id;
                    return (
                      <button
                        key={heat.id}
                        type="button"
                        onClick={() => setSelectedHeatId(heat.id)}
                        className={`relative px-2.5 py-1 rounded text-xs transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'text-[#EAEAEA] font-medium'
                            : 'text-[#6F7480] hover:text-[#EAEAEA]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="hero-heat-pill"
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 rounded bg-[#22252B] border border-[#EAEAEA]/10"
                          />
                        )}
                        <span className="relative z-10">{heat.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-4 bg-[#181A1F] border-b border-[#EAEAEA]/[0.08] flex items-center gap-6">
                {HERO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative inline-flex items-center gap-2 py-3 text-xs transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'text-[#EAEAEA] font-medium'
                          : 'text-[#6F7480] hover:text-[#9FA3AD]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${isActive ? 'text-[#10B981]' : 'text-current'}`}
                        strokeWidth={1.5}
                      />
                      <span>{tab.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="hero-workbench-tab"
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute bottom-0 inset-x-0 h-[2px] bg-[#10B981]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Workbench Surface */}
              <div className="p-5 min-h-[320px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {activeTab === 'ocr' && (
                    <motion.div
                      key={`ocr-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08]">
                        <div>
                          <div className="text-xs text-[#6F7480]">Primary mill and grade</div>
                          <div className="text-sm font-medium text-[#EAEAEA] mt-0.5">
                            {currentHeat.millName}
                          </div>
                          <div className="text-xs text-[#9FA3AD] mt-0.5">{currentHeat.standard}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#6F7480]">Melt and pour origin</div>
                          <div className="text-sm font-mono tabular-nums font-medium text-[#EAEAEA] mt-0.5">
                            {currentHeat.country}
                          </div>
                          <div className="text-xs text-[#10B981] mt-0.5">Origin declared</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 text-xs">
                          <span className="text-[#9FA3AD]">Spectrometric ladle analysis</span>
                          <span className="text-[#10B981] font-medium inline-flex items-center gap-1.5">
                            <Check className="w-4 h-4" strokeWidth={1.5} />
                            <span>8 of 8 elements within limit</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(currentHeat.chemistry).map(([elem, data]) => (
                            <div
                              key={elem}
                              className="p-2.5 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08]"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-[#EAEAEA]">{elem}</span>
                                <span className="text-[#10B981]">Pass</span>
                              </div>
                              <div className="text-sm font-mono tabular-nums font-medium text-[#EAEAEA] mt-1">
                                {data.val.toFixed(2)}%
                              </div>
                              <div className="text-xs font-mono tabular-nums text-[#6F7480] truncate">
                                {data.spec}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-between text-xs">
                        <span className="text-[#9FA3AD]">
                          IIW Carbon Equivalent (CEV):{' '}
                          <span className="font-mono tabular-nums font-medium text-[#EAEAEA]">
                            {currentHeat.cev.toFixed(3)}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-[#10B981]">Pass (≤ 0.48)</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'emissions' && (
                    <motion.div
                      key={`emissions-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08]">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-[#9FA3AD]">
                            Estimated cost difference vs. default values
                          </span>
                          <span className="text-xs text-[#6F7480]">Estimate for planning</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-medium font-mono tabular-nums text-[#EAEAEA] tracking-[-0.02em]">
                            €<AnimatedNumber value={currentHeat.costDiffEur} duration={0.4} />
                          </span>
                          <span className="text-xs text-[#9FA3AD]">per 25 MT container</span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[#9FA3AD]">
                              EU default baseline with statutory markup
                            </span>
                            <span className="font-mono tabular-nums font-medium text-[#E5484D]">
                              {currentHeat.defaultSee.toFixed(2)} tCO₂e/t
                            </span>
                          </div>
                          <div className="w-full h-2 rounded bg-[#22252B] overflow-hidden">
                            <div className="h-full bg-[#E5484D]/80 rounded w-full" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[#EAEAEA]">
                              Plant actual installation emissions
                            </span>
                            <span className="font-mono tabular-nums font-medium text-[#10B981]">
                              {currentHeat.actualSee.toFixed(2)} tCO₂e/t
                            </span>
                          </div>
                          <div className="w-full h-2 rounded bg-[#22252B] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(currentHeat.actualSee / currentHeat.defaultSee) * 100}%`,
                              }}
                              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full bg-[#10B981] rounded"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-between text-xs text-[#9FA3AD]">
                        <span className="font-mono tabular-nums">
                          Precursor 1.78 · Direct 0.07 · Grid 0.20 tCO₂e/t
                        </span>
                        <span className="font-mono tabular-nums text-[#10B981] font-medium">
                          −
                          {Math.round(
                            ((currentHeat.defaultSee - currentHeat.actualSee) /
                              currentHeat.defaultSee) *
                              100
                          )}
                          % vs default
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'dossier' && (
                    <motion.div
                      key={`dossier-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-mono font-medium text-[#EAEAEA]">
                              Dossier_EXP-2026-109_Clause6.pdf
                            </div>
                            <div className="text-xs text-[#9FA3AD] mt-0.5">
                              2 pages · Byte-identical original preservation
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#22252B] border border-[#EAEAEA]/[0.08] text-[#10B981] text-xs font-mono">
                            EN 10204 3.1
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#EAEAEA]/[0.08] text-xs">
                          <div className="p-2.5 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
                            <span className="text-[#6F7480] block">Page 1</span>
                            <span className="text-[#EAEAEA] font-medium mt-0.5 block">
                              Signed exporter cover sheet
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
                            <span className="text-[#6F7480] block">Page 2 · Annex A</span>
                            <span className="text-[#10B981] font-medium mt-0.5 block">
                              Unaltered upstream mill MTC
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#EAEAEA] font-medium">
                            Digitally signed (Ed25519)
                          </span>
                          <span className="font-mono text-[#6F7480]">QA_HEAD</span>
                        </div>
                        <div className="font-mono tabular-nums text-[#10B981] bg-[#181A1F] px-2.5 py-1.5 rounded border border-[#EAEAEA]/[0.08] truncate">
                          {currentHeat.signatureRef}
                        </div>
                        <div className="flex items-center justify-between text-[#9FA3AD] pt-1">
                          <span>Tamper-evident SHA-256</span>
                          <span className="font-mono tabular-nums text-[#EAEAEA]">
                            {currentHeat.dossierHash}
                          </span>
                        </div>
                      </div>

                      <div className="px-3 py-2 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-between text-xs">
                        <span className="font-mono text-[#EAEAEA]">
                          CBAM_Communication_EXP-2026-109.xml
                        </span>
                        <span className="text-[#9FA3AD]">Draft XML ready</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Workbench Footer */}
                <div className="mt-4 pt-3 border-t border-[#EAEAEA]/[0.08] flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[#9FA3AD]">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                    <span>Tamper-evident SHA-256 ledger</span>
                  </span>
                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="inline-flex items-center gap-1 text-[#EAEAEA] hover:text-[#10B981] font-medium transition-colors cursor-pointer"
                  >
                    <span>Open in QA Workbench</span>
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 4-Column Hairline-Divided Specification Strip (Uniform neutral + one accent index) */}
        <div className="mt-16 pt-10 border-t border-[#EAEAEA]/[0.08]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EAEAEA]/[0.08]">
            <div className="py-4 sm:py-0 sm:pr-6">
              <div className="font-mono tabular-nums text-xs text-[#9FA3AD]">
                EN 10204 Clause 6
              </div>
              <div className="text-sm font-medium text-[#EAEAEA] mt-1">
                Byte-identical original preservation
              </div>
              <p className="text-xs text-[#6F7480] leading-relaxed mt-1.5">
                Upstream mill PDF is hashed with SHA-256 and attached unaltered as Annex A.
              </p>
            </div>

            <div className="py-4 sm:py-0 sm:px-6">
              <div className="font-mono tabular-nums text-xs text-[#9FA3AD]">
                EU Reg 2026/1963
              </div>
              <div className="text-sm font-medium text-[#EAEAEA] mt-1">
                Melt-and-Pour origin proof
              </div>
              <p className="text-xs text-[#6F7480] leading-relaxed mt-1.5">
                Extracts ISO 3166 primary melt country and mill facility identifiers before dispatch.
              </p>
            </div>

            <div className="py-4 sm:py-0 sm:px-6">
              <div className="font-mono tabular-nums text-xs text-[#9FA3AD]">
                Mass-balance ledger
              </div>
              <div className="text-sm font-medium text-[#EAEAEA] mt-1">
                Zero phantom heat allocations
              </div>
              <p className="text-xs text-[#6F7480] leading-relaxed mt-1.5">
                Atomic heat tonnage tracking blocks over-allocations across split export lots.
              </p>
            </div>

            <div className="py-4 sm:py-0 sm:pl-6">
              <div className="font-mono tabular-nums text-xs text-[#9FA3AD]">
                EU Reg 2025/2621
              </div>
              <div className="text-sm font-medium text-[#EAEAEA] mt-1">
                CBAM actual emissions prep
              </div>
              <p className="text-xs text-[#6F7480] leading-relaxed mt-1.5">
                Organizes precursor and plant emissions traces for EU-accredited verifier review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
