import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ShieldCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  FileText,
  Scale,
  Sparkles,
} from 'lucide-react';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { MarketingFooter as Footer } from '../components/marketing/MarketingFooter';

interface GuideData {
  slug: string;
  title: string;
  subtitle: string;
  regulation: string;
  lastReviewed: string;
  readTime: string;
  summary: string;
}

const GUIDES: Record<string, GuideData> = {
  'eu-melt-and-pour-certificate': {
    slug: 'eu-melt-and-pour-certificate',
    title: 'EU Melt and Pour Certificate: What to Put on an MTC',
    subtitle: 'Official regulatory guidance for steel fabricators and exporters to Europe under EU Reg 2026/1963.',
    regulation: 'Regulation (EU) 2026/1384 & Implementing Regulation (EU) 2026/1963',
    lastReviewed: '21 November 2026',
    readTime: '4 min read',
    summary:
      'Starting 1 October 2026, all iron and steel products under CN 7208–7306 entering the EU require explicit country of melt and pour evidence on standard EN 10204 3.1 mill test certificates.',
  },
  'cbam-data-for-steel-exporters': {
    slug: 'cbam-data-for-steel-exporters',
    title: 'CBAM Data for Steel Exporters: What the Exporter Supplies',
    subtitle: 'Step-by-step compliance protocol for non-EU mills, re-rollers, and fastener producers.',
    regulation: 'Regulation (EU) 2023/956 & EU CBAM Communication Guidance',
    lastReviewed: '21 November 2026',
    readTime: '5 min read',
    summary:
      'The importer pays for CBAM certificates, but the exporter must supply verified installations data: direct emissions, electricity consumption, and precursor heat tags.',
  },
  'cn-scope-checker': {
    slug: 'cn-scope-checker',
    title: 'CN Scope Checker: Melt-and-Pour vs. CBAM Tariff Classification',
    subtitle: 'Border classification matrix separating melt-and-pour mandates from general CBAM emissions scope.',
    regulation: 'Regulation (EU) 2026/1384 Annex I & Regulation (EU) 2023/956 Annex I',
    lastReviewed: '21 November 2026',
    readTime: '3 min read',
    summary:
      'Fasteners (7318) and fittings (7307) are in CBAM scope but exempt from melt-and-pour origin. Seamless tubes and plate (7208–7306) require both.',
  },
};

const CN_SCOPE_DATABASE = [
  {
    cn: '7208',
    name: 'Flat-rolled steel, width >= 600 mm, hot-rolled',
    meltAndPour: true,
    cbam: true,
    statutoryRef: 'EU Reg 2026/1963 Annex I',
    notes: 'Mandatory primary crude steel evidence upon customs clearance.',
  },
  {
    cn: '7214',
    name: 'Bars and rods of iron or non-alloy steel',
    meltAndPour: true,
    cbam: true,
    statutoryRef: 'EU Reg 2026/1963 Annex I',
    notes: 'Requires ladle furnace heat number and country of crude melt.',
  },
  {
    cn: '7225',
    name: 'Flat-rolled alloy steel (including stainless)',
    meltAndPour: true,
    cbam: true,
    statutoryRef: 'EU Reg 2026/1963 Annex I',
    notes: 'Grade, heat number, and mill location must match invoice batch.',
  },
  {
    cn: '7304',
    name: 'Tubes, pipes and hollow profiles, seamless',
    meltAndPour: true,
    cbam: true,
    statutoryRef: 'EU Reg 2026/1963 Annex I',
    notes: 'Requires mother billet / ingot melt-and-pour traceability certificate.',
  },
  {
    cn: '7306',
    name: 'Other tubes, pipes and hollow profiles (welded)',
    meltAndPour: true,
    cbam: true,
    statutoryRef: 'EU Reg 2026/1963 Annex I',
    notes: 'Mother coil melt country mandatory in customs declaration.',
  },
  {
    cn: '7307',
    name: 'Tube or pipe fittings (flanges, elbows, couplings)',
    meltAndPour: false,
    cbam: true,
    statutoryRef: 'EU CBAM Reg 2023/956 Annex I (Excluded from Melt-and-Pour)',
    notes: 'Exempt from melt-and-pour proof until formal Commission review in 2028. CBAM SEE emissions still mandatory.',
  },
  {
    cn: '7318',
    name: 'Screws, bolts, nuts, coach screws, screw hooks, rivets',
    meltAndPour: false,
    cbam: true,
    statutoryRef: 'EU CBAM Reg 2023/956 Annex I (Excluded from Melt-and-Pour)',
    notes: 'Fasteners do not require melt-and-pour declaration. CBAM embedded emissions reporting required.',
  },
  {
    cn: '7326',
    name: 'Other articles of iron or steel (forgings, stampings)',
    meltAndPour: false,
    cbam: true,
    statutoryRef: 'EU CBAM Reg 2023/956 Annex I',
    notes: 'Complex goods reporting: requires specific emissions of precursor steel.',
  },
];

