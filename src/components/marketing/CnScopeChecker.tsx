import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CN_CODES_DATA } from '../../data/marketingSamples';
import { CnCodeItem } from '../../types';
import { Search, CheckCircle2, Calendar, Clock, FileCheck, HelpCircle } from 'lucide-react';
import { GsapReveal } from '../effects/GsapMotion';

export const CnScopeChecker: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeCode, setActiveCode] = useState<CnCodeItem>(CN_CODES_DATA[0]);

  const categories = [
    'All',
    'Pipes & Tubes',
    'Flanges & Fittings',
    'Fasteners',
    'Bars & Rods',
    'Foundry Castings',
  ];

  const filteredCodes = useMemo(() => {
    return CN_CODES_DATA.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === 'All' ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const getStatusChip = (status: CnCodeItem['euCbamStatus']) => {
    if (status === 'EXEMPT_UNTIL_2028') {
      return {
        label: 'Exempt Until 2028',
        cls: 'bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]',
      };
    }
    if (status === 'MANDATORY_NOW') {
      return {
        label: 'Mandatory Now',
        cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
      };
    }
    return {
      label: '2027',
      cls: 'bg-[#ECFDF5] text-[#047857] border-emerald-200',
    };
  };

  const activeBadge = getStatusChip(activeCode.euCbamStatus);

  return (
    <section
      id="cn-checker"
      className="py-20 lg:py-28 bg-[#FAFAFA] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-12">
          <div className="text-xs font-semibold text-[#2563EB] mb-3">
            Harmonised System · EU Combined Nomenclature Lookup
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            CN code scope and statutory deadlines
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            Check whether EU and UK customs require an EN 10204 3.1 Mill Test Certificate,
            Melt-and-Pour declaration, and CBAM precursor emissions trace for your product code.
          </p>
        </GsapReveal>

        {/* Master-Detail Regulatory Lookup Container */}
        <GsapReveal y={26}>
          <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Top Toolbar: Search + Animated Category Tabs */}
            <div className="p-4 sm:px-5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative w-full lg:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CN code (e.g. 7306, 7307, 7318)..."
                  aria-label="Search CN code"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/70 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'text-[#FFFFFF]'
                          : 'bg-[#FFFFFF] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="cn-category-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[#09090B]"
                        />
                      )}
                      <span className="relative z-10">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Master-Detail Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]">
              {/* Left Ledger List — data-lenis-prevent allows comfortable inner scrolling */}
              <div
                data-lenis-prevent
                className="lg:col-span-5 max-h-[520px] overflow-y-auto divide-y divide-[#E4E4E7]"
              >
                {filteredCodes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#52525B]">
                    No CN codes match &ldquo;{searchQuery}&rdquo;. Try clearing your search filter.
                  </div>
                ) : (
                  filteredCodes.map((item) => {
                    const isSelected = activeCode.code === item.code;
                    const chip = getStatusChip(item.euCbamStatus);

                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setActiveCode(item)}
                        className={`w-full text-left px-5 py-3.5 transition-colors duration-150 cursor-pointer ${
                          isSelected ? 'bg-[#F4F4F5]' : 'bg-[#FFFFFF] hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono tabular-nums text-sm font-semibold text-[#09090B]">
                              CN {item.code}
                            </span>
                            <span className="text-xs text-[#52525B] truncate">
                              · {item.category}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${chip.cls}`}
                          >
                            {chip.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#52525B] mt-1 line-clamp-1">{item.title}</p>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Compliance Dossier Sheet with Smooth Crossfade */}
              <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between bg-[#FFFFFF]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCode.code}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-[#E4E4E7]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono tabular-nums text-2xl font-semibold text-[#09090B] tracking-[-0.02em]">
                              CN {activeCode.code}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-md border ${activeBadge.cls}`}
                            >
                              {activeBadge.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-[#09090B] mt-2">
                            {activeCode.title}
                          </h3>
                          <div className="text-xs text-[#52525B] mt-0.5">{activeCode.category}</div>
                        </div>

                        <div className="text-left sm:text-right text-xs">
                          <div className="text-[#52525B]">Required evidence</div>
                          <div className="font-medium text-[#09090B] mt-0.5">
                            EN 10204 Clause 6 Traceability
                          </div>
                        </div>
                      </div>

                      {/* EU vs UK Deadlines */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                        <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#52525B] mb-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
                            <span>EU Reg 2026/1963 Melt &amp; Pour</span>
                          </div>
                          <div className="text-sm font-semibold text-[#09090B]">
                            {activeCode.euMeltPourDeadline}
                          </div>
                          <p className="text-xs text-[#52525B] leading-relaxed mt-1.5">
                            EU ports require a 3.1 Mill Test Certificate stating primary Country of
                            Melt and Pour prior to customs clearance.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#52525B] mb-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>UK Customs CDS &amp; UK CBAM</span>
                          </div>
                          <div className="text-sm font-semibold text-[#09090B]">
                            {activeCode.ukMeltPourDeadline}
                          </div>
                          <p className="text-xs text-[#52525B] leading-relaxed mt-1.5">
                            {activeCode.ukCbamStatus}. Precursor heat allocations require authorised
                            QA sign-off.
                          </p>
                        </div>
                      </div>

                      {/* Customs Clearance Advisory */}
                      <div className="mt-5 p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#047857] mb-1.5">
                          <FileCheck className="w-4 h-4" />
                          <span>Customs Clearance &amp; Audit Advisory</span>
                        </div>
                        <p className="text-sm text-[#09090B] leading-relaxed">{activeCode.notes}</p>

                        {activeCode.code === '7325' && (
                          <div className="mt-3.5 p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#92400E]">
                            <HelpCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold block mb-0.5">
                                Why CN 7325 is exempt until 2028
                              </strong>
                              Under EU CBAM Regulation Annex I, non-malleable cast iron (municipal
                              manholes, drainage grates, counterweights) is excluded from the
                              initial phase due to casting process segregation. Buyers may still
                              request voluntary precursor origin declarations where alloyed steel
                              scrap is used.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Requirements Footer & Source Footnote */}
                    <div className="mt-6 pt-4 border-t border-[#E4E4E7] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-4 text-[#09090B]">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                            <span>
                              3.1 MTC proof: {activeCode.mtcProofRequired ? 'Mandatory' : 'Optional'}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                            <span>
                              Heat precursor:{' '}
                              {activeCode.precursorTraceability ? 'Required' : 'Not in scope'}
                            </span>
                          </span>
                        </div>
                        <span className="text-[#52525B]">Verified Jan 2026 (EU Annex I)</span>
                      </div>

                      <p className="text-xs text-[#52525B] leading-relaxed">
                        Source: Combined Nomenclature Regulation (EEC) No 2658/87 and CBAM
                        Regulation (EU) 2023/956 Annex I. Confirm tariff classifications with your
                        customs broker before declaration filing.
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
};
