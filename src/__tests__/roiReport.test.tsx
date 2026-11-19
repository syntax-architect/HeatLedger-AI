import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoiReportView } from '../components/dashboard/views/RoiReportView';
import { RoiPublicSharePage } from '../pages/RoiPublicSharePage';
import { api, MonthlyRoiReport, AnnualRoiView } from '../services/api';
import { ToastProvider } from '../components/ui/ToastContext';
import { AuthProvider } from '../context/AuthContext';

// Mock API responses
const mockMonthlyReport: MonthlyRoiReport = {
  organization_id: 'org_howrah_steel_01',
  plant_name: 'Howrah Precision Forgings Pvt. Ltd.',
  month_period: '2026-01',
  baseline_minutes_per_cert: 45.0,
  qa_hourly_rate_inr: 550.0,
  measured_review_minutes_per_cert: 3.2,
  certificates_processed: 142,
  total_fields_extracted: 4100,
  fields_auto_extracted: 3976,
  fields_manually_corrected: 124,
  extraction_accuracy_pct: 97.0,
  hours_saved: 98.9,
  hours_saved_value_inr: 54395.0,
  formula_hours_saved:
    '(45.0m manual baseline - 3.2m measured AI review) × 142 certs ÷ 60 = 98.9 hours saved',
  shipments_released: 18,
  shipment_tonnes_released: 441.0,
  blocks_caught_count: 8,
  blocks_breakdown: {
    MISSING_MELT_POUR_ORIGIN: 4,
    CARBON_EQUIVALENT_CEV_EXCEEDED: 2,
    MASS_BALANCE_HEAT_DEFICIT: 1,
    UNVERIFIED_PRECURSOR_SEE: 1,
  },
  supplier_corrections_sent: 6,
  dossiers_delivered: 18,
  buyer_portal_views: 34,
  buyer_acceptances: 17,
  estimated_cbam_savings_eur: 24680.0,
  estimated_cbam_savings_inr: 2233540.0,
  cbam_disclaimer: 'Estimate for planning',
  monthly_subscription_cost_inr: 9999.0,
  total_value_inr: 2287935.0,
  roi_multiple: 228.8,
  generated_at: '2026-01-31T12:00:00Z',
};

const mockAnnualView: AnnualRoiView = {
  year: 2026,
  organization_id: 'org_howrah_steel_01',
  total_certificates_processed: 142,
  total_shipments_released: 18,
  total_tonnage_released: 441.0,
  total_blocks_prevented: 8,
  total_hours_saved: 98.9,
  hours_saved_formula: '(45.0m baseline - 3.2m avg review) × 142 certs ÷ 60 = 98.9 hours',
  total_estimated_cbam_duty_avoided_eur: 24680.0,
  total_estimated_cbam_duty_avoided_inr: 2233540.0,
  planning_label: 'Estimate for planning',
  msme_subsidy_application_data: {
    enterprise_name: 'Howrah Precision Forgings Pvt. Ltd.',
    enterprise_category: 'Medium Manufacturing Enterprise (UDYAM-WB-08-0044910)',
    subsidized_software_scheme: 'Central MSME Clean Technology & Digital Compliance Grant (90% Scheme)',
    expenditure_incurred_inr: 119988.0,
    claimable_subsidy_amount_inr: 107989.2,
    technical_deliverables: 'Deterministic EN 10204 3.1 & CBAM Verification Operating System',
    compliance_accreditations: [
      'EN 10204:2004 Clause 6',
      'Regulation (EU) 2023/956',
      'UK CBAM Finance Act 2024',
    ],
  },
};

