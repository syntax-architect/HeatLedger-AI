import React, { useState } from 'react';
import { SIMULATOR_PRESETS } from '../../data/mockData';
import { SimulatorPreset, BoundingBox } from '../../types';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Scan, 
  ExternalLink, 
  FileText, 
  Building, 
  Flame, 
  TrendingDown, 
  RotateCw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MtcSimulatorProps {
  onOpenWorkbench: (presetId?: string) => void;
}

export const MtcSimulator: React.FC<MtcSimulatorProps> = ({ onOpenWorkbench }) => {
  const [selectedPreset, setSelectedPreset] = useState<SimulatorPreset>(SIMULATOR_PRESETS[0]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeBox, setActiveBox] = useState<BoundingBox | null>(null);

  const handlePresetSelect = (preset: SimulatorPreset) => {
    setIsScanning(true);
    setSelectedPreset(preset);
    setActiveBox(null);
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

  return (
    <section id="simulator" className="py-12 lg:py-16 bg-obsidian-900 border-t border-slate-tempered relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-3">
            <Scan className="w-3.5 h-3.5" />
            <span>Interactive "30-Second MTC-to-Customs" Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            See How Indian Exporters Eliminate Default CBAM Taxes &amp; Verification Delays
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Select one of 3 realistic Indian export shipments below to experience automated Vision OCR, deterministic ASTM/EN chemistry check, and instant Melt-and-Pour compliance.
          </p>
        </div>

        {/* 3 Preset Switcher Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {SIMULATOR_PRESETS.map((preset) => {
            const isSelected = selectedPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden ${
                  isSelected
                    ? 'bg-gunmetal-DEFAULT border-emerald-500 shadow-glow-emerald/30'
                    : 'bg-gunmetal-DEFAULT/60 border-slate-tempered hover:border-slate-600 hover:bg-gunmetal-DEFAULT'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-emerald-500" />
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                    {preset.code}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {preset.tonnage} MT
                  </span>
                </div>
                <div className="font-semibold text-sm text-white truncate mb-1">
                  {preset.title.split('(')[0]}
                </div>
                <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{preset.route}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Upstream Heat:</span>
                  <span className="text-emerald-400 font-bold">#{preset.heatNumber}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Split-Screen Interactive Simulator Card */}
        <div className="rounded-2xl bg-gunmetal-DEFAULT border border-slate-tempered shadow-2xl overflow-hidden">
          
          {/* Card Top Action Bar */}
          <div className="px-6 py-4 border-b border-slate-tempered bg-obsidian-900/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 mr-2">Loaded Precursor MTC:</span>
                <span className="text-sm font-bold text-white font-mono">{selectedPreset.certNumber}</span>
                <span className="text-xs text-slate-400 ml-2">({selectedPreset.mill})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-300 border border-slate-600 transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Run Instant AI Inspection</span>
              </button>

              <button
                onClick={() => onOpenWorkbench(selectedPreset.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 text-xs font-bold transition-all"
              >
                <span>Open in QA App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 50/50 Split-Screen Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-tempered">
            
            {/* LEFT PANE: Upstream Steel Mill 3.1 MTC Realistic Document Canvas */}
            <div className="p-6 bg-slate-950/70 relative flex flex-col justify-between">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cobalt-blueprint" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                    Upstream Mill 3.1 Certificate Canvas
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                  EN 10204:2004 Type 3.1
                </span>
              </div>

              {/* Simulated Mill Paper Document */}
              <div className="relative rounded-lg bg-[#FAF8F5] text-slate-900 p-5 shadow-lg border border-slate-300/80 font-sans text-xs min-h-[460px] overflow-hidden select-none">
                
                {/* Laser Scan Line Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-500/10 z-20 pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-scan-line" />
                  </div>
                )}

                {/* Mill Header */}
                <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
                      {selectedPreset.mill}
                    </h3>
                    <p className="text-[10px] text-slate-600">
                      Quality Assurance &amp; Metallurgical Testing Department · ISO 9001 / ISO 17025
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <div className="font-bold text-slate-800">INSPECTION CERTIFICATE 3.1</div>
                    <div className="text-slate-500">Ref: {selectedPreset.certNumber}</div>
                    <div className="text-slate-500">Date: {selectedPreset.issueDate}</div>
                  </div>
                </div>

                {/* Heat & Melt Section */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-slate-100 p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">Product &amp; Heat No:</span>
                    <span className="font-mono font-bold text-slate-900">HEAT #{selectedPreset.heatNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">Country of Melt &amp; Pour:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      🇮🇳 {selectedPreset.meltCountry} (Original Origin)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">Melting Route:</span>
                    <span className="text-slate-800">{selectedPreset.meltRoute}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">Standard Grade:</span>
                    <span className="font-bold text-slate-800">{selectedPreset.productType.split('/')[0]}</span>
                  </div>
                </div>

                {/* Chemical Ladle Table in Document */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-700 mb-1 flex justify-between">
                    <span>Chemical Composition (Ladle Analysis - %)</span>
                    <span className="text-[9px] text-slate-500">Optical Emission Spectrometry</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="bg-slate-200 border border-slate-300">
                          {selectedPreset.chemistry.slice(0, 8).map(el => (
                            <th key={el.symbol} className="p-1 border border-slate-300 font-bold">{el.symbol}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          {selectedPreset.chemistry.slice(0, 8).map(el => (
                            <td key={el.symbol} className="p-1 border border-slate-300 font-semibold text-slate-800">
                              {el.measured.toFixed(el.symbol === 'P' || el.symbol === 'S' ? 3 : 2)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mechanical Test Table */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-700 mb-1">
                    Mechanical Properties (Test Report - Ambient Temp)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {selectedPreset.mechanics.map(m => (
                      <div key={m.property} className="bg-white p-1.5 rounded border border-slate-300 flex justify-between">
                        <span className="text-slate-600">{m.property}:</span>
                        <span className="font-bold text-slate-900">{m.measured}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stamp & Authorised QA Signature */}
                <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px]">
                  <div className="text-slate-500">
                    <div>Issued in compliance with EN 10204 3.1</div>
                    <div>Material verified free from radioactive contamination</div>
                  </div>
                  <div className="text-center border-2 border-dashed border-emerald-600/70 p-2 rounded bg-emerald-50/50">
                    <div className="font-bold text-emerald-800 uppercase text-[9px]">QA Metallurgist Verified</div>
                    <div className="text-[8px] text-emerald-700 font-mono">SAIL / TATA / JSW NABL LAB</div>
                    <div className="text-[7px] text-slate-500">DIGITALLY STAMPED</div>
                  </div>
                </div>

                {/* Bounding Box Overlays */}
                {selectedPreset.boundingBoxes.map((box) => {
                  const borderClasses = {
                    amber: 'border-amber-500 bg-amber-500/15 text-amber-900',
                    cobalt: 'border-cobalt-blueprint bg-blue-500/15 text-blue-900',
                    emerald: 'border-emerald-500 bg-emerald-500/15 text-emerald-900'
                  }[box.type];

                  const tagClasses = {
                    amber: 'bg-amber-500 text-obsidian-900',
                    cobalt: 'bg-cobalt-blueprint text-white',
                    emerald: 'bg-emerald-500 text-obsidian-900'
                  }[box.type];

                  const isHovered = activeBox?.id === box.id;

                  return (
                    <div
                      key={box.id}
                      onMouseEnter={() => setActiveBox(box)}
                      onMouseLeave={() => setActiveBox(null)}
                      style={{
                        position: 'absolute',
                        left: `${box.coords.x}%`,
                        top: `${box.coords.y}%`,
                        width: `${box.coords.width}%`,
                        height: `${box.coords.height}%`,
                      }}
                      className={`border-2 rounded transition-all cursor-pointer z-10 ${borderClasses} ${
                        isHovered ? 'ring-2 ring-white ring-offset-1 shadow-lg scale-[1.01]' : 'opacity-90'
                      }`}
                    >
                      <span className={`absolute -top-3.5 left-1 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase shadow-sm ${tagClasses}`}>
                        {box.label}
                      </span>
                    </div>
                  );
                })}

              </div>

              {/* Bounding Box Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between text-xs font-mono gap-2 text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span>Heat # &amp; Melt Country</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-cobalt-blueprint" />
                    <span>Spectro Chemistry</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span>Tensile / QA Stamp</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Interactive OCR Coordinates</span>
              </div>

            </div>

            {/* RIGHT PANE: Live Verification Result */}
            <div className="p-6 bg-gunmetal-DEFAULT flex flex-col justify-between space-y-6">
              
              {/* Top Verification Status Badges */}
              <div className="space-y-4">
                
                {/* a) ASTM / EN Chemical & Tensile Tolerance Check */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        ASTM / EN Metallurgy Validation
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-emerald-badge text-emerald-darkText border border-emerald-400/40">
                      100% WITHIN SPEC
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">C (Carbon)</span>
                      <span className="text-emerald-400 font-bold">{selectedPreset.chemistry[0].measured}%</span>
                      <span className="text-slate-500 text-[10px] block">Max {selectedPreset.chemistry[0].max}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Mn (Manganese)</span>
                      <span className="text-emerald-400 font-bold">{selectedPreset.chemistry[1].measured}%</span>
                      <span className="text-slate-500 text-[10px] block">{selectedPreset.chemistry[1].min}-{selectedPreset.chemistry[1].max}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">CEV (Carbon Eq)</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedPreset.chemistry.find(c => c.symbol === 'CEV')?.measured.toFixed(3)}
                      </span>
                      <span className="text-slate-500 text-[10px] block">IIW Formula Pass</span>
                    </div>
                  </div>
                </div>

                {/* b) EU Reg 2026/1963 & UK CDS Melt-and-Pour Proof Status */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        EU Reg 2026/1963 &amp; UK CDS Proof
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-amber-badge text-amber-darkText border border-amber-500/40">
                      VERIFIED: MELTED &amp; POURED IN INDIA
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Direct primary steelmaking at <strong className="text-amber-300">{selectedPreset.mill}</strong>. 
                    Melt-and-Pour is explicitly confirmed on original 3.1 MTC. No Russian or third-party circumvented steel.
                  </p>
                </div>

                {/* c) EU CBAM Precursor + Plant Embedded Emissions */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Flame className="w-4 h-4 text-emerald-400" />
                      Embedded Emissions (SEE) vs EU Default
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      38% Carbon Advantage
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div>
                      <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                        <span>Your Actual Verified SEE:</span>
                        <span className="text-emerald-400 font-bold">{selectedPreset.actualEmissions} tCO₂e / t</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(selectedPreset.actualEmissions / selectedPreset.defaultEmissions) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                        <span>Punitive EU Default Value + Markup:</span>
                        <span className="text-crimson-oxide font-semibold">{selectedPreset.defaultEmissions} tCO₂e / t</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-crimson-oxide h-full rounded-full w-full opacity-80" />
                      </div>
                    </div>
                  </div>

                  {/* Big Live Euro Savings Counter */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-slate-400 block">
                        Net CBAM Savings for European Buyer:
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight flex items-center gap-1.5">
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                        €{selectedPreset.euroSavings.toLocaleString()} Saved
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Shipment Payload</span>
                      <span className="text-xs font-mono text-slate-200 font-bold">{selectedPreset.tonnage} Metric Tonnes</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Card Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400">
                  Ready to produce EU CBAM XML &amp; Clause 6 Merged Dossier.
                </div>
                <button
                  onClick={() => onOpenWorkbench(selectedPreset.id)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-glow-emerald"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Inspect in QA Workbench</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
