import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SharePage } from '../pages/SharePage';
import { ApiService } from '../services/api';

vi.mock('../services/api', () => ({
  ApiService: {
    getPublicDossier: vi.fn(),
    verifyPortalPasscode: vi.fn(),
    submitBuyerAction: vi.fn(),
    getPortalDownloadUrl: vi.fn((token: string, type: string) => `http://127.0.0.1:8000/api/portal/share/${token}/download/${type}`),
  },
}));

const mockDossier = {
  token: 'hl_test_token_12345',
  shipment_id: 'EXP-2026-109',
  exporter_name: 'Howrah Precision Forgings Pvt. Ltd.',
  exporter_country: 'India (IN)',
  destination_port: 'Port of Rotterdam, Netherlands',
  containers: ['CMAU-749102-5', 'MSKU-881290-3'],
  gross_weight_mt: 49.5,
  net_weight_mt: 48.6,
  cn_code: '7307 99 10 (Forged Steel Flanges)',
  compliance_status: 'FULLY_COMPLIANT_2026',
  readiness_score: 100,
  custom_note: 'Customs packet for Rotterdam arrival 24 Nov 2026',
  regulations_attested: [
    'Regulation (EU) 2026/1963',
    'EN 10204:2004 Clause 6',
  ],
  heats: [
    {
      heat_number: 'TSJ-26-9021',
      mill_name: 'Tata Steel Limited (Jamshedpur)',
      melt_country: 'India (IN)',
      crude_steel_process: 'BOF-LF-CC',
      steel_grade: 'ASTM A106 Gr. B',
      cev: 0.408,
      tonnes: 25.2,
      mtc_number: 'MTC-IN-TSJ-26-9021',
      mtc_type: 'EN 10204 Type 3.1',
      chemistry: { C: 0.22, Mn: 0.88, Si: 0.25, P: 0.015, S: 0.01 },
    },
    {
      heat_number: 'JSW-VY-4409',
      mill_name: 'JSW Steel Limited (Vijayanagar)',
      melt_country: 'India (IN)',
      crude_steel_process: 'Corex / BOF-CC',
      steel_grade: 'ASTM A105',
      cev: 0.412,
      tonnes: 23.4,
      mtc_number: 'MTC-IN-JSW-9104',
      mtc_type: 'EN 10204 Type 3.1',
      chemistry: { C: 0.24, Mn: 0.82, Si: 0.28, P: 0.014, S: 0.009 },
    },
  ],
  emissions_summary: {
    specific_embedded_emissions_tco2_per_t: 2.05,
    eu_benchmark_default_tco2_per_t: 3.28,
    verified_actual_route: 'Measured & Verified via EN 10204 3.1 Mill Ledgers',
    emissions_saving_pct: 37.5,
  },
  digital_signature: {
    algorithm: 'Ed25519',
    signer_name: 'A. Banerjee (Lead Metallurgical QA Inspector)',
    signed_at: '2026-11-18T14:22:10Z',
    public_key_fingerprint: 'ed25519_pk_7fa890e12b9044cc',
    annex_a_sha256: '878a3b7525344442f7da79c4501a58619bcbb7b3df6643ac0cfc9a4195155f9f',
    verification_url: '/verify/HL-EXP-2026-109-SEAL',
  },
  downloads: {
    primary_zip_package: '/api/portal/share/hl_test_token_12345/download/zip',
    cbam_data_sheet: '/api/portal/share/hl_test_token_12345/download/cbam',
    dossier_pdf: '/api/portal/share/hl_test_token_12345/download/pdf',
  },
  expires_at: '2026-12-20T12:00:00Z',
};

