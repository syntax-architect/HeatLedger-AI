import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Search,
  Filter,
  Scale,
  TrendingUp,
  TrendingDown,
  X,
  Cpu,
  Calculator,
} from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { haptics } from '../../../lib/motion';
import { SupplierDataRequestsTracker } from './SupplierDataRequestsTracker';

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

export interface LearnedTemplate {
  mill_id: string;
  mill_name: string;
  fingerprint: string;
  layout_type: string;
  header_labels: string[];
  chemistry_table_bbox: { top: number; left: number; width: number; height: number };
  melt_origin_marker: string;
  confidence_score: number;
  review_time_reduction_pct: number;
  last_seen: string;
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
    layout_fingerprint: 'tata_tsj_rev4_bof_cc',
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
      'Faded dot-matrix carbon equivalent print',
    ],
    trend_monthly_defect_pct: [34.0, 31.5, 30.0, 29.2, 28.6],
    layout_fingerprint: 'sail_bsp_dotmatrix_v2',
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
    layout_fingerprint: 'jsw_vy_digital_signed_v3',
  },
  {
    id: 'sup_jspl_angul',
    name: 'Jindal Steel & Power (JSPL)',
    plant_location: 'Angul & Raigarh, India',
    supplier_type: 'PRIMARY_MILL',
    contact_person: 'S. Patnaik (Customer Quality)',
    contact_email: 'quality.angul@jindalsteel.com',
    contact_phone: '+91 6761 254 000',
    typical_grades: ['ASTM A572 Gr. 50', 'IS 2062 E350', 'EN 10025-2 S355J2'],
    rating_grade: 'B',
    total_certs_processed: 74,
    missing_melt_pour_pct: 10.8,
    low_confidence_ocr_pct: 8.1,
    out_of_spec_pct: 2.7,
    avg_turnaround_days: 2.9,
    repeat_defects: ['Missing silicon content on structural billets'],
    trend_monthly_defect_pct: [15.0, 13.2, 12.0, 11.4, 10.8],
    layout_fingerprint: 'jspl_angul_eaf_v1',
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
      'Re-typed certificates without Clause 6 original Annex',
      'Mismatched delivery note weights vs physical scale receipt',
    ],
    trend_monthly_defect_pct: [58.0, 56.5, 54.0, 53.2, 52.4],
    layout_fingerprint: 'apex_trader_scan_unstructured',
  },
];

const MOCK_TEMPLATES: LearnedTemplate[] = [
  {
    mill_id: 'sup_tata_steel',
    mill_name: 'Tata Steel Limited',
    fingerprint: 'tata_tsj_rev4_bof_cc',
    layout_type: 'PRIMARY_MILL_VECTOR_PDF',
    header_labels: ['TATA STEEL', 'TEST CERTIFICATE', 'EN 10204 3.1', 'JAMSHEDPUR'],
    chemistry_table_bbox: { top: 0.38, left: 0.05, width: 0.9, height: 0.18 },
    melt_origin_marker: 'STEEL MELTED AND MANUFACTURED IN INDIA (BOF-LF-CC)',
    confidence_score: 98.5,
    review_time_reduction_pct: 75,
    last_seen: '2026-11-18T10:30:00Z',
  },
  {
    mill_id: 'sup_sail_bokaro',
    mill_name: 'Steel Authority of India Limited (SAIL)',
    fingerprint: 'sail_bsp_dotmatrix_v2',
    layout_type: 'LEGACY_DOTMATRIX_SCAN',
    header_labels: ['SAIL', 'BOKARO STEEL PLANT', 'INSPECTION CERTIFICATE', 'IS 2062'],
    chemistry_table_bbox: { top: 0.42, left: 0.08, width: 0.84, height: 0.22 },
    melt_origin_marker: 'BHARAT / INDIA MELT LOCATION',
    confidence_score: 82.0,
    review_time_reduction_pct: 40,
    last_seen: '2026-11-17T14:15:00Z',
  },
  {
    mill_id: 'sup_jsw_steel',
    mill_name: 'JSW Steel Limited',
    fingerprint: 'jsw_vy_digital_signed_v3',
    layout_type: 'DIGITAL_VECTOR_SECURE_QR',
    header_labels: ['JSW STEEL', 'VIJAYANAGAR', 'EN 10204:2004 TYPE 3.1', 'MILL TEST CERTIFICATE'],
    chemistry_table_bbox: { top: 0.35, left: 0.06, width: 0.88, height: 0.2 },
    melt_origin_marker: 'CRUDE STEEL MELTED AND ROLLED AT TORANAGALLU, BELLARY, INDIA',
    confidence_score: 99.1,
    review_time_reduction_pct: 85,
    last_seen: '2026-11-19T09:00:00Z',
  },
  {
    mill_id: 'sup_jspl_angul',
    mill_name: 'Jindal Steel & Power (JSPL)',
    fingerprint: 'jspl_angul_eaf_v1',
    layout_type: 'EAF_HYBRID_DIGITAL',
    header_labels: ['JINDAL STEEL & POWER', 'ANGUL PLANT', '3.1 TEST CERTIFICATE'],
    chemistry_table_bbox: { top: 0.4, left: 0.07, width: 0.86, height: 0.19 },
    melt_origin_marker: 'COUNTRY OF CRUDE STEEL MELT: INDIA',
    confidence_score: 94.0,
    review_time_reduction_pct: 65,
    last_seen: '2026-11-16T16:45:00Z',
  },
];

