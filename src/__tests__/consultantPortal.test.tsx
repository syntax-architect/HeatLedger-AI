import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsultantPortalView } from '../components/dashboard/views/ConsultantPortalView';
import {
  api,
  ConsultantPortfolio,
  AtRiskShipmentCrossClient,
  CrossClientReviewItem,
  WhiteLabelConfig,
  ConsolidatedInvoice,
  ConsultantReferralInfo,
} from '../services/api';
import { ToastProvider } from '../components/ui/ToastContext';
import { AuthProvider } from '../context/AuthContext';

beforeAll(() => {
  const store: Record<string, string> = {
    heatledger_token: 'mock-token',
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
        Object.keys(store).forEach((k) => delete store[k]);
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
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  }

  // Mock navigator.clipboard
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  });

  // Mock window.confirm
  window.confirm = vi.fn().mockReturnValue(true);
});

const mockPortfolio: ConsultantPortfolio = {
  consultant_org_id: 'org_singhania',
  firm_name: 'Singhania Global Advisory',
  contact_email: 'compliance@singhaniaglobal.com',
  referral_code: 'CA-SINGHANIA-2026',
  discount_pct: 15.0,
  commission_pct: 20.0,
  total_clients: 3,
  active_clients: 3,
  total_shipments_monitored: 5,
  at_risk_shipments_count: 2,
  pending_reviews_count: 2,
  monitored_tonnage_mt: 228.3,
  monthly_retainer_inr: 29997.0,
  client_plants: [
    {
      id: 'acc_1',
      plant_id: 'PLANT-HOWRAH-01',
      plant_name: 'Howrah Precision Forgings Pvt Ltd',
      plant_code: 'HPF-01',
      gst_or_pan: '19AABCH4910C1Z2',
      location: 'Howrah, West Bengal',
      granted_role: 'COMPLIANCE_MANAGER',
      status: 'ACTIVE',
      granted_by_user_id: 'usr_howrah_owner',
      expires_at: '2027-04-19T00:00:00Z',
      created_at: '2026-04-19T00:00:00Z',
    },
    {
      id: 'acc_2',
      plant_id: 'PLANT-LUDHIANA-02',
      plant_name: 'Punjab Fasteners & Heavy Works',
      plant_code: 'PFH-02',
      gst_or_pan: '03AACCP8921B1Z8',
      location: 'Ludhiana, Punjab',
      granted_role: 'QA_CONSULTANT',
      status: 'ACTIVE',
      granted_by_user_id: 'usr_ludhiana_owner',
      expires_at: '2027-04-19T00:00:00Z',
      created_at: '2026-04-19T00:00:00Z',
    },
    {
      id: 'acc_3',
      plant_id: 'PLANT-DURGAPUR-03',
      plant_name: 'Mayurbhanj Alloys & Castings Ltd',
      plant_code: 'MAC-03',
      gst_or_pan: '21AAACM7781D1ZQ',
      location: 'Baripada / Durgapur',
      granted_role: 'AUDITOR_READONLY',
      status: 'ACTIVE',
      granted_by_user_id: 'usr_mayurbhanj_owner',
      expires_at: '2027-04-19T00:00:00Z',
      created_at: '2026-04-19T00:00:00Z',
    },
  ],
};

const mockAtRiskShipments: AtRiskShipmentCrossClient[] = [
  {
    id: 'rec_1',
    plant_id: 'PLANT-HOWRAH-01',
    plant_name: 'Howrah Precision Forgings Pvt Ltd',
    plant_code: 'HPF-01',
    entity_type: 'SHIPMENT',
    entity_identifier: 'EXP-2026-HAMBURG-089',
    destination_country: 'Germany (Hamburg Port)',
    importer_name: 'ThyssenKrupp Materials AG',
    readiness_status: 'AT_RISK',
    block_reasons: [
      'Missing melt-and-pour country origin proof',
      'IIW CEV 0.44% exceeds 0.42% max threshold',
    ],
    cbam_due_date: '2026-04-30',
    total_tonnage: 34.8,
    review_status: 'PENDING_REVIEW',
    updated_at: '2026-04-19T09:00:00Z',
  },
  {
    id: 'rec_2',
    plant_id: 'PLANT-LUDHIANA-02',
    plant_name: 'Punjab Fasteners & Heavy Works',
    plant_code: 'PFH-02',
    entity_type: 'SHIPMENT',
    entity_identifier: 'EXP-2026-ANTWERP-104',
    destination_country: 'Belgium (Antwerp)',
    importer_name: 'ArcelorMittal Distribution S.A.',
    readiness_status: 'AT_RISK',
    block_reasons: ['Scrap mass balance deficit: 12.4% unaccounted losses'],
    cbam_due_date: '2026-04-30',
    total_tonnage: 42.5,
    review_status: 'PENDING_REVIEW',
    updated_at: '2026-04-19T09:00:00Z',
  },
];

