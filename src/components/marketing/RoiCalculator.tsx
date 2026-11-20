import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, TrendingDown } from 'lucide-react';
import { AnimatedNumber } from '../effects/AnimatedNumber';
import { GsapReveal } from '../effects/GsapMotion';

interface RoiCalculatorProps {
  onSelectPlan: (planName: string) => void;
}

const VOLUME_PRESETS = [
  { label: 'Foundry (80 MT)', tonnage: 80, containers: 4 },
  { label: 'Mid-Size Exporter (200 MT)', tonnage: 200, containers: 8 },
  { label: 'Multi-Plant Mill (650 MT)', tonnage: 650, containers: 26 },
];

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onSelectPlan }) => {
  const [tonnage, setTonnage] = useState<number>(200);
  const [containers, setContainers] = useState<number>(8);
  const [euEtsPrice, setEuEtsPrice] = useState<number>(75.36);

  const calculations = useMemo(() => {
    // Hot-rolled bar (CN 7214) default 2.65 tCO2e/t + 10% markup = 2.915 vs 1.78 actual
    const actualEmission = 1.78;
    const defaultWithMarkup = 2.915;
    const emissionDeltaPerTonne = Math.max(0, defaultWithMarkup - actualEmission);
    const totalCarbonDeltaTonnes = tonnage * emissionDeltaPerTonne;
    const euroCostDiff = totalCarbonDeltaTonnes * euEtsPrice;
    const defaultCostEur = Math.round(tonnage * defaultWithMarkup * euEtsPrice);
    const actualCostEur = Math.round(tonnage * actualEmission * euEtsPrice);
    const hoursSaved = Math.round(containers * 3.5);
    const inrValueDiff = Math.round(euroCostDiff * 90.5);

    return {
      euroCostDiff: Math.round(euroCostDiff),
      defaultCostEur,
      actualCostEur,
      actualRatioPct: defaultCostEur > 0 ? Math.round((actualCostEur / defaultCostEur) * 100) : 61,
      inrValueDiff,
      hoursSaved,
      totalCarbonDeltaTonnes: Math.round(totalCarbonDeltaTonnes),
      perTonneEur: tonnage > 0 ? Math.round(euroCostDiff / tonnage) : 0,
    };
  }, [tonnage, containers, euEtsPrice]);

  return (
    <section
      id="roi-calculator"
      className="py-20 lg:py-28 bg-[#FAFAFA] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-12">
          <div className="text-xs font-semibold text-[#047857] mb-3">
            Commercial Planning Model · EU Reg 2025/2621
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            Estimate your buyer&rsquo;s CBAM cost difference
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            Importers relying on EU default values incur progressive statutory markups under
            Implementing Regulation (EU) 2025/2621. Model the estimated cost difference versus
            default values below.
          </p>
        </GsapReveal>

        {/* Clean 2-Column Financial Workbench */}
        <GsapReveal y={26}>
          <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]">
              {/* Left Column: Quick Profiles + Minimalist Range Sliders */}
              <div className="lg:col-span-6 p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#09090B]">
                      Monthly export parameters
                    </h3>
                    <p className="text-xs text-[#52525B] mt-1">
                      Select a plant profile or adjust export volume and EU ETS assumptions.
                    </p>
                  </div>
                </div>

                {/* Quick Volume Presets for Instant Comfort */}
                <div className="flex flex-wrap gap-1.5">
                  {VOLUME_PRESETS.map((preset) => {
                    const isMatch =
                      tonnage === preset.tonnage && containers === preset.containers;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTonnage(preset.tonnage);
                          setContainers(preset.containers);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isMatch
                            ? 'bg-[#09090B] text-white border-[#09090B]'
                            : 'bg-[#FAFAFA] text-[#52525B] border-[#E4E4E7] hover:text-[#09090B] hover:bg-[#F4F4F5]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tonnage Slider */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label htmlFor="roi-tonnage" className="font-medium text-[#09090B]">
                      Monthly EU / UK export tonnage
                    </label>
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#09090B] bg-[#FAFAFA] px-2.5 py-1 rounded-md border border-[#E4E4E7]">
                      {tonnage.toLocaleString()} MT
                    </span>
                  </div>
                  <input
                    id="roi-tonnage"
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={tonnage}
                    onChange={(e) => setTonnage(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs font-mono tabular-nums text-[#52525B]">
                    <span>20 MT</span>
                    <span>500 MT</span>
                    <span>1,000 MT</span>
                  </div>
                </div>

                {/* Containers Slider */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label htmlFor="roi-containers" className="font-medium text-[#09090B]">
                      Monthly export containers (20ft / 40ft)
                    </label>
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#09090B] bg-[#FAFAFA] px-2.5 py-1 rounded-md border border-[#E4E4E7]">
                      {containers} FCL
                    </span>
                  </div>
                  <input
                    id="roi-containers"
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={containers}
                    onChange={(e) => setContainers(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs font-mono tabular-nums text-[#52525B]">
                    <span>1 FCL</span>
                    <span>20 FCL</span>
                    <span>40 FCL</span>
                  </div>
                </div>

                {/* EU ETS Benchmark Price Slider */}
                <div className="space-y-2.5 pt-2 border-t border-[#F4F4F5]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label htmlFor="roi-ets" className="font-medium text-[#09090B]">
                      EU ETS carbon price assumption
                    </label>
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#09090B] bg-[#FAFAFA] px-2.5 py-1 rounded-md border border-[#E4E4E7]">
                      €{euEtsPrice.toFixed(2)} / tCO₂e
                    </span>
                  </div>
                  <input
                    id="roi-ets"
                    type="range"
                    min={50}
                    max={110}
                    step={0.5}
                    value={euEtsPrice}
                    onChange={(e) => setEuEtsPrice(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs font-mono tabular-nums text-[#52525B]">
                    <span>€50</span>
                    <span>€75.36 ref.</span>
                    <span>€110</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Structured Financial Ledger Output + Live Bar Visualization */}
              <div className="lg:col-span-6 p-6 sm:p-8 bg-[#FAFAFA] flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#09090B]">
                      Monthly ledger estimate
                    </h3>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] whitespace-nowrap">
                      Estimate for planning
                    </span>
                  </div>

                  {/* Primary Difference Line */}
                  <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] space-y-4">
                    <div>
                      <div className="text-xs text-[#52525B]">
                        Estimated cost difference vs. default values
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-3xl sm:text-4xl font-semibold font-mono tabular-nums text-[#047857] tracking-[-0.02em]">
                          €<AnimatedNumber value={calculations.euroCostDiff} duration={0.45} />
                        </span>
                        <span className="text-xs font-mono tabular-nums text-[#52525B]">
                          / month (~₹
                          <AnimatedNumber
                            value={calculations.inrValueDiff / 100000}
                            decimals={2}
                            duration={0.45}
                          />{' '}
                          Lakh)
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-[#52525B]">
                        Equivalent to{' '}
                        <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                          €{calculations.perTonneEur}/MT
                        </span>{' '}
                        difference across {tonnage.toLocaleString()} MT monthly volume.
                      </div>
                    </div>

                    {/* Visual Cost Basis Bar Comparison */}
                    <div className="pt-3.5 border-t border-[#F4F4F5] space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#52525B]">EU default + statutory markup</span>
                          <span className="font-mono tabular-nums font-medium text-[#B91C1C]">
                            €{calculations.defaultCostEur.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#F4F4F5] overflow-hidden">
                          <div className="h-full bg-[#DC2626]/75 rounded-full w-full" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#09090B] font-medium">
                            Verified actual installation basis
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#047857]">
                            €{calculations.actualCostEur.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#F4F4F5] overflow-hidden">
                          <motion.div
                            animate={{ width: `${calculations.actualRatioPct}%` }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-[#059669] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Ledger Metrics */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7]">
                      <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
                        <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>QA preparation time</span>
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-[#09090B] mt-1.5">
                        <AnimatedNumber
                          value={calculations.hoursSaved}
                          duration={0.4}
                          suffix=" hrs"
                        />
                      </div>
                      <div className="text-xs text-[#52525B] mt-0.5">
                        Estimated monthly reduction
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7]">
                      <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
                        <TrendingDown className="w-3.5 h-3.5 text-[#047857]" />
                        <span>Emissions delta</span>
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-[#09090B] mt-1.5">
                        <AnimatedNumber
                          value={calculations.totalCarbonDeltaTonnes}
                          duration={0.4}
                          suffix=" t"
                        />
                      </div>
                      <div className="text-xs text-[#52525B] mt-0.5">
                        tCO₂e vs. default baseline
                      </div>
                    </div>
                  </div>

                  {/* Formula Disclosure */}
                  <div className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-xs space-y-1">
                    <div className="font-semibold text-[#09090B]">
                      Deterministic formula (illustrative planning model)
                    </div>
                    <code className="block font-mono tabular-nums text-[#52525B] leading-relaxed">
                      (2.915 default w/ markup − 1.780 actual SEE) × {tonnage} MT × €
                      {euEtsPrice.toFixed(2)}/tCO₂e
                    </code>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E4E4E7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xs text-[#52525B]">
                    Actual figures depend on accredited verifier findings.
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectPlan('Single-Plant OS')}
                    className="inline-flex items-center gap-1.5 bg-[#047857] hover:bg-[#065F46] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                  >
                    <span>Model your heats in QA App</span>
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
