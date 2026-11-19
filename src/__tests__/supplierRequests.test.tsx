import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SupplierDataRequestsTracker } from '../components/dashboard/views/SupplierDataRequestsTracker';
import { SupplierRequestPage } from '../pages/SupplierRequestPage';
import { ApiService } from '../services/api';

vi.mock('../services/api', () => ({
  ApiService: {
    listSupplierRequests: vi.fn(),
    createSupplierRequest: vi.fn(),
    getSupplierRequestDetail: vi.fn(),
    sendSupplierReminder: vi.fn(),
    reviewSupplierRequest: vi.fn(),
    listVersionedPrecursors: vi.fn(),
    getPublicSupplierForm: vi.fn(),
    savePublicSupplierDraft: vi.fn(),
    uploadSupplierEvidence: vi.fn(),
    submitPublicSupplierData: vi.fn(),
  },
}));

const mockRequests = [
  {
    id: 'req_demo_tata_01',
    token: 'sreq_tata_2026_q1',
    supplier_id: 'sup_tata_01',
    supplier_name: 'Tata Steel Limited (Jamshedpur)',
    product_name: 'Continuously Cast Prime Billets (150x150 mm)',
    cn_code: '7207 11 00',
    reporting_period: '2026-Q1',
    deadline: '2026-12-15',
    due_date: '2026-12-15',
    status: 'IN_REVIEW',
    data_needed: ['production_route', 'precursor_emissions_tco2_per_t'],
    requested_fields: ['production_route', 'precursor_emissions_tco2_per_t'],
    public_url: '/supplier-request/sreq_tata_2026_q1',
    created_at: '2026-11-18T10:00:00Z',
    submitter_name: 'Dr. P. Sen',
    submitted_at: '2026-11-18T16:00:00Z',
    precursor_emissions_tco2_per_t: 1.825,
    evidence_file_name: 'Tata_Steel_Jamshedpur_Precursor_CBAM_2026Q1.xlsx',
  },
  {
    id: 'req_demo_sail_02',
    token: 'sreq_sail_2026_overdue',
    supplier_id: 'sup_sail_02',
    supplier_name: 'Steel Authority of India Limited (Durgapur)',
    product_name: 'Hot Rolled Steel Rounds (Dia 80mm)',
    cn_code: '7214 99 10',
    reporting_period: '2026-Q1',
    deadline: '2026-11-10',
    due_date: '2026-11-10',
    status: 'OVERDUE',
    data_needed: ['production_route'],
    requested_fields: ['production_route'],
    public_url: '/supplier-request/sreq_sail_2026_overdue',
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'req_demo_jsw_03',
    token: 'sreq_jsw_2026_accepted',
    supplier_id: 'sup_jsw_03',
    supplier_name: 'JSW Steel Limited (Vijayanagar)',
    product_name: 'Carbon Steel Blooms & Billets',
    cn_code: '7207 11 00',
    reporting_period: '2025-Annual',
    deadline: '2026-12-30',
    due_date: '2026-12-30',
    status: 'ACCEPTED',
    data_needed: ['production_route', 'precursor_emissions_tco2_per_t'],
    requested_fields: ['production_route', 'precursor_emissions_tco2_per_t'],
    public_url: '/supplier-request/sreq_jsw_2026_accepted',
    created_at: '2026-11-05T10:00:00Z',
    precursor_record_id: 'prec_jsw_2025_01',
    precursor_version: 1,
  },
];

const mockCounts = {
  REQUESTED: 1,
  REMINDED: 1,
  RECEIVED: 1,
  IN_REVIEW: 1,
  ACCEPTED: 1,
  OVERDUE: 1,
  RETURNED: 0,
  TOTAL: 3,
};

