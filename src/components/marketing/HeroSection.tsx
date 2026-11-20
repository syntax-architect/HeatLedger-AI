import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, FileText, Lock, BarChart3, ShieldCheck } from 'lucide-react';
import { MobileHeroMockup } from './MobileHeroMockup';
import { ForgeSparks } from '../effects/ForgeSparks';
import { MagneticWrap } from '../effects/GsapMotion';
import { SpotlightCard } from '../effects/SpotlightCard';
import { AnimatedNumber } from '../effects/AnimatedNumber';

gsap.registerPlugin(ScrollTrigger);

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
    country: 'India [IN] · BOF/CC',
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
    dossierHash: '878a3b7525344442f7da79…',
    signatureRef: 'ed25519_sig_v1_17af54387e55…',
  },
  {
    id: 'sail',
    shortLabel: 'SAIL Bokaro',
    millName: 'SAIL Bokaro Steel Plant',
    certNumber: 'MTC-IN-SAIL-4028',
    heatNumber: 'SAIL-BO-8812',
    standard: 'IS 2062 E250 / ASTM A36',
    cev: 0.384,
    country: 'India [IN] · BF-BOF',
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
    dossierHash: '4f9c1b993e110294da11…',
    signatureRef: 'ed25519_sig_v1_8e4b7029cb01…',
  },
  {
    id: 'jsw',
    shortLabel: 'JSW Steel',
    millName: 'JSW Steel Vijayanagar',
    certNumber: 'MTC-IN-JSW-9104',
    heatNumber: 'JSW-VY-4409',
    standard: 'ASTM A105 Piping Flanges',
    cev: 0.412,
    country: 'India [IN] · Corex/BOF',
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
    dossierHash: 'dec6e348b6a92338721b…',
    signatureRef: 'ed25519_sig_v1_c491e08aa321…',
  },
];

