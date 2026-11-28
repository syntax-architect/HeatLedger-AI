import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SupplierIntelligenceView,
  type SupplierItem,
  type LearnedTemplate,
} from '../components/dashboard/views/SupplierIntelligenceView';
import { ToastProvider } from '../components/ui/ToastContext';

const TEST_SUPPLIERS: SupplierItem[] = [
  {
    id: 'sup_tata_steel',
    name: 'Tata Steel Limited',
    plant_location: 'Jamshedpur & Kalinganagar, India',
    supplier_type: 'PRIMARY_MILL',
    contact_person: 'V. K. Mehta (QA & Dispatch)',
    contact_email: 'tc.dispatch@tatasteel.com',
    contact_phone: '+91 657 664 4000',
    typical_grades: ['ASTM A106 Gr. B', 'ASTM A105'],
    rating_grade: 'A',
    total_certs_processed: 142,
    missing_melt_pour_pct: 2.1,
    low_confidence_ocr_pct: 3.5,
    out_of_spec_pct: 0.7,
    avg_turnaround_days: 1.8,
    repeat_defects: [],
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
    typical_grades: ['IS 2062 E250BR', 'ASTM A36'],
    rating_grade: 'C',
    total_certs_processed: 98,
    missing_melt_pour_pct: 28.6,
    low_confidence_ocr_pct: 24.5,
    out_of_spec_pct: 4.1,
    avg_turnaround_days: 4.2,
    repeat_defects: ['Missing ISO 3166 Melt-and-Pour origin line'],
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
    typical_grades: ['ASTM A105', 'ASTM A516 Gr. 70'],
    rating_grade: 'A',
    total_certs_processed: 116,
    missing_melt_pour_pct: 3.4,
    low_confidence_ocr_pct: 4.2,
    out_of_spec_pct: 1.2,
    avg_turnaround_days: 2.1,
    repeat_defects: [],
    trend_monthly_defect_pct: [7.0, 5.5, 4.2, 3.8, 3.4],
    layout_fingerprint: 'jsw_vy_digital_signed_v3',
  },
  {
    id: 'sup_apex_traders',
    name: 'Apex Steel Intermediaries & Stockholders',
    plant_location: 'Strand Road, Kolkata, West Bengal, India',
    supplier_type: 'TRADER_STOCKIST',
    contact_person: 'M. K. Agarwal (Managing Partner)',
    contact_email: 'sales@apexsteelkolkata.com',
    contact_phone: '+91 33 2230 8911',
    typical_grades: ['Commercial Mild Steel'],
    rating_grade: 'D',
    total_certs_processed: 42,
    missing_melt_pour_pct: 52.4,
    low_confidence_ocr_pct: 45.2,
    out_of_spec_pct: 9.5,
    avg_turnaround_days: 6.5,
    repeat_defects: ['Re-typed certificates without Clause 6 original Annex'],
    trend_monthly_defect_pct: [58.0, 56.5, 54.0, 53.2, 52.4],
    layout_fingerprint: 'apex_trader_scan_unstructured',
  },
];

const TEST_TEMPLATES: LearnedTemplate[] = [
  {
    mill_id: 'sup_tata_steel',
    mill_name: 'Tata Steel Limited',
    fingerprint: 'tata_tsj_rev4_bof_cc',
    layout_type: 'PRIMARY_MILL_VECTOR_PDF',
    header_labels: ['TATA STEEL', 'TEST CERTIFICATE', 'EN 10204 3.1'],
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
    header_labels: ['SAIL', 'BOKARO STEEL PLANT'],
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
    header_labels: ['JSW STEEL', 'VIJAYANAGAR'],
    chemistry_table_bbox: { top: 0.35, left: 0.06, width: 0.88, height: 0.2 },
    melt_origin_marker: 'CRUDE STEEL MELTED AND ROLLED AT TORANAGALLU, BELLARY, INDIA',
    confidence_score: 99.1,
    review_time_reduction_pct: 85,
    last_seen: '2026-11-19T09:00:00Z',
  },
];