describe('Supplier CBAM Precursor Data Requests (Prompt P5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tracker Board (SupplierDataRequestsTracker)', () => {
    it('renders tracker board with pipeline summary counts and request items', async () => {
      vi.mocked(ApiService.listSupplierRequests).mockResolvedValueOnce({
        counts: mockCounts,
        requests: mockRequests,
      });

      render(
        <MemoryRouter>
          <SupplierDataRequestsTracker />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Supplier CBAM Precursor Tracker Board')).toBeDefined();
        expect(screen.getByText('Tata Steel Limited (Jamshedpur)')).toBeDefined();
        expect(screen.getByText('Steel Authority of India Limited (Durgapur)')).toBeDefined();
        expect(screen.getByText('JSW Steel Limited (Vijayanagar)')).toBeDefined();
      }, { timeout: 4000 });

      // Check status chips
      expect(screen.getByText('IN REVIEW')).toBeDefined();
      expect(screen.getByText('OVERDUE')).toBeDefined();
      expect(screen.getByText('ACCEPTED · LINKED')).toBeDefined();
    });

    it('opens New Request modal and generates link upon submission', async () => {
      vi.mocked(ApiService.listSupplierRequests).mockResolvedValue({
        counts: mockCounts,
        requests: mockRequests,
      });

      vi.mocked(ApiService.createSupplierRequest).mockResolvedValueOnce({
        id: 'req_new_01',
        token: 'sreq_new_token_88',
        public_url: '/supplier-request/sreq_new_token_88',
        product_name: 'Continuously Cast Billets (150x150 mm)',
        whatsapp_invitation: 'Please submit the CBAM precursor emissions data...',
      });

      render(
        <MemoryRouter>
          <SupplierDataRequestsTracker />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Supplier Request')).toBeDefined();
      });

      fireEvent.click(screen.getByText('New Supplier Request'));

      expect(screen.getByText('New Supplier CBAM Data Request')).toBeDefined();

      const createBtn = screen.getByRole('button', { name: /Create & Generate Link/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(ApiService.createSupplierRequest).toHaveBeenCalled();
        expect(screen.getByText('Secure Request Link Generated')).toBeDefined();
      });
    });

    it('opens Review modal and accepts submission, linking to heats', async () => {
      vi.mocked(ApiService.listSupplierRequests).mockResolvedValue({
        counts: mockCounts,
        requests: mockRequests,
      });

      vi.mocked(ApiService.reviewSupplierRequest).mockResolvedValueOnce({
        status: 'success',
        action: 'Accepted',
        request_status: 'ACCEPTED',
        precursor_record_id: 'prec_new_01',
      });

      // Spy on alert to avoid jsdom alert error
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <MemoryRouter>
          <SupplierDataRequestsTracker />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Review')).toBeDefined();
      });

      // Click Review on Tata Steel
      fireEvent.click(screen.getByText('Review'));

      expect(screen.getByText('Review Precursor Data Submission')).toBeDefined();
      expect(screen.getByText('✓ Accept & Link to Heats')).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: /Confirm Acceptance/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(ApiService.reviewSupplierRequest).toHaveBeenCalledWith('req_demo_tata_01', {
          action: 'Accepted',
          comment: 'Precursor verified against third-party mill statement.',
          linked_heats: ['TSJ-26-9021', 'TSJ-26-9022'],
        });
      });
    });
  });

  describe('Public Mobile Supplier Form (SupplierRequestPage)', () => {
    const mockFormMeta = {
      valid: true,
      token: 'sreq_tata_2026_q1',
      request_id: 'req_demo_tata_01',
      exporter_name: 'Howrah Precision Forgings Pvt. Ltd.',
      supplier_name: 'Tata Steel Limited (Jamshedpur)',
      product_name: 'Continuously Cast Prime Billets (150x150 mm)',
      cn_code: '7207 11 00',
      reporting_period: '2026-Q1',
      due_date: '2026-12-15',
      deadline: '2026-12-15',
      status: 'REQUESTED',
      data_needed: ['production_route', 'precursor_emissions_tco2_per_t'],
      requested_fields: ['production_route', 'precursor_emissions_tco2_per_t'],
      field_guidance: {
        production_route: 'Choose Primary BF-BOF, DRI-EAF, or 100% Scrap EAF route.',
      },
    };

    it('renders public form with operational inputs and units', async () => {
      vi.mocked(ApiService.getPublicSupplierForm).mockResolvedValueOnce(mockFormMeta);

      render(
        <MemoryRouter initialEntries={['/supplier-request/sreq_tata_2026_q1']}>
          <Routes>
            <Route path="/supplier-request/:token" element={<SupplierRequestPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Continuously Cast Prime Billets (150x150 mm)')).toBeDefined();
      });

      expect(screen.getByText('1. Production Route & Primary Fuel')).toBeDefined();
      expect(screen.getByText('2. Electricity & Specific Embedded Emissions')).toBeDefined();
      expect(screen.getByText('Save Draft')).toBeDefined();
      expect(screen.getByText('Submit Precursor Declaration')).toBeDefined();
    });

    it('allows supplier to save draft without full required fields', async () => {
      vi.mocked(ApiService.getPublicSupplierForm).mockResolvedValueOnce(mockFormMeta);
      vi.mocked(ApiService.savePublicSupplierDraft).mockResolvedValueOnce({
        status: 'success',
        message: 'Draft auto-saved successfully.',
      });

      render(
        <MemoryRouter initialEntries={['/supplier-request/sreq_tata_2026_q1']}>
          <Routes>
            <Route path="/supplier-request/:token" element={<SupplierRequestPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Save Draft')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Save Draft'));

      await waitFor(() => {
        expect(ApiService.savePublicSupplierDraft).toHaveBeenCalled();
        expect(screen.getByText(/Draft auto-saved successfully/i)).toBeDefined();
      });
    });

    it('submits final precursor declaration and renders confirmation receipt', async () => {
      vi.mocked(ApiService.getPublicSupplierForm).mockResolvedValueOnce(mockFormMeta);
      vi.mocked(ApiService.submitPublicSupplierData).mockResolvedValueOnce({
        status: 'success',
        submission_id: 'sub_rec_99',
        message: 'Precursor emissions declaration submitted',
      });

      render(
        <MemoryRouter initialEntries={['/supplier-request/sreq_tata_2026_q1']}>
          <Routes>
            <Route path="/supplier-request/:token" element={<SupplierRequestPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submit Precursor Declaration')).toBeDefined();
      });

      // Fill submitter identity
      const nameInput = screen.getByPlaceholderText('e.g. Dr. P. Sen');
      fireEvent.change(nameInput, { target: { value: 'Dr. P. Sen' } });

      const emailInput = screen.getByPlaceholderText('e.g. p.sen@tatasteel.com');
      fireEvent.change(emailInput, { target: { value: 'p.sen@tatasteel.com' } });

      const desigInput = screen.getByPlaceholderText('e.g. Head of Decarbonization & Energy');
      fireEvent.change(desigInput, { target: { value: 'Head of Quality' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Precursor Declaration/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(ApiService.submitPublicSupplierData).toHaveBeenCalled();
        expect(screen.getByText('Precursor Declaration Received')).toBeDefined();
      });
    });
  });
});