export const GuidePage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const activeSlug = slug && GUIDES[slug] ? slug : 'eu-melt-and-pour-certificate';
  const currentGuide = GUIDES[activeSlug];

  // Search filter for CN code tool
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCnCodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CN_SCOPE_DATABASE;
    return CN_SCOPE_DATABASE.filter(
      (item) => item.cn.includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col font-sans">
      <TopNavbar onToggleMode={(m) => navigate(m === 'dashboard' ? '/app' : '/')} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-6">
          <Link to="/" className="hover:text-emerald-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-400">Compliance Guides</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-emerald-400 font-medium truncate">{currentGuide.title}</span>
        </div>

        {/* Guide Selector Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-800 pb-4">
          {Object.values(GUIDES).map((g) => {
            const isActive = g.slug === activeSlug;
            return (
              <button
                key={g.slug}
                onClick={() => navigate(`/guides/${g.slug}`)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {g.title.split(':')[0]}
              </button>
            );
          })}
        </div>

        {/* Guide Header Banner */}
        <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Legal Sourced
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Last reviewed: {currentGuide.lastReviewed}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400 font-mono">{currentGuide.readTime}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3">
            {currentGuide.title}
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-3xl mb-4">
            {currentGuide.subtitle}
          </p>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3.5 text-xs text-zinc-300 flex items-start gap-3">
            <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Statutory Authority: </span>
              {currentGuide.regulation}
            </div>
          </div>
        </div>

        {/* GUIDE CONTENT 1: EU Melt and Pour Certificate */}
        {activeSlug === 'eu-melt-and-pour-certificate' && (
          <div className="space-y-8 text-zinc-300 text-sm sm:text-base leading-relaxed">
            <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">1. Mandatory Timeline</h2>
              <p className="mb-4">
                Starting <strong>1 October 2026</strong>, all importers of covered iron and steel goods into the European Union must evidence the <strong>Country of Melt and Pour</strong> directly upon customs declaration.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <div className="text-emerald-400 font-semibold mb-1">01 OCT 2026</div>
                  <div className="text-zinc-300">Mandatory melt-and-pour customs declaration active across all EU ports.</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <div className="text-zinc-400 font-semibold mb-1">30 SEP 2027</div>
                  <div className="text-zinc-300">End of transitional phase where commercial documents could stand alone.</div>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">2. The 10 Mandatory Elements on an MTC</h2>
              <p className="mb-4 text-zinc-400 text-xs sm:text-sm">
                Customs officers at Rotterdam, Antwerp, and Hamburg inspect these ten critical data points under EN 10204 Type 3.1:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-zinc-300">
                <li><strong>Manufacturer Name & Address:</strong> Operating primary or secondary steel plant.</li>
                <li><strong>Certificate Identifier:</strong> Unique alphanumeric serial matching packing slip.</li>
                <li><strong>EN 10204 Standard:</strong> Must specify Type 3.1 independent inspection.</li>
                <li><strong>Steel Grade & Specification:</strong> Recognized international standard (e.g., EN 10025-2, ASTM A106, AISI 316L).</li>
                <li><strong>Cast / Heat Number:</strong> Unique batch number traceable to ladle metallurgy furnace.</li>
                <li><strong>Country of Melt and Pour:</strong> Explicit two-letter ISO country code (e.g., IN for India).</li>
                <li><strong>Chemical Analysis (Ladle %):</strong> C, Si, Mn, P, S, Cr, Ni, Mo, and Carbon Equivalent Value (CEV).</li>
                <li><strong>Mechanical Test Results:</strong> Proof yield strength (Rp0.2), tensile strength (Rm), elongation (A5).</li>
                <li><strong>Batch Weight / Quantity:</strong> Mass in metric tonnes or kg matching customs packing list.</li>
                <li><strong>Authorized Inspector Attestation:</strong> Digital signature, stamp, and clause attestation.</li>
              </ol>
            </section>
          </div>
        )}

        {/* GUIDE CONTENT 2: CBAM Data for Steel Exporters */}
        {activeSlug === 'cbam-data-for-steel-exporters' && (
          <div className="space-y-8 text-zinc-300 text-sm sm:text-base leading-relaxed">
            <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">1. Who Pays vs. Who Supplies Data?</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <div className="text-emerald-400 font-semibold mb-2">The Importer Pays</div>
                  <p className="text-zinc-400 leading-normal">
                    The financial liability for purchasing CBAM certificates rests entirely with the EU-authorized declarant.
                  </p>
                </div>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <div className="text-emerald-400 font-semibold mb-2">The Exporter Supplies Data</div>
                  <p className="text-zinc-400 leading-normal">
                    Non-EU mills must provide verified installation data (direct and indirect specific embedded emissions) so importers avoid default penalty markups.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">2. Key CBAM Data Package Required</h2>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Direct Specific Embedded Emissions (SEE_dir):</strong> Direct process emissions per tonne of finished steel (tCO2e / t).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Indirect Specific Embedded Emissions (SEE_indir):</strong> Grid electricity emissions factor of the fabrication mill.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Precursor Heat Allocation:</strong> Carbon intensity of incoming raw steel billets or hot-rolled coils.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {/* GUIDE CONTENT 3: CN Scope Checker & Interactive Tool */}
        {activeSlug === 'cn-scope-checker' && (
          <div className="space-y-6">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Interactive Tariff Scope Query Tool</h2>
              <p className="text-zinc-400 text-xs sm:text-sm mb-4">
                Search by 4-digit CN code or product keyword to verify whether your export shipment requires Country of Melt-and-Pour proof and CBAM reporting:
              </p>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CN Code (e.g. 7208, 7304, 7307, 7318) or keyword..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">CN Code</th>
                      <th className="py-3 px-4">Product Category</th>
                      <th className="py-3 px-4 text-center">Melt & Pour</th>
                      <th className="py-3 px-4 text-center">CBAM</th>
                      <th className="py-3 px-4">Statutory Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredCnCodes.map((item) => (
                      <tr key={item.cn} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          CN {item.cn}
                        </td>
                        <td className="py-3 px-4 text-zinc-300 max-w-xs">{item.name}</td>
                        <td className="py-3 px-4 text-center">
                          {item.meltAndPour ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              MANDATORY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400">
                              EXEMPT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            REQUIRED
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-400 max-w-sm">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Lead Capture / CTA Card */}
        <div className="mt-12 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Free Exporter Assessment
            </div>
            <h3 className="text-xl font-semibold text-white mb-1">
              Check your Mill Test Certificate in 30 seconds
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Drop any past export MTC to instantly verify Country of Melt-and-Pour extraction, EN 10204 3.1 conformity, and CBAM scope without creating an account.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <Link
              to="/check"
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-center transition-colors shadow-lg shadow-emerald-500/20"
            >
              Test Your MTC Free
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white text-center transition-colors border border-zinc-700"
            >
              Explore Live Demo
            </Link>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-center text-xs text-zinc-400 mt-10">
          Prepares documents for review. Not legal advice. HeatLedger AI is not an accredited verifier under EU Regulation 2023/1773.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default GuidePage;