describe('Prompt P8: ROI & Proof-of-Value Report Engine', () => {
  beforeAll(() => {
    const store: Record<string, string> = {
      heatledger_token: 'mock-jwt-token',
    };
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
      ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  beforeEach(() => {
    vi.spyOn(api, 'fetchMonthlyRoiReport').mockResolvedValue(mockMonthlyReport);
    vi.spyOn(api, 'fetchAnnualRoiView').mockResolvedValue(mockAnnualView);
    vi.spyOn(api, 'updatePlantRoiConfig').mockResolvedValue({
      status: 'success',
      baseline_minutes: 50.0,
      hourly_rate: 600.0,
    });
    vi.spyOn(api, 'downloadRoiPdfReport').mockResolvedValue(
      new Blob(['%PDF-mock'], { type: 'application/pdf' })
    );
    vi.spyOn(api, 'createRoiShareLink').mockResolvedValue({
      token: 'roi_test123',
      share_url: '/roi/share/roi_test123',
      period: '2026-01',
      created_at: '2026-01-31T12:00:00Z',
    });
    vi.spyOn(api, 'fetchRoiEmailDigest').mockResolvedValue({
      subject: 'HeatLedger AI: Monthly ROI & Value Digest (2026-01)',
      plain: 'HeatLedger AI Monthly Proof-of-Value Summary\nHours Saved: 98.9 hrs',
      html: '<p>Hours Saved: 98.9 hrs</p>',
    });
  });

  it('renders executive 4-KPI banner and derived mathematical formulas', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/ROI & Proof-of-Value Report/i)).toBeDefined();
    });

    // 4 Primary KPI cards
    expect(screen.getByText('98.9')).toBeDefined(); // Hours saved
    expect(screen.getByText('8')).toBeDefined(); // Blocks caught
    expect(screen.getByText('€24,680')).toBeDefined(); // CBAM savings
    expect(screen.getByText(/228.8x/i)).toBeDefined(); // ROI Multiple

    // Mathematical formula trace
    expect(screen.getByText(/Exact Mathematical Derivation/i)).toBeDefined();
    expect(screen.getByText(/measured AI review/i)).toBeDefined();

    // Release gate blocks breakdown
    expect(screen.getByText(/missing melt pour origin/i)).toBeDefined();
    expect(screen.getByText(/carbon equivalent cev exceeded/i)).toBeDefined();
  });

  it('handles baseline sliders and calls updatePlantRoiConfig on save', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Time Reclaimed/i)).toBeDefined();
      expect(screen.getByText(/Manage Baseline Calibration/i)).toBeDefined();
    });

    // Sliders
    const baselineSlider = screen.getByLabelText(/Manual Baseline Duration/i);
    expect(baselineSlider).toBeDefined();

    fireEvent.change(baselineSlider, { target: { value: '55' } });

    // Save as Plant Default button
    const saveBtn = screen.getByText(/Save as Plant Default/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updatePlantRoiConfig).toHaveBeenCalledWith({
        manual_baseline_minutes: 55,
        qa_hourly_rate_inr: 550,
      });
    });
  });

  it('downloads executive one-page A4 PDF memorandum', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Download 1-Page PDF/i)).toBeDefined();
    });

    const downloadBtn = screen.getByText(/Download 1-Page PDF/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadRoiPdfReport).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('generates shareable public link for plant owner & board', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Share Board Link/i)).toBeDefined();
    });

    const shareBtn = screen.getByText(/Share Board Link/i);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(api.createRoiShareLink).toHaveBeenCalledWith({ month_period: '2026-01' });
      expect(screen.getByText(/Public Board Share Link/i)).toBeDefined();
      expect(screen.getByDisplayValue(/roi\/share\/roi_test123/i)).toBeDefined();
    });
  });

  it('opens monthly email digest preview drawer and toggles plain/HTML', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Email Digest/i)).toBeDefined();
    });

    const emailBtn = screen.getByText(/Email Digest/i);
    fireEvent.click(emailBtn);

    await waitFor(() => {
      expect(screen.getByText(/Monthly Proof-of-Value Email Digest/i)).toBeDefined();
      expect(screen.getByText(/Subject: HeatLedger AI: Monthly ROI/i)).toBeDefined();
    });

    // Toggle to HTML preview
    const htmlTab = screen.getByText('HTML Preview');
    fireEvent.click(htmlTab);
    expect(screen.getByText(/HTML Preview/i)).toBeDefined();
  });

  it('switches to Annual & MSME Subsidy view displaying 90% claimable grant', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RoiReportView />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Time Reclaimed/i)).toBeDefined();
      expect(screen.getByText(/Annual & MSME Subsidy/i)).toBeDefined();
    });

    const annualTab = screen.getByText(/Annual & MSME Subsidy/i);
    fireEvent.click(annualTab);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Central MSME Clean Technology & Digital Compliance Grant/i).length
      ).toBeGreaterThan(0);
      expect(screen.getByText(/Net Claimable Grant: ₹1,07,989/i)).toBeDefined();
      expect(screen.getByText(/EN 10204:2004 Clause 6/i)).toBeDefined();
      expect(screen.getByText(/Regulation \(EU\) 2023\/956/i)).toBeDefined();
    });
  });

  it('renders read-only public board report for tokenized URL', async () => {
    vi.spyOn(api, 'fetchPublicRoiReport').mockResolvedValue(mockMonthlyReport);

    render(
      <MemoryRouter initialEntries={['/roi/share/roi_test123']}>
        <Routes>
          <Route path="/roi/share/:token" element={<RoiPublicSharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.fetchPublicRoiReport).toHaveBeenCalledWith('roi_test123');
      expect(screen.getByText(/Howrah Precision Forgings Pvt. Ltd./i)).toBeDefined();
      expect(screen.getByText(/EXECUTIVE BOARD REPORT/i)).toBeDefined();
      expect(screen.getByText(/Verified Read-Only/i)).toBeDefined();
      expect(screen.getByText('98.9')).toBeDefined();
    });
  });
});
