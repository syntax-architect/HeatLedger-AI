import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingDown, 
  Clock, 
  Sparkles, 
  Check, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Building
} from 'lucide-react';

interface RoiCalculatorProps {
  onSelectPlan: (planName: string) => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onSelectPlan }) => {
  const [tonnage, setTonnage] = useState<number>(200); // 20 to 1000
  const [containers, setContainers] = useState<number>(8); // 1 to 40
  const [euEtsPrice, setEuEtsPrice] = useState<number>(85); // €85/tonne carbon price

  // Calculations
  // Verified actual emissions average ~1.80 tCO2e/t
  // EU default baseline is ~2.80 tCO2e/t + 10% penalty markup in 2026 = 3.08 tCO2e/t
  // Delta = ~1.28 tCO2e/t avoided
  const calculations = useMemo(() => {
    const actualEmission = 1.78;
    const defaultWithMarkup = 3.15; // 2026 default schedule
    const emissionSavedPerTonne = defaultWithMarkup - actualEmission; // ~1.37 tCO2e/t
    const totalCarbonSavedTonnes = tonnage * emissionSavedPerTonne;
    const euroTaxSaved = totalCarbonSavedTonnes * euEtsPrice;
    
    // Time saved: Manual QA entry & Excel certificate reconciliation takes ~3.5 hours per container
    // Automated vision inspection takes 30 seconds
    const hoursSaved = Math.round(containers * 3.5);
    const inrValueSaved = Math.round(euroTaxSaved * 92); // ~92 INR/EUR

    return {
      euroTaxSaved: Math.round(euroTaxSaved),
      inrValueSaved,
      hoursSaved,
      totalCarbonSavedTonnes: Math.round(totalCarbonSavedTonnes),
    };
  }, [tonnage, containers, euEtsPrice]);

  return (
    <section id="roi-calculator" className="py-16 bg-obsidian-900 border-t border-slate-tempered relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Financial Model</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Calculate Your European Buyer's CBAM Tax Savings
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            European steel importers face a 10% to 30% punitive penalty if you submit unverified or default values.
            Adjust your monthly export volumes to see your commercial competitive advantage.
          </p>
        </div>

        {/* Sliders & Live Results Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* Sliders Input Column */}
          <div className="lg:col-span-6 bg-gunmetal-DEFAULT rounded-2xl border border-slate-tempered p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Factory Monthly Export Parameters</span>
            </h3>

            {/* Tonnage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-mono">
                <label className="text-slate-300 font-medium">Monthly Export Tonnage to EU/UK:</label>
                <span className="text-emerald-400 font-extrabold text-base bg-slate-900 px-3 py-1 rounded border border-slate-700">
                  {tonnage.toLocaleString()} MT
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                step="10"
                value={tonnage}
                onChange={(e) => setTonnage(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>20 MT (1 container)</span>
                <span>500 MT</span>
                <span>1,000 MT (Large Mill)</span>
              </div>
            </div>

            {/* Containers Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-mono">
                <label className="text-slate-300 font-medium">Monthly Export Containers (20ft/40ft):</label>
                <span className="text-amber-400 font-extrabold text-base bg-slate-900 px-3 py-1 rounded border border-slate-700">
                  {containers} Containers
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={containers}
                onChange={(e) => setContainers(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>1 Box</span>
                <span>20 Boxes</span>
                <span>40 Boxes</span>
              </div>
            </div>

            {/* ETS Carbon Benchmark */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>EU ETS Carbon Benchmark Price:</span>
              <span className="text-slate-200 font-bold bg-slate-900 px-2 py-1 rounded">
                €{euEtsPrice} / tCO₂e
              </span>
            </div>
          </div>

          {/* Live Financial Outputs Column */}
          <div className="lg:col-span-6 bg-gradient-to-br from-gunmetal-DEFAULT via-slate-900 to-emerald-950/40 rounded-2xl border border-emerald-500/40 p-6 sm:p-8 flex flex-col justify-between shadow-glow-emerald/20">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                Net Monthly Commercial Value
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
                Your Competitive Export Defense
              </h3>

              <div className="space-y-4">
                {/* Euro Savings */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30">
                  <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Direct EU CBAM Tax Saved for Your Importers:
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                      €{calculations.euroTaxSaved.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      / month (~₹{(calculations.inrValueSaved / 100000).toFixed(2)} Lakhs)
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-300">
                    Makes your steel goods €{((calculations.euroTaxSaved) / tonnage).toFixed(0)}/MT cheaper landed than competitors relying on default markups.
                  </p>
                </div>

                {/* QA Engineering Hours Saved */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      QA Engineering Time:
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xl font-bold font-mono text-white">
                        {calculations.hoursSaved} hrs
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Saved every month</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Carbon Defended:
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <span className="text-xl font-bold font-mono text-white">
                        {calculations.totalCarbonSavedTonnes} t
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">tCO₂e avoided penalty</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Full ROI realized on the very first shipment.</span>
              <span className="text-emerald-400 font-bold">100% Audit Guaranteed</span>
            </div>
          </div>

        </div>

        {/* Pricing Tiers Section */}
        <div id="pricing" className="pt-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              Transparent Exporter Pricing
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Engineered for Indian Engineering Exporters
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Zero complicated enterprise lock-ins. Start with a single fast-audit container pilot or deploy across your plant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: 1-Shipment Fast Audit Pilot */}
            <div className="p-6 rounded-2xl bg-gunmetal-DEFAULT border border-slate-tempered flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <span className="text-xs font-mono uppercase text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                  Pilot Test
                </span>
                <h4 className="text-xl font-extrabold text-white mt-3">
                  1-Shipment Fast Audit Pilot
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Perfect to unblock an urgent container held by German or Dutch buyers.
                </p>

                <div className="mt-5 mb-6">
                  <span className="text-3xl font-black font-mono text-white">₹25,000</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">one-time</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Full MTC + Melt-and-Pour Dossier in 24 hrs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>EU CBAM XML Communication file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>ASTM/EN metallurgy tolerance audit report</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>1-on-1 declarant review call</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectPlan('1-Shipment Fast Audit Pilot')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
              >
                Book Pilot Audit
              </button>
            </div>

            {/* Card 2: Single Factory Plant OS (Most Popular) */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-gunmetal-DEFAULT to-slate-900 border-2 border-emerald-500 flex flex-col justify-between shadow-glow-emerald/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-obsidian-900 font-mono font-black text-[10px] uppercase tracking-wider shadow">
                Most Popular for Manufacturers
              </div>

              <div>
                <span className="text-xs font-mono uppercase text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                  Factory Operating System
                </span>
                <h4 className="text-xl font-extrabold text-white mt-3">
                  Single Factory Plant OS
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Full shop-floor automation for active pipes, flanges, or fastener plants.
                </p>

                <div className="mt-5 mb-6">
                  <span className="text-3xl font-black font-mono text-emerald-400">₹15,000</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">/ month</span>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Billed ₹1.8 Lakh annually
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Unlimited EN 10204 3.1 MTC Vision checks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Clause 6 compliant dossiers &amp; packaging lists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Official EU/UK CBAM XML &amp; Excel generator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Mass Balance ledger preventing phantom heat reuse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Factory QA Manager digital signature workflow</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectPlan('Single Factory Plant OS')}
                className="mt-8 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-extrabold text-xs uppercase tracking-wider transition-all shadow-glow-emerald"
              >
                Deploy Plant OS
              </button>
            </div>

            {/* Card 3: Multi-Plant & Merchant Exporter Enterprise */}
            <div className="p-6 rounded-2xl bg-gunmetal-DEFAULT border border-slate-tempered flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <span className="text-xs font-mono uppercase text-cobalt-blueprint font-bold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30">
                  Enterprise
                </span>
                <h4 className="text-xl font-extrabold text-white mt-3">
                  Multi-Plant &amp; Merchant Exporter
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  For trading houses and conglomerate steel processors with multiple sites.
                </p>

                <div className="mt-5 mb-6">
                  <span className="text-3xl font-black font-mono text-white">₹35,000</span>
                  <span className="text-xs text-slate-400 font-mono ml-2">/ month</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Multi-supplier upstream heat portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Multi-plant allocation across Howrah &amp; Liluah</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>TÜV / SGS / Bureau Veritas auditor readiness pack</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Dedicated metallurgical compliance engineer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>ERP &amp; SAP mass-balance API integration</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectPlan('Multi-Plant Enterprise')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
              >
                Contact Enterprise Team
              </button>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
