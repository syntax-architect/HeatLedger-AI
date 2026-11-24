import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, BookOpen, Calendar, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import CheckPage from './CheckPage';

interface SeoArticle {
  slug: string;
  title: string;
  official_source: string;
  last_checked: string;
  summary: string;
  key_points: string[];
}

export const SeoGuidePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<SeoArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/check/seo/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      })
      .then((data) => setArticle(data))
      .catch(() => {
        // Fallback local lookup if backend is offline
        const fallbacks: Record<string, SeoArticle> = {
          'melt-and-pour-eu-steel': {
            slug: 'melt-and-pour-eu-steel',
            title: 'Melt and Pour Certificate Requirement for EU Steel Imports',
            official_source: 'Regulation (EU) 2026/1384 Annex I & Implementing Reg (EU) 2026/1963',
            last_checked: '2026-10-01',
            summary: 'Mandatory requirement from 1 October 2026 for all EU steel imports under CN codes 7208 to 7306 to present mill test certificates specifying both the country of melt and the country of pour with linked heat numbers.',
            key_points: [
              'Covers flat and long steel products under CN codes 7208 through 7306.',
              'Fasteners (CN 7318) and fittings (CN 7307) are out of melt-and-pour scope but remain subject to CBAM.',
              'Importers must show mill test certificate with heat number and country of melt and pour.',
              'Independent supporting documents permitted only until 30 September 2027.',
              'UK CBAM: Voluntary from 1 April 2027, mandatory from 1 July 2027 (threshold £2,000 exempt).'
            ]
          },
          'mtc-checklist-eu-export': {
            slug: 'mtc-checklist-eu-export',
            title: 'Mill Test Certificate Checklist for EU Export Compliance',
            official_source: 'EN 10204:2004 Type 3.1 & EU Customs Directorate General (TAXUD)',
            last_checked: '2026-10-01',
            summary: 'The definitive verification checklist for Indian and non-EU steel exporters before releasing shipments to European destinations.',
            key_points: [
              'EN 10204 3.1 Inspection Certificate issued by independent mill test department.',
              'Clause 6 byte-identical preservation: original manufacturer PDF must be stored unaltered.',
              'Explicit ladle chemistry analysis with Carbon, Manganese, Phosphorus, and Sulfur.',
              'Mechanical tensile, yield, and elongation values matching product standard tolerances.',
              'Traceable heat/cast number cross-referenced on commercial invoice and packing list.'
            ]
          },
          'cbam-steel-exporters-india': {
            slug: 'cbam-steel-exporters-india',
            title: 'CBAM for Steel Exporters in India: Definitive Guide',
            official_source: 'Regulation (EU) 2023/956 & EU Carbon Border Adjustment Mechanism Guidelines',
            last_checked: '2026-11-01',
            summary: 'How Indian primary and secondary steelmakers must calculate and report direct, indirect, and precursor emissions to European importers ahead of the definitive period.',
            key_points: [
              'First definitive period declaration due 30 September 2027.',
              'Default-value markups: 10% in 2026, 20% in 2027, and 30% from 2028 onwards.',
              'Quarterly EU ETS certificate prices apply to compute liability difference.',
              'Primary BF-BOF route versus EAF scrap route differentiation.',
              'Actual emissions require accreditation by an EU-accredited independent verifier.'
            ]
          },
          'en-10204-3-1-explained': {
            slug: 'en-10204-3-1-explained',
            title: 'EN 10204 3.1 Certificate Explained: Requirements and Legal Invariants',
            official_source: 'European Standard EN 10204:2004 metallic products inspection documents',
            last_checked: '2026-06-15',
            summary: 'Everything quality managers and compliance officers must know about Type 3.1 inspection certificates, authorized representatives, and non-retyping mandates.',
            key_points: [
              'Validation by the manufacturer authorized inspection representative independent of manufacturing.',
              'Type 3.1 is mandatory where specific tests are stipulated in the purchase order.',
              'Clause 6 strictly mandates that intermediaries copying certificates must retain original manufacturer test details without modification.',
              'Digital seals and hashes preserve tamper-evidence across supply-chain intermediaries.'
            ]
          },
          'hs-7318-cbam-melt-and-pour': {
            slug: 'hs-7318-cbam-melt-and-pour',
            title: 'HS 7318 Fasteners: CBAM and Melt-and-Pour Scope Guide',
            official_source: 'Regulation (EU) 2026/1384 Annex I & Regulation (EU) 2023/956 Annex I',
            last_checked: '2026-10-01',
            summary: 'Clarifying the critical distinction between CBAM liability and Melt-and-Pour origin certification for iron and steel fasteners under CN/HS code 7318.',
            key_points: [
              'HS 7318 (Screws, bolts, nuts, rivets) is OUT of melt-and-pour certificate scope under Reg 2026/1384 Annex I.',
              'HS 7318 is INCLUDED under EU CBAM Annex I and requires embodied carbon reporting.',
              'Fastener manufacturers must obtain precursor steel wire rod (CN 7213/7227) emissions data from their steel mill.',
              'No melt-and-pour certificate blocking gate at EU customs for 7318, but CBAM liability remains active.'
            ]
          }
        };
        setArticle(fallbacks[slug || ''] || null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading regulatory guidance...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Guide Article Not Found</h1>
        <p className="text-xs text-slate-400 mb-4">The regulatory article you requested does not exist.</p>
        <Link to="/check" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">
          Go to Free MTC Evaluator
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
            HL
          </div>
          <span className="font-bold text-sm tracking-tight text-white">HeatLedger AI · Knowledge Hub</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/check" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
            Free Evaluator
          </Link>
          <Link to="/login" className="text-xs text-slate-400 hover:text-white">
            Sign In
          </Link>
        </div>
      </header>

      {/* Guide Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Official EU Guidance
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Verified: {article.last_checked}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {article.title}
          </h1>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center gap-2 text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Statutory Reference:</strong> {article.official_source}
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed pt-2">
            {article.summary}
          </p>
        </div>

        {/* Regulatory Key Points */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Key Requirements and Customs Invariants
          </h2>
          <ul className="space-y-2 text-xs text-slate-300">
            {article.key_points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Embedded Free Evaluator (Task D1) */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">
              Instant Compliance Audit: Test Your MTC Now
            </h2>
            <p className="text-xs text-slate-400">
              Run this certificate through our automated melt-and-pour and chemistry rule engine. No login required.
            </p>
          </div>
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <CheckPage embeddedSlug={slug} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-[11px] text-slate-400 mt-12 space-y-1">
        <p>Prepares documents for review. Tamper-evident seal. Not legal advice.</p>
        <p>&copy; {new Date().getFullYear()} HeatLedger AI. Citing official EU and ISO/EN standards texts.</p>
      </footer>
    </div>
  );
};

export default SeoGuidePage;