const mockReviewQueue: CrossClientReviewItem[] = [
  {
    id: 'rev_1',
    plant_id: 'PLANT-HOWRAH-01',
    plant_name: 'Howrah Precision Forgings Pvt Ltd',
    plant_code: 'HPF-01',
    entity_type: 'SHIPMENT',
    entity_identifier: 'EXP-2026-HAMBURG-089',
    destination_country: 'Germany',
    importer_name: 'ThyssenKrupp Materials AG',
    readiness_status: 'AT_RISK',
    cbam_due_date: '2026-04-30',
    total_tonnage: 34.8,
    updated_at: '2026-04-19T09:00:00Z',
  },
  {
    id: 'rev_2',
    plant_id: 'PLANT-LUDHIANA-02',
    plant_name: 'Punjab Fasteners & Heavy Works',
    plant_code: 'PFH-02',
    entity_type: 'MTC',
    entity_identifier: 'MTC-JINDAL-9921',
    destination_country: 'Italy',
    importer_name: 'Marcegaglia S.p.A.',
    readiness_status: 'AT_RISK',
    cbam_due_date: '2026-06-10',
    total_tonnage: 28.0,
    updated_at: '2026-04-19T09:00:00Z',
  },
];

const mockWhiteLabel: WhiteLabelConfig = {
  consultant_org_id: 'org_singhania',
  firm_name: 'Singhania Global Advisory',
  logo_url: 'https://example.com/singhania.png',
  primary_color: '#047857',
  secondary_color: '#065f46',
  custom_domain: 'cbam.singhaniaglobal.com',
  tagline: 'Authorised Customs & CBAM Compliance Auditors',
  show_consultant_brand_on_pdf: true,
  show_consultant_brand_on_portal: true,
  mandatory_verification_footer: 'Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact',
};

const mockInvoice: ConsolidatedInvoice = {
  invoice_number: 'INV-HL-2026-04-49102',
  consultant_org_id: 'org_singhania',
  firm_name: 'Singhania Global Advisory',
  billing_month: '2026-04',
  generated_date: '2026-04-19',
  total_active_plants: 3,
  subtotal_inr: 29997.0,
  gst_18_pct_total_inr: 5399.46,
  gross_amount_inr: 35396.46,
  consultant_commission_pct: 20.0,
  commission_credit_inr: 5999.40,
  net_payable_inr: 29397.06,
  line_items: [
    {
      plant_id: 'PLANT-HOWRAH-01',
      plant_name: 'Howrah Precision Forgings Pvt Ltd',
      plant_code: 'HPF-01',
      service_description: 'HeatLedger AI Multi-Plant Enterprise Compliance Tier',
      monthly_rate_inr: 9999.0,
      gst_18_pct: 1799.82,
      total_inr: 11798.82,
    },
    {
      plant_id: 'PLANT-LUDHIANA-02',
      plant_name: 'Punjab Fasteners & Heavy Works',
      plant_code: 'PFH-02',
      service_description: 'HeatLedger AI Multi-Plant Enterprise Compliance Tier',
      monthly_rate_inr: 9999.0,
      gst_18_pct: 1799.82,
      total_inr: 11798.82,
    },
    {
      plant_id: 'PLANT-DURGAPUR-03',
      plant_name: 'Mayurbhanj Alloys & Castings Ltd',
      plant_code: 'MAC-03',
      service_description: 'HeatLedger AI Multi-Plant Enterprise Compliance Tier',
      monthly_rate_inr: 9999.0,
      gst_18_pct: 1799.82,
      total_inr: 11798.82,
    },
  ],
};

