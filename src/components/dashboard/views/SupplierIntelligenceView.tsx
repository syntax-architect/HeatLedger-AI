import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Search,
  Filter,
  Scale,
  ArrowRight,
  TrendingUp,
  FileText,
  HelpCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { haptics } from '../../../lib/motion';

export interface SupplierItem {
  id: string;
  name: string;
  plant_location: string;
  supplier_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  typical_grades: string[];
  rating_grade: 'A' | 'B' | 'C' | 'D';
  total_certs_processed: number;
  missing_melt_pour_pct: number;
  low_confidence_ocr_pct: number;
  out_of_spec_pct: number;
  avg_turnaround_days: number;
  repeat_defects: string[];
  trend_monthly_defect_pct: number[];
  layout_fingerprint: string;
}

const MOCK_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup_tata_steel',
    name: 'Tata Steel Limited',
    plant_location: 'Jamshedpur & Kalinganagar, India',
    supplier_type: 'PRIMARY_MILL',
    contact_person: 'V. K. Mehta (QA & Dispatch)',
    contact_email: 'tc.dispatch@tatasteel.com',
    contact_phone: '+91 657 664 4000',
    typical_grades: ['ASTM A106 Gr. B', 'ASTM A105', 'API 5L X52', 'IS 2062 E250'],
    rating_grade: 'A',
    total_certs_processed: 142,
    missing_melt_pour_pct: 2.1,
    low_confidence_ocr_pct: 3.5,
    out_of_spec_pct: 0.7,
    avg_turnaround_days: 1.8,
    repeat_defects: ['Occasional faint tensile elongation stamp'],
    trend_monthly_defect_pct: [6.2, 4.8, 3.5, 2.8, 2.1],
    layout_fingerprint: 'tata_tsj_rev4_bof_cc'
  },
  {
    id: 'sup_sail_bokaro',
    name: 'Steel Authority of India Limited (SAIL)',
    plant_location: 'Bokaro Steel Plant, Jharkhand, India',
    supplier_type: 'PRIMARY_MILL',
    contact_person: 'A. K. Sharma (Technical Services)',
    contact_email: 'mtc.bokaro@sail.in',
    contact_phone: '+91 6542 240 331',
    typical_grades: ['IS 2062 E250BR', 'ASTM A36', 'SAILMA 350HI'],
    rating_grade: 'C',
    total_certs_processed: 98,
    missing_melt_pour_pct: 28.6,
    low_confidence_ocr_pct: 24.5,
    out_of_spec_pct: 4.1,
    avg_turnaround_days: 4.2,
    repeat_defects: [
      'Missing ISO 3166 Melt-and-Pour origin line',
      'Faded dot-matrix carbon equivalent print'
    ],
    trend_monthly_defect_pct: [34.0, 31.5, 30.0, 29.2, 28.6],
    layout_fingerprint: 'sail_bsp_dotmatrix_v2'
  },
  {
    id: 'sup_jsw_steel',
    name: 'JSW Steel Limited',
    plant_location: 'Vijayanagar Works, Karnataka, India',
    supplier_type: 'PRIMARY_MILL',
    contact_person: 'P. R. Hegde (Commercial Operations)',
    contact_email: 'exports.quality@jsw.in',
    contact_phone: '+91 8395 250 120',
    typical_grades: ['ASTM A105', 'ASTM A516 Gr. 70', 'EN 10222-2 16Mo3'],
    rating_grade: 'A',
    total_certs_processed: 116,
    missing_melt_pour_pct: 3.4,
    low_confidence_ocr_pct: 4.2,
    out_of_spec_pct: 1.2,
    avg_turnaround_days: 2.1,
    repeat_defects: ['Non-standard date formatting (MM/DD/YY vs DD-MM-YYYY)'],
    trend_monthly_defect_pct: [7.0, 5.5, 4.2, 3.8, 3.4],
    layout_fingerprint: 'jsw_vy_digital_signed_v3'
  },
  {
    id: 'sup_apex_traders',
    name: 'Apex Steel Intermediaries & Stockholders',
    plant_location: 'Strand Road, Kolkata, West Bengal, India',
    supplier_type: 'TRADER_STOCKIST',
    contact_person: 'M. K. Agarwal (Managing Partner)',
    contact_email: 'sales@apexsteelkolkata.com',
    contact_phone: '+91 33 2230 8911',
    typical_grades: ['Commercial Mild Steel', 'ASTM A106 Seamless Secondary'],
    rating_grade: 'D',
    total_certs_processed: 42,
    missing_melt_pour_pct: 52.4,
    low_confidence_ocr_pct: 45.2,
    out_of_spec_pct: 9.5,
    avg_turnaround_days: 6.5,
    repeat_defects: [
      'Re-typed certificates without Clause 6 untouched original Annex',
      'Mismatched delivery note weights vs physical scale receipt'
    ],
    trend_monthly_defect_pct: [58.0, 56.5, 54.0, 53.2, 52.4],
    layout_fingerprint: 'apex_trader_scan_unstructured'
  }
];

