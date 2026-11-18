import React, { useState, useMemo } from 'react';
import { CN_CODES_DATA } from '../../data/mockData';
import { CnCodeItem } from '../../types';
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Filter, 
  HelpCircle,
  FileCheck,
  Calendar
} from 'lucide-react';

export const CnScopeChecker: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeCode, setActiveCode] = useState<CnCodeItem>(CN_CODES_DATA[0]);

  const categories = ['ALL', 'Pipes & Tubes', 'Flanges & Fittings', 'Fasteners', 'Bars & Rods', 'Foundry Castings'];

  const filteredCodes = useMemo(() => {
    return CN_CODES_DATA.filter(item => {
      const matchesSearch = 
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = selectedCategory === 'ALL' || item.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section id="cn-checker" className="py-16 bg-obsidian border-t border-slate-tempered relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-cobalt-blueprint/40 text-blue-400 text-xs font-mono mb-3">
            <Search className="w-3.5 h-3.5" />
            <span>Harmonised System &amp; EU Combined Nomenclature</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Interactive HS/CN Code Scope &amp; Legal Deadline Checker
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Check your exact 4-digit export tariff line to verify whether European customs will hold your container without an EN 10204 3.1 Mill Test Certificate or EU CBAM Precursor declaration.
          </p>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type CN code (e.g. 7306, 7307, 7318, 7325)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gunmetal-DEFAULT border border-slate-tempered text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 font-mono transition-colors"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-obsidian-900 font-bold'
                    : 'bg-gunmetal-DEFAULT text-slate-400 hover:text-white border border-slate-tempered'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Master Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: CN Codes List */}
          <div className="lg:col-span-5 space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredCodes.map((item) => {
              const isSelected = activeCode.code === item.code;
              const isExempt = item.euCbamStatus === 'EXEMPT_UNTIL_2028';
              const isMandatoryNow = item.euCbamStatus === 'MANDATORY_NOW';

              return (
                <div
                  key={item.code}
                  onClick={() => setActiveCode(item)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gunmetal-DEFAULT border-emerald-500 shadow-glow-emerald/20'
                      : 'bg-gunmetal-DEFAULT/50 border-slate-tempered hover:border-slate-600 hover:bg-gunmetal-DEFAULT'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-base font-extrabold text-white flex items-center gap-2">
                      <span>CN {item.code}</span>
                      <span className="text-[11px] font-sans font-normal text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                        {item.category}
                      </span>
                    </span>

                    {isExempt ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        EXEMPT 'TIL 2028
                      </span>
                    ) : isMandatoryNow ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-badge text-amber-darkText border border-amber-500/40">
                        MANDATORY NOW
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-badge text-emerald-darkText border border-emerald-500/40">
                        CBAM 2026 READY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">{item.title}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep Regulatory Analysis Card */}
          <div className="lg:col-span-7 bg-gunmetal-DEFAULT rounded-2xl border border-slate-tempered p-6 flex flex-col justify-between shadow-xl">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-tempered">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      CN {activeCode.code}
                    </span>
                    <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
                      {activeCode.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {activeCode.title}
                  </h3>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">Customs Proof Category</div>
                  <div className="text-xs font-bold text-amber-400">EN 10204 Clause 6 Traceability</div>
                </div>
              </div>

              {/* Status Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                
                {/* EU Reg 2026/1963 Melt & Pour */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>EU Reg 2026/1963 Melt &amp; Pour</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">
                    {activeCode.euMeltPourDeadline}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Customs requires verified 3.1 MTC with explicit "Country of Melt and Pour" prior to release from Rotterdam or Hamburg.
                  </p>
                </div>

                {/* UK CDS & CBAM Status */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 mb-2">
                    <Clock className="w-3.5 h-3.5 text-cobalt-blueprint" />
                    <span>UK Customs CDS &amp; UK CBAM</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">
                    {activeCode.ukMeltPourDeadline}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeCode.ukCbamStatus}. Precursor heat allocations must be digitally signed by factory QA inspector.
                  </p>
                </div>

              </div>

              {/* Deep Analysis & Legal Guidance */}
              <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400 font-mono mb-2">
                  <FileCheck className="w-4 h-4" />
                  <span>Customs Clearance &amp; Audit Advisory</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeCode.notes}
                </p>

                {activeCode.code === '7325' && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 block font-semibold mb-0.5">Why CN 7325 is Exempt Until 2028:</strong>
                      Under EU CBAM Regulation Annex I, non-malleable cast iron (such as municipal manholes, drainage grates, and counterweights) is excluded from the initial phase due to casting process segregation. However, if cast iron uses scrap with alloy additions, precursor declarations may still be requested voluntarily by German buyers.
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Status Summary Bar */}
            <div className="mt-6 pt-4 border-t border-slate-tempered flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  MTC Proof: {activeCode.mtcProofRequired ? 'Mandatory' : 'Optional'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Heat Precursor: {activeCode.precursorTraceability ? 'Required' : 'Not In Scope'}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                HeatLedger AI Code Engine Verified
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