describe('Buyer & Customs-Broker Share Portal (Prompt P4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders public dossier successfully with shipment and heat details', async () => {
    vi.mocked(ApiService.getPublicDossier).mockResolvedValueOnce({
      valid: true,
      requires_passcode: false,
      dossier: mockDossier,
    });

    render(
      <MemoryRouter initialEntries={['/share/hl_test_token_12345']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify shipment overview renders
    await waitFor(() => {
      expect(screen.getByText('Shipment EXP-2026-109')).toBeDefined();
    });

    expect(screen.getByText('Howrah Precision Forgings Pvt. Ltd.')).toBeDefined();
    expect(screen.getByText('48.600 MT')).toBeDefined();
    expect(screen.getByText('7307 99 10 (Forged Steel Flanges)')).toBeDefined();

    // Verify Heats & Melt-and-Pour Origin table
    expect(screen.getByText('TSJ-26-9021')).toBeDefined();
    expect(screen.getByText('JSW-VY-4409')).toBeDefined();
    expect(screen.getByText('Tata Steel Limited (Jamshedpur)')).toBeDefined();

    // Verify Ed25519 signature
    expect(screen.getByText(/A\. Banerjee/)).toBeDefined();

    // Verify Growth Loop badge
    expect(screen.getByText('Prepared with HeatLedger AI')).toBeDefined();
  });

  it('handles passcode protection and unlocks upon submitting correct passcode', async () => {
    vi.mocked(ApiService.getPublicDossier).mockResolvedValueOnce({
      valid: false,
      requires_passcode: true,
      token: 'hl_protected_99',
      shipment_id: 'EXP-2026-109',
      message: 'This shipment dossier is passcode-protected.',
    });

    vi.mocked(ApiService.verifyPortalPasscode).mockResolvedValueOnce({
      valid: true,
      requires_passcode: false,
      dossier: mockDossier,
    });

    render(
      <MemoryRouter initialEntries={['/share/hl_protected_99']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Passcode Protected Dossier')).toBeDefined();
    });

    const input = screen.getByPlaceholderText('e.g. EuroStahl2026');
    fireEvent.change(input, { target: { value: 'EuroStahl2026' } });

    const unlockBtn = screen.getByRole('button', { name: /Unlock Dossier/i });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(ApiService.verifyPortalPasscode).toHaveBeenCalledWith('hl_protected_99', 'EuroStahl2026');
      expect(screen.getByText('Shipment EXP-2026-109')).toBeDefined();
    });
  });

  it('renders download buttons for ZIP package, CBAM data sheet, and Cover PDF', async () => {
    vi.mocked(ApiService.getPublicDossier).mockResolvedValueOnce({
      valid: true,
      requires_passcode: false,
      dossier: mockDossier,
    });

    render(
      <MemoryRouter initialEntries={['/share/hl_test_token_12345']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Download Package (ZIP)')).toBeDefined();
      expect(screen.getByText('Export XML Data Sheet')).toBeDefined();
      expect(screen.getByText('Download Cover PDF')).toBeDefined();
    });
  });

  it('allows buyer to submit ACCEPT for customs clearance action', async () => {
    vi.mocked(ApiService.getPublicDossier).mockResolvedValueOnce({
      valid: true,
      requires_passcode: false,
      dossier: mockDossier,
    });

    vi.mocked(ApiService.submitBuyerAction).mockResolvedValueOnce({
      status: 'success',
      action_id: 'act_12345',
      action_type: 'ACCEPT',
      message: 'Buyer action recorded',
    });

    render(
      <MemoryRouter initialEntries={['/share/hl_test_token_12345']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Shipment EXP-2026-109')).toBeDefined();
    });

    // Click "Accept for Customs Clearance" button
    const acceptBtns = screen.getAllByRole('button', { name: /Accept for Customs Clearance/i });
    fireEvent.click(acceptBtns[0]);

    // Fill modal form
    const nameInput = screen.getByPlaceholderText('e.g. Hans Gruber (EuroStahl Logistics Rotterdam)');
    fireEvent.change(nameInput, { target: { value: 'Hans Gruber' } });

    const emailInput = screen.getByPlaceholderText('e.g. h.gruber@eurostahl.de');
    fireEvent.change(emailInput, { target: { value: 'h.gruber@eurostahl.de' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Acceptance/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ApiService.submitBuyerAction).toHaveBeenCalledWith('hl_test_token_12345', {
        action_type: 'ACCEPT',
        buyer_name: 'Hans Gruber',
        buyer_email: 'h.gruber@eurostahl.de',
        message: undefined,
      });
      expect(screen.getByText(/Shipment officially approved for EU customs clearance/i)).toBeDefined();
    });
  });
});