export const SupplierIntelligenceView: React.FC = () => {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(MOCK_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierForFix, setSelectedSupplierForFix] = useState<SupplierItem | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixDefectType, setFixDefectType] = useState('MISSING_MELT_COUNTRY');
  const [fixCertNumber, setFixCertNumber] = useState('MTC-IN-2026-9041');
  const [fixHeatNumber, setFixHeatNumber] = useState('TSJ-26-9021');
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | null>(null);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.plant_location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  const handleOpenFixModal = (sup: SupplierItem) => {
    haptics.tap();
    setSelectedSupplierForFix(sup);
    setFixModalOpen(true);
  };

  const generatedWhatsAppMsg = useMemo(() => {
    if (!selectedSupplierForFix) return '';
    return `🚨 *URGENT: Mill Test Certificate Correction Request*\n\nDear ${selectedSupplierForFix.contact_person} (${selectedSupplierForFix.name}),\n\nOur pre-shipment CBAM customs inspection gate flagged an exception on certificate:\n• *MTC Number:* ${fixCertNumber}\n• *Heat Number:* ${fixHeatNumber}\n• *Reason:* Missing ISO 3166 Melt-and-Pour origin line required under European Regulation 2026/1963.\n\nPlease upload an amended/digitally re-certified 3.1 MTC immediately:\n👉 https://heatledger.ai/upload?cert=${fixCertNumber}&heat=${fixHeatNumber}\n\nQuality Assurance & Customs Compliance,\n*Howrah Precision Forgings Pvt. Ltd.*`;
  }, [selectedSupplierForFix, fixCertNumber, fixHeatNumber]);

  const generatedEmailBody = useMemo(() => {
    if (!selectedSupplierForFix) return '';
    return `Dear ${selectedSupplierForFix.contact_person},\n\nWe are writing to request an urgent technical amendment to Mill Test Certificate ${fixCertNumber} (Heat #${fixHeatNumber}) supplied by ${selectedSupplierForFix.name}.\n\nDuring EU CBAM pre-shipment validation, our compliance system flagged that the certificate lacks the mandatory ISO 3166 crude steel Melt-and-Pour origin declaration required under European Sanctions Regulation (EU) 2023/1214 (Article 3g).\n\nTo prevent port of entry detention at Rotterdam/Hamburg, please upload the amended EN 10204 3.1 certificate using our secure vendor intake link:\nhttps://heatledger.ai/upload?cert=${fixCertNumber}&heat=${fixHeatNumber}\n\nSincerely,\nHead of Metallurgy & Quality Assurance\nHowrah Precision Forgings Pvt. Ltd.`;
  }, [selectedSupplierForFix, fixCertNumber, fixHeatNumber]);

  const handleCopyText = (text: string, type: 'whatsapp' | 'email') => {
    haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copied to Clipboard', `Correction ${type === 'whatsapp' ? 'WhatsApp message' : 'formal email'} copied.`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getRatingBadge = (rating: SupplierItem['rating_grade']) => {
    switch (rating) {
      case 'A':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GRADE A · VERIFIED</span>;
      case 'B':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">GRADE B · STANDARD</span>;
      case 'C':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">GRADE C · DEFECT PRONE</span>;
      case 'D':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">GRADE D · HIGH RISK</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Header Bar */}
      <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text">
              Supplier &amp; Mill Intelligence Scorecards
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Track certificate error rates by mill, learn template layout fingerprints, and send one-tap correction notices.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mills & stockists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-2 border border-border text-xs text-text placeholder-text-muted focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {filteredSuppliers.map((sup) => (
          <div key={sup.id} className="p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-text">{sup.name}</h3>
                <p className="text-xs text-text-muted font-mono">{sup.plant_location}</p>
              </div>
              {getRatingBadge(sup.rating_grade)}
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface-2 border border-border text-center text-xs font-mono">
              <div>
                <span className="text-[10px] text-text-muted block">Missing Origin</span>
                <span className={`font-bold ${sup.missing_melt_pour_pct > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {sup.missing_melt_pour_pct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Low OCR</span>
                <span className={`font-bold ${sup.low_confidence_ocr_pct > 15 ? 'text-amber-400' : 'text-text'}`}>
                  {sup.low_confidence_ocr_pct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Turnaround</span>
                <span className="font-bold text-text">{sup.avg_turnaround_days}d</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenFixModal(sup)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-text font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Ask Supplier to Fix MTC</span>
            </button>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-text-muted font-mono uppercase text-[11px]">
              <th className="py-3.5 px-4 font-bold">Supplier &amp; Location</th>
              <th className="py-3.5 px-3 font-bold">Rating</th>
              <th className="py-3.5 px-3 font-bold">Processed</th>
              <th className="py-3.5 px-3 font-bold">Missing Melt/Pour</th>
              <th className="py-3.5 px-3 font-bold">Low OCR (&lt;85%)</th>
              <th className="py-3.5 px-3 font-bold">Turnaround</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSuppliers.map((sup) => (
              <tr key={sup.id} className="hover:bg-surface-2/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-text text-sm">{sup.name}</div>
                  <div className="text-[11px] text-text-muted font-mono">{sup.plant_location}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Fingerprint: {sup.layout_fingerprint}</div>
                </td>
                <td className="py-3.5 px-3">{getRatingBadge(sup.rating_grade)}</td>
                <td className="py-3.5 px-3 font-mono font-bold text-text">{sup.total_certs_processed} certs</td>
                <td className="py-3.5 px-3 font-mono">
                  <span className={`font-bold ${sup.missing_melt_pour_pct > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {sup.missing_melt_pour_pct}%
                  </span>
                </td>
                <td className="py-3.5 px-3 font-mono">
                  <span className={`font-bold ${sup.low_confidence_ocr_pct > 15 ? 'text-amber-400' : 'text-text'}`}>
                    {sup.low_confidence_ocr_pct}%
                  </span>
                </td>
                <td className="py-3.5 px-3 font-mono text-text">{sup.avg_turnaround_days} days</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleOpenFixModal(sup)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-text font-mono text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ask to Fix</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 'Ask Supplier to Fix' Modal (Prompt P2) */}
      {fixModalOpen && selectedSupplierForFix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-text">
                  Ask Supplier to Fix MTC: {selectedSupplierForFix.name}
                </h3>
              </div>
              <button
                onClick={() => setFixModalOpen(false)}
                className="text-text-muted hover:text-text p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-text-muted font-mono block mb-1">MTC Reference Number</label>
                <input
                  type="text"
                  value={fixCertNumber}
                  onChange={(e) => setFixCertNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-text font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-text-muted font-mono block mb-1">Heat / Cast Number</label>
                <input
                  type="text"
                  value={fixHeatNumber}
                  onChange={(e) => setFixHeatNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-text font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* WhatsApp Generated Notice */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Direct Notice:
                  </span>
                  <button
                    onClick={() => handleCopyText(generatedWhatsAppMsg, 'whatsapp')}
                    className="text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    {copiedType === 'whatsapp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'whatsapp' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={generatedWhatsAppMsg}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-750 font-mono text-[11px] text-slate-300 leading-relaxed focus:outline-none"
                />
              </div>

              {/* Email Generated Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sky-400 font-mono flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Formal Email Template:
                  </span>
                  <button
                    onClick={() => handleCopyText(generatedEmailBody, 'email')}
                    className="text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    {copiedType === 'email' ? <Check className="w-3 h-3 text-sky-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={generatedEmailBody}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-750 font-mono text-[11px] text-slate-300 leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setFixModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface text-text font-mono text-xs font-bold transition-colors"
              >
                Close
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(generatedWhatsAppMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