// SVG Sparkline Component
const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 76;
  const height = 22;
  const padding = 3;

  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isImproving = data[data.length - 1] < data[0];
  const strokeColor = color || (isImproving ? '#059669' : '#DC2626');

  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`5-Month Defect Trend: ${data.join('% → ')}%`}
    >
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)}
          r="2.75"
          fill={strokeColor}
        />
      </svg>
      {isImproving ? (
        <TrendingDown className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
      ) : (
        <TrendingUp className="w-4 h-4 text-[#DC2626] shrink-0" strokeWidth={1.5} />
      )}
    </div>
  );
};

export const SupplierIntelligenceView: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'scorecards' | 'templates' | 'po-matcher' | 'data-requests'>('scorecards');
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(MOCK_SUPPLIERS);
  const [templates, setTemplates] = useState<LearnedTemplate[]>(MOCK_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');

  // "Ask Supplier to Fix" Modal State
  const [selectedSupplierForFix, setSelectedSupplierForFix] = useState<SupplierItem | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixDefectType, setFixDefectType] = useState('MISSING_MELT_COUNTRY');
  const [fixCertNumber, setFixCertNumber] = useState('MTC-IN-2026-9041');
  const [fixHeatNumber, setFixHeatNumber] = useState('TSJ-26-9021');
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | null>(null);

  // PO Matcher State
  const [poNumber, setPoNumber] = useState('PO-2026-IND-8840');
  const [poSupplierId, setPoSupplierId] = useState('sup_tata_steel');
  const [poHeatNumber, setPoHeatNumber] = useState('TSJ-26-9021');
  const [poGrade, setPoGrade] = useState('ASTM A106 Gr. B');
  const [expectedWeightKg, setExpectedWeightKg] = useState<number>(25000);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(25220);
  const [tolerancePct] = useState<number>(2.0);
  const [poMatchResult, setPoMatchResult] = useState<{
    status: 'MATCHED' | 'DISCREPANCY_FLAGGED';
    discrepancy_kg: number;
    discrepancy_pct: number;
    message: string;
  } | null>(null);

  // Load from backend if available
  useEffect(() => {
    let isMounted = true;
    fetch('/api/suppliers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.suppliers && isMounted) {
          setSuppliers(data.suppliers);
        }
      })
      .catch(() => {});

    fetch('/api/suppliers/templates')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.templates && isMounted) {
          setTemplates(data.templates);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.plant_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.typical_grades.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGrade = gradeFilter === 'ALL' || s.rating_grade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [suppliers, searchQuery, gradeFilter]);

  const handleOpenFixModal = (sup: SupplierItem) => {
    haptics.tap();
    setSelectedSupplierForFix(sup);
    setFixCertNumber(`MTC-${sup.name.split(' ')[0].toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFixHeatNumber(`${sup.name.slice(0, 3).toUpperCase()}-26-${Math.floor(1000 + Math.random() * 9000)}`);
    setFixModalOpen(true);
  };

  const defectExplanation = useMemo(() => {
    switch (fixDefectType) {
      case 'MISSING_MELT_COUNTRY':
        return 'Missing ISO 3166 Melt-and-Pour Country of Origin attestation. Per EU Regulation 2026/1963 and UK CBAM rules, customs clearance cannot proceed without verified crude steel melt location.';
      case 'BLURRY_DOT_MATRIX_OCR':
        return 'Faint or clipped dot-matrix printed chemistry table. Carbon (C) and Manganese (Mn) ladle analysis values are illegible for automated customs verification.';
      case 'OFF_SPEC_CHEMISTRY':
        return 'Silicon or Phosphorus levels appear outside ASTM ordered standard thresholds.';
      case 'PO_QTY_MISMATCH':
        return 'Net delivered coil tonnage on invoice deviates from purchase order weight limits by more than allowable rolling tolerance.';
      default:
        return 'Documentation exception requires immediate technical correction.';
    }
  }, [fixDefectType]);

  const generatedWhatsAppMsg = useMemo(() => {
    if (!selectedSupplierForFix) return '';
    return (
      `URGENT: Mill Test Certificate Correction Request\n\n` +
      `Dear ${selectedSupplierForFix.contact_person} (${selectedSupplierForFix.name}),\n\n` +
      `Our export compliance inspection gate flagged an exception with the certificate for export shipment:\n` +
      `- MTC Number: ${fixCertNumber}\n` +
      `- Heat Number: ${fixHeatNumber}\n` +
      `- Exception: ${defectExplanation}\n\n` +
      `EU customs clearance is currently held. Please upload an amended EN 10204 3.1 MTC via our intake portal:\n` +
      `https://heatledger.ai/upload?cert=${fixCertNumber}&heat=${fixHeatNumber}\n\n` +
      `Thank you,\n` +
      `Quality Assurance & Export Compliance,\n` +
      `Howrah Precision Forgings Pvt. Ltd.`
    );
  }, [selectedSupplierForFix, fixCertNumber, fixHeatNumber, defectExplanation]);

  const generatedEmailBody = useMemo(() => {
    if (!selectedSupplierForFix) return '';
    return (
      `Dear ${selectedSupplierForFix.contact_person},\n\n` +
      `We are writing to request an urgent amendment to Mill Test Certificate ${fixCertNumber} (Heat #${fixHeatNumber}) ` +
      `supplied to Howrah Precision Forgings Pvt. Ltd.\n\n` +
      `During pre-shipment CBAM definitive regime verification under Regulation (EU) 2026/1963, ` +
      `our inspection gate identified the following issue:\n\n` +
      `EXCEPTION DETAILS:\n` +
      `--------------------------------------------------\n` +
      `${defectExplanation}\n` +
      `--------------------------------------------------\n\n` +
      `To avoid port detention at Rotterdam/Hamburg, please issue an amended EN 10204 3.1 ` +
      `certificate containing the authenticated Melt-and-Pour declaration.\n\n` +
      `Submit the corrected document directly via our vendor intake portal:\n` +
      `https://heatledger.ai/upload?cert=${fixCertNumber}&heat=${fixHeatNumber}\n\n` +
      `Sincerely,\n` +
      `Head of Metallurgy & Quality Assurance\n` +
      `Howrah Precision Forgings Pvt. Ltd.`
    );
  }, [selectedSupplierForFix, fixCertNumber, fixHeatNumber, defectExplanation]);

  const handleCopyText = (text: string, type: 'whatsapp' | 'email') => {
    haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success(
      'Copied to Clipboard',
      `Correction ${type === 'whatsapp' ? 'WhatsApp message' : 'formal email'} copied.`
    );
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleMatchPo = () => {
    haptics.tap();
    const discrepancy = +(receivedWeightKg - expectedWeightKg).toFixed(2);
    const diffPct = expectedWeightKg > 0 ? +((Math.abs(discrepancy) / expectedWeightKg) * 100).toFixed(2) : 0;
    const isDiscrepancy = diffPct > tolerancePct;

    setPoMatchResult({
      status: isDiscrepancy ? 'DISCREPANCY_FLAGGED' : 'MATCHED',
      discrepancy_kg: discrepancy,
      discrepancy_pct: diffPct,
      message: isDiscrepancy
        ? `Weight discrepancy of ${Math.abs(discrepancy).toLocaleString()} kg (${diffPct}%) exceeds ±${tolerancePct}% allowable rolling margin.`
        : `Weight reconciled within allowable ±${tolerancePct}% margin (${discrepancy >= 0 ? '+' : ''}${discrepancy} kg, ${diffPct}%).`,
    });

    if (isDiscrepancy) {
      toast.warning(
        'PO Weight Discrepancy Flagged',
        `Difference exceeds ±${tolerancePct}% allowable rolling tolerance.`
      );
    } else {
      toast.success('PO Matched Successfully', 'Received weight matches purchase order within tolerance.');
    }
  };

  const getRatingBadge = (rating: SupplierItem['rating_grade']) => {
    switch (rating) {
      case 'A':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
            Grade A · Verified
          </span>
        );
      case 'B':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15">
            Grade B · Standard
          </span>
        );
      case 'C':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            Grade C · Defect Prone
          </span>
        );
      case 'D':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            Grade D · High Risk
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans text-left text-[#18181A]">
      {/* Header Bar */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
            <h1 className="text-lg sm:text-xl font-medium tracking-[-0.02em] text-[#18181A]">
              Supplier &amp; Mill Intelligence
            </h1>
          </div>
          <p className="text-xs text-[#55544E] mt-1">
            Track certificate defect rates by mill, manage learned template layout fingerprints, and dispatch structured correction notices.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 self-start lg:self-center overflow-x-auto max-w-full">
          {[
            { id: 'scorecards' as const, label: 'Scorecards' },
            { id: 'templates' as const, label: 'Learned Templates' },
            { id: 'po-matcher' as const, label: 'PO Matcher' },
            { id: 'data-requests' as const, label: 'CBAM Precursor Tracker' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                haptics.tap();
                setActiveTab(tab.id);
              }}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: SUPPLIER SCORECARDS */}
      {activeTab === 'scorecards' && (
        <div className="space-y-4">
          {/* Controls Strip: Search + Grade Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search mills, locations, grades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#55544E] mr-1 inline-flex items-center gap-1">
                <Filter className="w-4 h-4" strokeWidth={1.5} /> Rating:
              </span>
              {(['ALL', 'A', 'B', 'C', 'D'] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setGradeFilter(grade)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 border cursor-pointer ${
                    gradeFilter === grade
                      ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                      : 'bg-[#FCFBF8] text-[#55544E] hover:text-[#18181A] border-[#18181A]/12 hover:bg-[#EFECE5]'
                  }`}
                >
                  {grade === 'ALL' ? 'All' : `Grade ${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-3">
            {filteredSuppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#18181A]">{sup.name}</h3>
                    <p className="text-xs text-[#55544E] mt-0.5">{sup.plant_location}</p>
                  </div>
                  {getRatingBadge(sup.rating_grade)}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-center text-xs">
                  <div>
                    <span className="text-xs text-[#55544E] block">Missing Origin</span>
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        sup.missing_melt_pour_pct > 10 ? 'text-[#DC2626]' : 'text-[#047857]'
                      }`}
                    >
                      {sup.missing_melt_pour_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#55544E] block">Low OCR</span>
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        sup.low_confidence_ocr_pct > 15 ? 'text-[#B45309]' : 'text-[#18181A]'
                      }`}
                    >
                      {sup.low_confidence_ocr_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#55544E] block">Lead Time</span>
                    <span className="font-mono tabular-nums font-medium text-[#18181A]">
                      {sup.avg_turnaround_days}d
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#55544E]">5-Month Defect Trend</span>
                  <Sparkline data={sup.trend_monthly_defect_pct} />
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenFixModal(sup)}
                  className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-2 border border-[#18181A]/12 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                  <span>Request MTC Amendment</span>
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 bg-[#F7F5F0] text-[#55544E]">
                  <th className="py-3 px-4 font-medium">Supplier &amp; Mill</th>
                  <th className="py-3 px-3 font-medium">Rating</th>
                  <th className="py-3 px-3 font-medium">Processed</th>
                  <th className="py-3 px-3 font-medium">Missing Melt/Pour</th>
                  <th className="py-3 px-3 font-medium">Low OCR (&lt;85%)</th>
                  <th className="py-3 px-3 font-medium">Avg Lead Time</th>
                  <th className="py-3 px-4 font-medium">5-Mo Trend</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/10">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#18181A] text-sm">{sup.name}</div>
                      <div className="text-xs text-[#55544E] mt-0.5">{sup.plant_location}</div>
                      <div className="text-xs text-[#78766E] font-mono mt-0.5">
                        {sup.layout_fingerprint}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">{getRatingBadge(sup.rating_grade)}</td>
                    <td className="py-3.5 px-3 font-mono tabular-nums font-medium text-[#18181A]">
                      {sup.total_certs_processed} certs
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          sup.missing_melt_pour_pct > 10 ? 'text-[#DC2626]' : 'text-[#047857]'
                        }`}
                      >
                        {sup.missing_melt_pour_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          sup.low_confidence_ocr_pct > 15 ? 'text-[#B45309]' : 'text-[#18181A]'
                        }`}
                      >
                        {sup.low_confidence_ocr_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums text-[#18181A]">
                      {sup.avg_turnaround_days} days
                    </td>
                    <td className="py-3.5 px-4">
                      <Sparkline data={sup.trend_monthly_defect_pct} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenFixModal(sup)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/12 transition-colors duration-150 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#B45309]" strokeWidth={1.5} />
                        <span>Ask to Fix</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: LEARNED MILL LAYOUT FINGERPRINTS */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#18181A]">
              <Cpu className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Deterministic Layout Fingerprints &amp; OCR Field Maps</span>
            </div>
            <p className="text-xs text-[#55544E] leading-relaxed">
              When an uploaded certificate matches a known mill layout fingerprint, parsing routes directly to calibrated bounding-box maps—reducing review time on repeat mills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.fingerprint}
                className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3.5 hover:border-[#18181A]/25 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-[#18181A]">{tpl.mill_name}</h3>
                    <div className="inline-block mt-1 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-xs font-mono text-[#18181A]">
                      {tpl.fingerprint}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200 shrink-0">
                    {tpl.confidence_score}% match
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1.5">
                    <span className="text-xs font-medium text-[#55544E] block">
                      Header Match Tokens
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.header_labels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#FCFBF8] text-[#18181A] text-xs font-mono border border-[#18181A]/10"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1">
                    <span className="text-xs font-medium text-[#55544E] block">
                      Melt-and-Pour Origin Marker
                    </span>
                    <div className="text-xs font-mono text-[#047857] font-medium truncate" title={tpl.melt_origin_marker}>
                      {tpl.melt_origin_marker}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#55544E]">Estimated Review Reduction</span>
                    <span className="text-xs font-mono tabular-nums font-medium text-[#047857]">
                      -{tpl.review_time_reduction_pct}% review time
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: PO WEIGHT RECONCILER */}
      {activeTab === 'po-matcher' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#18181A]/10">
              <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#18181A]">
                  Purchase Order Weight Reconciler
                </h2>
                <p className="text-xs text-[#55544E]">
                  Reconciles ordered tonnage against physical weighbridge scale receipt within rolling tolerance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Purchase Order (PO) Number
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Supplier Mill
                </label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Heat / Cast Number
                </label>
                <input
                  type="text"
                  value={poHeatNumber}
                  onChange={(e) => setPoHeatNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Steel Grade
                </label>
                <input
                  type="text"
                  value={poGrade}
                  onChange={(e) => setPoGrade(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Expected PO Weight (kg)
                </label>
                <input
                  type="number"
                  value={expectedWeightKg}
                  onChange={(e) => setExpectedWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Received MTC / Scale Weight (kg)
                </label>
                <input
                  type="number"
                  value={receivedWeightKg}
                  onChange={(e) => setReceivedWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#18181A]/10">
              <div className="text-xs text-[#55544E]">
                Allowable Rolling Margin:{' '}
                <span className="font-mono tabular-nums font-medium text-[#18181A]">
                  ±{tolerancePct}%
                </span>
              </div>
              <button
                type="button"
                onClick={handleMatchPo}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calculator className="w-4 h-4" strokeWidth={1.5} />
                <span>Reconcile Weights</span>
              </button>
            </div>

            {/* PO Reconcile Output Result Card */}
            {poMatchResult && (
              <div
                className={`p-4 rounded-xl border space-y-1.5 ${
                  poMatchResult.status === 'MATCHED'
                    ? 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs flex items-center gap-1.5">
                    {poMatchResult.status === 'MATCHED' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#DC2626]" strokeWidth={1.5} />
                    )}
                    {poMatchResult.status === 'MATCHED' ? 'Tolerance Verified' : 'Discrepancy Flagged'}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-medium">
                    Δ {poMatchResult.discrepancy_kg > 0 ? `+${poMatchResult.discrepancy_kg}` : poMatchResult.discrepancy_kg} kg (
                    {poMatchResult.discrepancy_pct}%)
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#18181A]">{poMatchResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: CBAM PRECURSOR DATA REQUESTS TRACKER */}
      {activeTab === 'data-requests' && <SupplierDataRequestsTracker />}

      {/* 'Ask Supplier to Fix' Modal */}
      {fixModalOpen && selectedSupplierForFix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-lg w-full p-6 space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#18181A]/10">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-4 h-4 text-[#B45309] shrink-0" strokeWidth={1.5} />
                <h3 className="text-sm font-medium text-[#18181A] truncate">
                  Ask Supplier to Fix: {selectedSupplierForFix.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFixModalOpen(false)}
                className="text-[#55544E] hover:text-[#18181A] p-1.5 rounded-lg hover:bg-[#EFECE5] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                  Exception Category
                </label>
                <select
                  value={fixDefectType}
                  onChange={(e) => setFixDefectType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                >
                  <option value="MISSING_MELT_COUNTRY">Missing ISO 3166 Melt-and-Pour Country of Origin</option>
                  <option value="BLURRY_DOT_MATRIX_OCR">Faint / Illegible Dot-Matrix Ladle Analysis</option>
                  <option value="OFF_SPEC_CHEMISTRY">Out-of-Spec Chemistry (Silicon / Phosphorus)</option>
                  <option value="PO_QTY_MISMATCH">Delivered Weight Exceeds PO Tolerance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                    MTC Reference
                  </label>
                  <input
                    type="text"
                    value={fixCertNumber}
                    onChange={(e) => setFixCertNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                    Heat Number
                  </label>
                  <input
                    type="text"
                    value={fixHeatNumber}
                    onChange={(e) => setFixHeatNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              {/* WhatsApp Generated Notice */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-[#047857] flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                    WhatsApp Direct Notice:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedWhatsAppMsg, 'whatsapp')}
                    className="text-xs font-medium text-[#55544E] hover:text-[#18181A] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'whatsapp' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    <span>{copiedType === 'whatsapp' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={generatedWhatsAppMsg}
                  className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] leading-relaxed focus:outline-none"
                />
              </div>

              {/* Email Generated Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-[#18181A] flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
                    Formal Email Template:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedEmailBody, 'email')}
                    className="text-xs font-medium text-[#55544E] hover:text-[#18181A] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'email' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={generatedEmailBody}
                  className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] leading-relaxed focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#18181A]/10">
                <button
                  type="button"
                  onClick={() => setFixModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
