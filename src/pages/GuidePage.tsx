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
    <div className="min-h-screen bg-[#121316] text-[#EAEAEA] flex flex-col font-sans">
      <TopNavbar onToggleMode={(m) => navigate(m === 'dashboard' ? '/app' : '/')} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#9FA3AD] mb-6">
          <Link to="/" className="hover:text-[#10B981] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="text-[#9FA3AD]">Compliance Guides</span>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="text-[#10B981] font-medium truncate">{currentGuide.title}</span>
        </div>

        {/* Guide Selector Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-[#2C303A] pb-4">
          {Object.values(GUIDES).map((g) => {
            const isActive = g.slug === activeSlug;
            return (
              <button
                key={g.slug}
                onClick={() => navigate(`/guides/${g.slug}`)}
                className={`h-9 px-3.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                    : 'text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#181A1F] border border-transparent'
                }`}
              >
                {g.title.split(':')[0]}
              </button>
            );
          })}
        </div>

        {/* Guide Header Banner */}
        <div className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} /> Verified Legal Sourced
            </span>
            <span className="text-xs text-[#9FA3AD] font-mono">
              Last reviewed: {currentGuide.lastReviewed}
            </span>
            <span className="text-xs text-[#9FA3AD]">·</span>
            <span className="text-xs text-[#9FA3AD] font-mono">{currentGuide.readTime}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-medium text-[#EAEAEA] tracking-tight mb-3">
            {currentGuide.title}
          </h1>
          <p className="text-[#9FA3AD] text-sm sm:text-base leading-relaxed max-w-3xl mb-4">
            {currentGuide.subtitle}
          </p>

          <div className="bg-[#121316] border border-[#2C303A] rounded-lg p-3.5 text-xs text-[#EAEAEA] flex items-start gap-3">
            <Scale className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <span className="font-medium text-[#EAEAEA]">Statutory Authority: </span>
              <span className="text-[#9FA3AD]">{currentGuide.regulation}</span>
            </div>
          </div>
        </div>

        {/* GUIDE CONTENT 1: EU Melt and Pour Certificate */}
        {activeSlug === 'eu-melt-and-pour-certificate' && (
          <div className="space-y-8 text-[#9FA3AD] text-sm sm:text-base leading-relaxed">
            <section className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[#EAEAEA] mb-3">1. Mandatory Timeline</h2>
              <p className="mb-4">
                Starting <span className="font-medium text-[#EAEAEA]">1 October 2026</span>, all importers of covered iron and steel goods into the European Union must evidence the <span className="font-medium text-[#EAEAEA]">Country of Melt and Pour</span> directly upon customs declaration.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-[#121316] p-4 rounded-lg border border-[#2C303A]">
                  <div className="text-[#10B981] font-medium mb-1">01 OCT 2026</div>
                  <div className="text-[#EAEAEA]">Mandatory melt-and-pour customs declaration active across all EU ports.</div>
                </div>
                <div className="bg-[#121316] p-4 rounded-lg border border-[#2C303A]">
                  <div className="text-[#9FA3AD] font-medium mb-1">30 SEP 2027</div>
                  <div className="text-[#EAEAEA]">End of transitional phase where commercial documents could stand alone.</div>
                </div>
              </div>
            </section>

            <section className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[#EAEAEA] mb-3">2. The 10 Mandatory Elements on an MTC</h2>
              <p className="mb-4 text-[#9FA3AD] text-xs sm:text-sm">
                Customs officers at Rotterdam, Antwerp, and Hamburg inspect these ten critical data points under EN 10204 Type 3.1:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[#9FA3AD]">
                <li><span className="font-medium text-[#EAEAEA]">Manufacturer Name &amp; Address:</span> Operating primary or secondary steel plant.</li>
                <li><span className="font-medium text-[#EAEAEA]">Certificate Identifier:</span> Unique alphanumeric serial matching packing slip.</li>
                <li><span className="font-medium text-[#EAEAEA]">EN 10204 Standard:</span> Must specify Type 3.1 independent inspection.</li>
                <li><span className="font-medium text-[#EAEAEA]">Steel Grade &amp; Specification:</span> Recognized international standard (e.g., EN 10025-2, ASTM A106, AISI 316L).</li>
                <li><span className="font-medium text-[#EAEAEA]">Cast / Heat Number:</span> Unique batch number traceable to ladle metallurgy furnace.</li>
                <li><span className="font-medium text-[#EAEAEA]">Country of Melt and Pour:</span> Explicit two-letter ISO country code (e.g., IN for India).</li>
                <li><span className="font-medium text-[#EAEAEA]">Chemical Analysis (Ladle %):</span> C, Si, Mn, P, S, Cr, Ni, Mo, and Carbon Equivalent Value (CEV).</li>
                <li><span className="font-medium text-[#EAEAEA]">Mechanical Test Results:</span> Proof yield strength (Rp0.2), tensile strength (Rm), elongation (A5).</li>
                <li><span className="font-medium text-[#EAEAEA]">Batch Weight / Quantity:</span> Mass in metric tonnes or kg matching customs packing list.</li>
                <li><span className="font-medium text-[#EAEAEA]">Authorized Inspector Attestation:</span> Digital signature, stamp, and clause attestation.</li>
              </ol>
            </section>
          </div>
        )}

        {/* GUIDE CONTENT 2: CBAM Data for Steel Exporters */}
        {activeSlug === 'cbam-data-for-steel-exporters' && (
          <div className="space-y-8 text-[#9FA3AD] text-sm sm:text-base leading-relaxed">
            <section className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[#EAEAEA] mb-3">1. Who Pays vs. Who Supplies Data?</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-[#121316] p-4 rounded-lg border border-[#2C303A]">
                  <div className="text-[#10B981] font-medium mb-2">The Importer Pays</div>
                  <p className="text-[#9FA3AD] leading-normal">
                    The financial liability for purchasing CBAM certificates rests entirely with the EU-authorized declarant.
                  </p>
                </div>
                <div className="bg-[#121316] p-4 rounded-lg border border-[#2C303A]">
                  <div className="text-[#10B981] font-medium mb-2">The Exporter Supplies Data</div>
                  <p className="text-[#9FA3AD] leading-normal">
                    Non-EU mills must provide verified installation data (direct and indirect specific embedded emissions) so importers avoid default penalty markups.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[#EAEAEA] mb-3">2. Key CBAM Data Package Required</h2>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span><span className="font-medium text-[#EAEAEA]">Direct Specific Embedded Emissions (SEE_dir):</span> Direct process emissions per tonne of finished steel (tCO2e / t).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span><span className="font-medium text-[#EAEAEA]">Indirect Specific Embedded Emissions (SEE_indir):</span> Grid electricity emissions factor of the fabrication mill.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span><span className="font-medium text-[#EAEAEA]">Precursor Heat Allocation:</span> Carbon intensity of incoming raw steel billets or hot-rolled coils.</span>
                </li>
              </ul>
            </section>
          </div>
        )}

        {/* GUIDE CONTENT 3: CN Scope Checker & Interactive Tool */}
        {activeSlug === 'cn-scope-checker' && (
          <div className="space-y-6">
            <section className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[#EAEAEA] mb-2">Interactive Tariff Scope Query Tool</h2>
              <p className="text-[#9FA3AD] text-xs sm:text-sm mb-4">
                Search by 4-digit CN code or product keyword to verify whether your export shipment requires Country of Melt-and-Pour proof and CBAM reporting:
              </p>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="w-4 h-4 text-[#9FA3AD] absolute left-3.5 top-3" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CN Code (e.g. 7208, 7304, 7307, 7318) or keyword..."
                  className="w-full h-10 bg-[#121316] border border-[#2C303A] rounded-lg pl-10 pr-4 text-xs sm:text-sm text-[#EAEAEA] placeholder:text-[#9FA3AD] focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto rounded-lg border border-[#2C303A]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#121316] text-[#9FA3AD] font-mono text-[11px] border-b border-[#2C303A]">
                    <tr>
                      <th className="py-3 px-4">CN Code</th>
                      <th className="py-3 px-4">Product Category</th>
                      <th className="py-3 px-4 text-center">Melt &amp; Pour</th>
                      <th className="py-3 px-4 text-center">CBAM</th>
                      <th className="py-3 px-4">Statutory Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C303A] font-sans">
                    {filteredCnCodes.map((item) => (
                      <tr key={item.cn} className="hover:bg-[#121316]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[#EAEAEA]">
                          CN {item.cn}
                        </td>
                        <td className="py-3 px-4 text-[#EAEAEA] max-w-xs">{item.name}</td>
                        <td className="py-3 px-4 text-center">
                          {item.meltAndPour ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Mandatory
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#2C303A] text-[#9FA3AD]">
                              Exempt
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                            Required
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#9FA3AD] max-w-sm">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Lead Capture / CTA Card */}
        <div className="mt-12 bg-[#181A1F] border border-[#10B981]/30 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#10B981] mb-2">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> Free Exporter Assessment
            </div>
            <h3 className="text-xl font-medium text-[#EAEAEA] mb-1">
              Check your Mill Test Certificate in 30 seconds
            </h3>
            <p className="text-xs sm:text-sm text-[#9FA3AD]">
              Drop any past export MTC to instantly verify Country of Melt-and-Pour extraction, EN 10204 3.1 conformity, and CBAM scope without creating an account.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <Link
              to="/check"
              className="h-10 px-5 rounded-lg text-xs sm:text-sm font-medium bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] flex items-center justify-center transition-colors"
            >
              Test Your MTC Free
            </Link>
            <Link
              to="/login"
              className="h-10 px-5 rounded-lg text-xs sm:text-sm font-medium bg-[#2C303A] hover:bg-[#3A3F4B] text-[#EAEAEA] flex items-center justify-center transition-colors border border-[#3A3F4B]"
            >
              Explore Live Demo
            </Link>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-center text-xs text-[#9FA3AD] mt-10">
          Prepares documents for review. Not legal advice. HeatLedger AI is not an accredited verifier under EU Regulation 2023/1773.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default GuidePage;