const mockReferrals: ConsultantReferralInfo = {
  referral_code: 'CA-SINGHANIA-2026',
  share_url: 'https://heatledger.ai/signup?ref=CA-SINGHANIA-2026',
  client_discount_pct: 15.0,
  consultant_commission_pct: 20.0,
  active_referred_plants_count: 3,
  monthly_recurring_commission_inr: 5999.40,
  attributed_clients: [
    {
      plant_id: 'PLANT-HOWRAH-01',
      plant_name: 'Howrah Precision Forgings Pvt Ltd',
      status: 'ACTIVE',
      referred_date: '2026-04-19',
      client_discount_applied_pct: 15.0,
      consultant_monthly_credit_inr: 1999.80,
    },
  ],
};

describe('ConsultantPortalView (Prompt P10: Consultant & Multi-Plant Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'fetchConsultantPortfolio').mockResolvedValue(mockPortfolio);
    vi.spyOn(api, 'fetchCrossClientAtRiskShipments').mockResolvedValue(mockAtRiskShipments);
    vi.spyOn(api, 'fetchConsultantAtRiskShipments').mockResolvedValue(mockAtRiskShipments);
    vi.spyOn(api, 'fetchCrossClientReviewQueue').mockResolvedValue(mockReviewQueue);
    vi.spyOn(api, 'fetchConsultantReviewQueue').mockResolvedValue(mockReviewQueue);
    vi.spyOn(api, 'fetchWhiteLabelConfig').mockResolvedValue(mockWhiteLabel);
    vi.spyOn(api, 'updateWhiteLabelConfig').mockResolvedValue({
      ...mockWhiteLabel,
      firm_name: 'Singhania & Co ESG Advisors',
    });
    vi.spyOn(api, 'fetchConsolidatedInvoice').mockResolvedValue(mockInvoice);
    vi.spyOn(api, 'fetchConsultantReferrals').mockResolvedValue(mockReferrals);
    vi.spyOn(api, 'inviteClientPlant').mockResolvedValue({ success: true, plant_id: 'PLANT-AST-01' });
    vi.spyOn(api, 'revokeClientAccess').mockResolvedValue({ success: true, status: 'REVOKED' });
    vi.spyOn(api, 'revokeClientPlantAccess').mockResolvedValue({ success: true, status: 'REVOKED' });
    vi.spyOn(api, 'bulkOnboardClientsFromCsv').mockResolvedValue({
      total_processed: 3,
      successfully_onboarded_count: 3,
      error_count: 0,
    });
    vi.spyOn(api, 'bulkOnboardClientsCsv').mockResolvedValue({
      total_processed: 3,
      successfully_onboarded_count: 3,
      error_count: 0,
    });
  });

  const renderView = () =>
    render(
      <AuthProvider>
        <ToastProvider>
          <ConsultantPortalView />
        </ToastProvider>
      </AuthProvider>
    );

  it('renders consultant headquarters title, RLS badge, and 4 KPI metrics', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Singhania Global Advisory/i)).toBeDefined();
    });

    // RLS Active badge
    expect(screen.getByText(/Multi-Plant RLS Active/i)).toBeDefined();

    // Check KPI cards
    expect(screen.getByText('Active Clients')).toBeDefined();
    expect(screen.getByText('Monitored Volume')).toBeDefined();
    expect(screen.getByText('At-Risk Batches')).toBeDefined();
    expect(screen.getByText('Monthly Retainer')).toBeDefined();
    expect(screen.getByText(/228.3/i)).toBeDefined();
  });

  it('switches client plant context from the top bar dropdown', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByLabelText(/Active Client Plant Switcher/i)).toBeDefined();
    });

    const switcher = screen.getByLabelText(/Active Client Plant Switcher/i) as HTMLSelectElement;
    expect(switcher.value).toBe('ALL');

    // Switch to Howrah
    fireEvent.change(switcher, { target: { value: 'PLANT-HOWRAH-01' } });

    await waitFor(() => {
      expect(api.fetchCrossClientAtRiskShipments).toHaveBeenCalledWith('PLANT-HOWRAH-01');
    });
  });

  it('renders at-risk shipments radar with release gate blockers and filters by query', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cross-Client At-Risk Radar/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cross-Client At-Risk Radar/i }));

    await waitFor(() => {
      expect(screen.getByText('EXP-2026-HAMBURG-089')).toBeDefined();
      expect(screen.getByText('EXP-2026-ANTWERP-104')).toBeDefined();
    });

    // Check blocker messages
    expect(screen.getByText(/Missing melt-and-pour country origin proof/i)).toBeDefined();
    expect(screen.getByText(/Scrap mass balance deficit/i)).toBeDefined();

    // Switch to Client Factories tab where search input is visible
    fireEvent.click(screen.getByRole('button', { name: /Client Factories/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search plant name, code, location/i)).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search plant name, code, location/i);
    fireEvent.change(searchInput, { target: { value: 'Ludhiana' } });

    // Howrah should be filtered out from table
    expect(screen.queryByText('Howrah Precision Forgings Pvt Ltd')).toBeNull();
    // Ludhiana should remain
    expect(screen.getByText('Punjab Fasteners & Heavy Works')).toBeDefined();
  });

  it('renders Client Factories Directory and exercises plant-owned access revocation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Client Factories/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Client Factories/i }));

    await waitFor(() => {
      expect(screen.getByText('Howrah Precision Forgings Pvt Ltd')).toBeDefined();
      expect(screen.getByText('Punjab Fasteners & Heavy Works')).toBeDefined();
      expect(screen.getByText('Mayurbhanj Alloys & Castings Ltd')).toBeDefined();
    });

    // Find and click the revoke button for first active plant
    const revokeButtons = screen.getAllByRole('button', { name: /Revoke Access/i });
    fireEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(api.revokeClientPlantAccess).toHaveBeenCalledWith(
        expect.objectContaining({ plant_id: 'PLANT-HOWRAH-01' })
      );
    });
  });

  it('switches to Cross-Client Review Queue tab and displays pending items', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review Queue/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Review Queue/i }));

    await waitFor(() => {
      expect(screen.getByText('MTC-JINDAL-9921')).toBeDefined();
      expect(screen.getByText(/Marcegaglia/i)).toBeDefined();
    });
  });

  it('switches to White-Label Branding Studio and updates branding with immutable footer', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /White-Label Branding/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /White-Label Branding/i }));

    await waitFor(() => {
      expect(screen.getByText(/White-Label Identity & Portal Styling/i)).toBeDefined();
    });

    // Check live preview card contains mandatory verification footer
    expect(screen.getByText(/Statutory Verification Seal:/i)).toBeDefined();
    expect(screen.getByText(/Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact/i)).toBeDefined();

    // Modify firm name
    const firmInput = screen.getByDisplayValue('Singhania Global Advisory');
    fireEvent.change(firmInput, { target: { value: 'Singhania & Co ESG Advisors' } });

    const saveBtn = screen.getByRole('button', { name: /Save White-Label Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateWhiteLabelConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          firm_name: 'Singhania & Co ESG Advisors',
        })
      );
    });
  });

  it('switches to Invoicing & Partner Referrals tab and copies referral link', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Invoicing & Referrals/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Invoicing & Referrals/i }));

    await waitFor(() => {
      expect(screen.getByText('CA-SINGHANIA-2026')).toBeDefined();
      expect(screen.getByText(/Consolidated Monthly Tax Invoice:/i)).toBeDefined();
    });

    // Click copy referral link button
    const copyBtn = screen.getByTitle(/Copy referral link/i);
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://heatledger.ai/signup?ref=CA-SINGHANIA-2026'
    );
  });

  it('opens Invite Client Plant modal and submits new access grant', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Invite Client Plant/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Invite Client Plant/i }));

    await waitFor(() => {
      expect(screen.getByText('Invite Client Factory')).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText(/e.g. Asansol Steel Tubes Pvt Ltd/i);
    const codeInput = screen.getByPlaceholderText(/e.g. AST-01/i);

    fireEvent.change(nameInput, { target: { value: 'Asansol Steel Tubes Pvt Ltd' } });
    fireEvent.change(codeInput, { target: { value: 'AST-01' } });

    const submitBtn = screen.getByRole('button', { name: /Send Access Grant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.inviteClientPlant).toHaveBeenCalledWith(
        expect.objectContaining({
          plant_id: 'PLANT-AST-01',
          plant_name: 'Asansol Steel Tubes Pvt Ltd',
          plant_code: 'AST-01',
        })
      );
    });
  });

  it('opens Bulk CSV Onboarding modal and processes CSV text', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bulk CSV Onboard/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Bulk CSV Onboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bulk Client Onboarding via CSV/i)).toBeDefined();
    });

    const processBtn = screen.getByRole('button', { name: /Process Bulk Onboarding/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(api.bulkOnboardClientsCsv).toHaveBeenCalled();
    });
  });
});