const HERO_TABS = [
  { id: 'ocr' as const, label: 'MTC Chemistry', icon: FileText },
  { id: 'emissions' as const, label: 'CBAM Cost Delta', icon: BarChart3 },
  { id: 'dossier' as const, label: 'Clause 6 Bundle', icon: Lock },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchApp, onExplorePresets }) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'emissions' | 'dossier'>('ocr');
  const [selectedHeatId, setSelectedHeatId] = useState<string>('tata');
  const sectionRef = useRef<HTMLElement>(null);
  const workbenchRef = useRef<HTMLDivElement>(null);

  const currentHeat = SAMPLE_HEATS.find((h) => h.id === selectedHeatId) || SAMPLE_HEATS[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Master above-the-fold staggered editorial entrance
      gsap.fromTo(
        '[data-hero-enter]',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.72,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );

      gsap.fromTo(
        '[data-hero-frame]',
        { opacity: 0, y: 26, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          delay: 0.18,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );

      gsap.fromTo(
        '[data-hero-spec]',
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          delay: 0.34,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );

      // Subtle scroll parallax on desktop preview window synced with Lenis
      if (workbenchRef.current && !window.matchMedia('(pointer: coarse)').matches) {
        gsap.to(workbenchRef.current, {
          y: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0A0C10] text-[#F4F4F5] border-b border-white/[0.08] overflow-hidden"
    >
      {/* Subtle static architectural dot & hairline grid */}
      <ForgeSparks />

      {/* Subtle architectural top vignette sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/[0.045] to-transparent z-0"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24 relative z-10">
        {/* Main Editorial Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 xl:gap-12 items-center">
          {/* Left Column: Editorial Statement & Actions */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Restrained Regulatory Framework Tag (No Pulsing Dot) */}
            <div
              data-hero-enter
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#111318] border border-white/[0.1] text-xs font-medium text-[#A1A1AA] mb-6"
            >
              <span className="text-emerald-400 font-semibold">EU Reg 2026/1963</span>
              <span aria-hidden="true">·</span>
              <span>CBAM Definitive Regime</span>
            </div>

            <h1
              data-hero-enter
              className="text-3xl sm:text-5xl lg:text-[3.1rem] xl:text-[3.5rem] font-semibold text-white tracking-[-0.035em] leading-[1.06] [text-wrap:balance]"
            >
              From raw mill certificate to EU &amp; UK customs clearance{' '}
              <span className="text-[#A1A1AA]">in 30 seconds.</span>
            </h1>

            <p
              data-hero-enter
              className="mt-5 text-base sm:text-lg text-[#A1A1AA] font-normal leading-relaxed max-w-xl"
            >
              Reduce exposure to statutory CBAM default markups. HeatLedger extracts EN 10204 3.1
              chemistry, locks Melt-and-Pour origin evidence, and prepares tamper-evident SHA-256
              dossiers for your authorised inspector and CBAM verifier.
            </p>

            <div
              data-hero-enter
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto"
            >
              <MagneticWrap className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onLaunchApp}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm px-5 py-3 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0C10] cursor-pointer group shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.14)]"
                >
                  <span>Open QA Workbench</span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </MagneticWrap>

              <button
                type="button"
                onClick={onExplorePresets}
                className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-[#181B22] text-[#F4F4F5] font-medium text-sm px-5 py-3 rounded-lg border border-white/[0.14] hover:border-white/[0.24] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Inspect sample shipment</span>
              </button>
            </div>

            <p data-hero-enter className="mt-6 text-xs text-[#A1A1AA] leading-relaxed">
              Structured for primary mill certificates from Tata Steel, SAIL, JSW, and JSPL.
            </p>
          </div>

          {/* Mobile Compact Product Frame (< lg) */}
          <div className="block lg:hidden w-full">
            <MobileHeroMockup />
          </div>

          {/* Right Column: Interactive Verification Product Frame (>= lg) */}
          <div ref={workbenchRef} data-hero-frame className="hidden lg:block lg:col-span-6">
            <SpotlightCard
              spotlightColor="emerald"
              className="rounded-xl bg-[#111318] border-white/[0.1] overflow-hidden shadow-[0_18px_48px_rgba(0,0,0,0.52)]"
            >
              {/* Top Window Header */}
              <div className="px-4 py-3 bg-[#0D0F14] border-b border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  </div>
                  <span className="text-xs font-medium text-[#A1A1AA] truncate">
                    Inspection Verification Workbench
                  </span>
                </div>

                {/* Preset Mill Selector with Framer Motion Pill */}
                <div className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg bg-[#0A0C10] border border-white/[0.06]">
                  {SAMPLE_HEATS.map((heat) => {
                    const isSelected = selectedHeatId === heat.id;
                    return (
                      <button
                        key={heat.id}
                        type="button"
                        onClick={() => setSelectedHeatId(heat.id)}
                        className={`relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                          isSelected ? 'text-[#F4F4F5]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="hero-heat-pill"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-md bg-[#181B22] border border-white/[0.12]"
                          />
                        )}
                        <span className="relative z-10">{heat.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Tabs with Animated Underline */}
              <div className="px-4 bg-[#111318] border-b border-white/[0.08] flex items-center gap-5">
                {HERO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative inline-flex items-center gap-1.5 py-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        isActive ? 'text-[#F4F4F5]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : ''}`} />
                      <span>{tab.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="hero-workbench-tab"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute bottom-0 inset-x-0 h-[2px] bg-emerald-500 rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Stage Surface with Smooth Crossfade */}
              <div className="p-5 min-h-[328px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {activeTab === 'ocr' && (
                    <motion.div
                      key={`ocr-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#0A0C10] border border-white/[0.07]">
                        <div>
                          <div className="text-xs text-[#A1A1AA]">Primary Mill &amp; Grade</div>
                          <div className="text-sm font-semibold text-[#F4F4F5] mt-0.5">
                            {currentHeat.millName}
                          </div>
                          <div className="text-xs text-[#A1A1AA] mt-0.5">{currentHeat.standard}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#A1A1AA]">Heat Number</div>
                          <div className="text-sm font-mono tabular-nums font-semibold text-amber-400 mt-0.5">
                            #{currentHeat.heatNumber}
                          </div>
                          <div className="text-xs text-emerald-400 mt-0.5">{currentHeat.country}</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 text-xs">
                          <span className="text-[#A1A1AA]">Spectrometric Ladle Analysis</span>
                          <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> 8 of 8 elements within spec
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(currentHeat.chemistry).map(([elem, data]) => (
                            <div
                              key={elem}
                              className="p-2.5 rounded-lg bg-[#0A0C10] border border-white/[0.06] hover:border-emerald-500/30 transition-colors"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#F4F4F5]">{elem}</span>
                                <span className="text-emerald-400 font-medium">Pass</span>
                              </div>
                              <div className="text-sm font-mono tabular-nums font-semibold text-[#F4F4F5] mt-1">
                                {data.val}%
                              </div>
                              <div className="text-xs font-mono tabular-nums text-[#A1A1AA] truncate">
                                {data.spec}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-between text-xs">
                        <span className="text-[#F4F4F5]">
                          IIW Carbon Equivalent (CEV):{' '}
                          <span className="font-mono tabular-nums font-semibold text-emerald-400">
                            {currentHeat.cev.toFixed(3)}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400 font-medium">
                          Pass (≤ 0.48)
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'emissions' && (
                    <motion.div
                      key={`emissions-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-lg bg-[#0A0C10] border border-white/[0.08]">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-[#A1A1AA]">
                            Estimated cost difference vs. default values
                          </span>
                          <span className="text-xs font-medium text-[#A1A1AA]">
                            Estimate for planning
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-semibold font-mono tabular-nums text-white tracking-[-0.02em]">
                            €<AnimatedNumber value={currentHeat.costDiffEur} duration={0.45} />
                          </span>
                          <span className="text-xs text-[#A1A1AA]">per 25 MT container</span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[#A1A1AA]">
                              EU default baseline with statutory markup
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-red-400">
                              {currentHeat.defaultSee.toFixed(2)} tCO₂e/t
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full bg-red-500/80 rounded-full origin-left w-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[#F4F4F5]">
                              Verified actual installation emissions
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-emerald-400">
                              {currentHeat.actualSee.toFixed(2)} tCO₂e/t
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(currentHeat.actualSee / currentHeat.defaultSee) * 100}%`,
                              }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0A0C10] border border-white/[0.06] flex items-center justify-between text-xs text-[#A1A1AA]">
                        <span className="font-mono tabular-nums">
                          Precursor 1.78 · Direct 0.07 · Grid 0.20 tCO₂e/t
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                          −{Math.round(((currentHeat.defaultSee - currentHeat.actualSee) / currentHeat.defaultSee) * 100)}% intensity
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'dossier' && (
                    <motion.div
                      key={`dossier-${currentHeat.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-3.5"
                    >
                      <div className="p-3.5 rounded-lg bg-[#0A0C10] border border-white/[0.07] space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-mono font-semibold text-[#F4F4F5]">
                              Dossier_EXP-2026-109_Clause6.pdf
                            </div>
                            <div className="text-xs text-[#A1A1AA] mt-0.5">
                              2 pages · Byte-identical original preservation
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium">
                            EN 10204 3.1
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-white/[0.06] text-xs">
                          <div className="p-2.5 rounded-md bg-[#111318] border border-white/[0.06]">
                            <span className="text-[#A1A1AA] block">Page 1</span>
                            <span className="text-[#F4F4F5] font-medium mt-0.5 block">
                              Signed Exporter Cover Sheet
                            </span>
                          </div>
                          <div className="p-2.5 rounded-md bg-[#111318] border border-white/[0.06]">
                            <span className="text-[#A1A1AA] block">Page 2 · Annex A</span>
                            <span className="text-emerald-400 font-medium mt-0.5 block">
                              Unaltered Upstream Mill MTC
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0A0C10] border border-white/[0.07] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#F4F4F5] font-medium">
                            Digitally Signed (Ed25519)
                          </span>
                          <span className="font-mono text-[#A1A1AA]">QA_HEAD</span>
                        </div>
                        <div className="font-mono tabular-nums text-emerald-400 bg-[#111318] px-2.5 py-1.5 rounded border border-white/[0.06] truncate">
                          {currentHeat.signatureRef}
                        </div>
                        <div className="flex items-center justify-between text-[#A1A1AA] pt-1">
                          <span>Tamper-evident SHA-256</span>
                          <span className="font-mono tabular-nums text-[#F4F4F5]">
                            {currentHeat.dossierHash}
                          </span>
                        </div>
                      </div>

                      <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                        <span className="font-mono text-blue-300">
                          CBAM_Communication_EXP-2026-109.xml
                        </span>
                        <span className="text-blue-300 font-medium">Draft XML ready</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Workbench Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[#A1A1AA]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tamper-evident SHA-256 ledger</span>
                  </span>
                  <button
                    type="button"
                    onClick={onLaunchApp}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer group"
                  >
                    <span>Open in QA Workbench</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>

        {/* 4-Column Hairline-Divided Specification Strip */}
        <div className="mt-16 pt-10 border-t border-white/[0.08]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
            <div data-hero-spec className="py-4 sm:py-0 sm:pr-6">
              <div className="font-mono tabular-nums text-xs text-emerald-400 font-medium">
                EN 10204 Clause 6
              </div>
              <div className="text-sm font-semibold text-[#F4F4F5] mt-1">
                Byte-identical original preservation
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1.5">
                Upstream mill PDF is hashed with tamper-evident SHA-256 and attached unaltered as
                Annex A.
              </p>
            </div>

            <div data-hero-spec className="py-4 sm:py-0 sm:px-6">
              <div className="font-mono tabular-nums text-xs text-amber-400 font-medium">
                EU Reg 2026/1963
              </div>
              <div className="text-sm font-semibold text-[#F4F4F5] mt-1">
                Melt-and-Pour origin proof
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1.5">
                Extracts ISO 3166 primary melt country and mill facility identifiers before dispatch
                release.
              </p>
            </div>

            <div data-hero-spec className="py-4 sm:py-0 sm:px-6">
              <div className="font-mono tabular-nums text-xs text-blue-400 font-medium">
                Mass-Balance Ledger
              </div>
              <div className="text-sm font-semibold text-[#F4F4F5] mt-1">
                Zero phantom heat allocations
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1.5">
                Atomic heat tonnage tracking rejects over-allocations across split export lots with
                exact deficit alerts.
              </p>
            </div>

            <div data-hero-spec className="py-4 sm:py-0 sm:pl-6">
              <div className="font-mono tabular-nums text-xs text-emerald-400 font-medium">
                EU Reg 2025/2621
              </div>
              <div className="text-sm font-semibold text-[#F4F4F5] mt-1">
                CBAM actual emissions defense
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1.5">
                Defends against progressive default markups with auditable precursor and plant
                emissions traces.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