beforeAll(() => {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    },
    writable: true,
  });

  window.matchMedia =
    window.matchMedia ||
    function (query: string): any {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
});

describe('Prompt P2: Supplier Intelligence View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <SupplierIntelligenceView
          initialSuppliers={TEST_SUPPLIERS}
          initialTemplates={TEST_TEMPLATES}
        />
      </ToastProvider>
    );

  it('renders supplier directory with quality scorecards and rating badges', () => {
    renderComponent();

    expect(screen.getByText(/Supplier & Mill Intelligence/i)).toBeDefined();
    expect(screen.getAllByText(/Tata Steel Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Steel Authority of India Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/JSW Steel Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Apex Steel Intermediaries/i).length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText(/GRADE A · CHECKED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GRADE C · DEFECT PRONE/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GRADE D · HIGH RISK/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters suppliers by search input and rating grade filter buttons', () => {
    renderComponent();

    const gradeDButton = screen.getByRole('button', { name: 'Grade D' });
    fireEvent.click(gradeDButton);

    expect(screen.getAllByText(/Apex Steel Intermediaries/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText(/Tata Steel Limited/i).length).toBe(0);

    const allButton = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allButton);
    expect(screen.getAllByText(/Tata Steel Limited/i).length).toBeGreaterThanOrEqual(1);

    const searchInput = screen.getByPlaceholderText(/Search mills, locations, grades.../i);
    fireEvent.change(searchInput, { target: { value: 'Bokaro' } });
    expect(screen.getAllByText(/Steel Authority of India Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText(/Tata Steel Limited/i).length).toBe(0);
  });

  it('switches to Learned Templates tab and displays deterministic layout fingerprints', () => {
    renderComponent();

    const templatesTab = screen.getByRole('button', { name: /Learned Templates/i });
    fireEvent.click(templatesTab);

    expect(screen.getByText(/Deterministic Layout Fingerprints & OCR Field Maps/i)).toBeDefined();
    expect(screen.getByText('tata_tsj_rev4_bof_cc')).toBeDefined();
    expect(screen.getByText('sail_bsp_dotmatrix_v2')).toBeDefined();
    expect(screen.getByText('jsw_vy_digital_signed_v3')).toBeDefined();
    expect(screen.getByText(/STEEL MELTED AND MANUFACTURED IN INDIA/i)).toBeDefined();
  });

  it('switches to PO Matcher tab and checks weight reconciliation tolerance', () => {
    renderComponent();

    const poTab = screen.getByRole('button', { name: /PO Matcher/i });
    fireEvent.click(poTab);

    expect(screen.getByText(/Purchase Order Weight Reconciler/i)).toBeDefined();

    const reconcileBtn = screen.getByRole('button', { name: /Reconcile Weights/i });
    fireEvent.click(reconcileBtn);

    expect(screen.getByText(/TOLERANCE CHECKED/i)).toBeDefined();

    const receivedInput = screen.getByDisplayValue('25220');
    fireEvent.change(receivedInput, { target: { value: '26000' } });
    fireEvent.click(reconcileBtn);

    expect(screen.getAllByText(/DISCREPANCY FLAGGED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/exceeds ±2% allowable rolling margin/i)).toBeDefined();
  });

  it('opens Ask Supplier to Fix modal and formats WhatsApp & email messages', async () => {
    renderComponent();

    const askButtons = screen.getAllByRole('button', { name: /Ask to Fix/i });
    fireEvent.click(askButtons[0]);

    expect(screen.getByText(/Ask Supplier to Fix:/i)).toBeDefined();
    expect(screen.getByText(/WhatsApp Direct Notice:/i)).toBeDefined();
    expect(screen.getByText(/Formal Email Template:/i)).toBeDefined();

    const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
