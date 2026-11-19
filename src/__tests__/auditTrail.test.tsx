import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditTrailView } from '../components/dashboard/views/AuditTrailView';
import {
  api,
  AuditTrailResponse,
  AuditChainVerificationResponse,
  PlantWorkflowConfig,
  AuditLogRecord,
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
});

const mockVerification: AuditChainVerificationResponse = {
  valid: true,
  total_records: 4,
  chain_broken: false,
  tampered_sequence: null,
  last_verified_sequence: 4,
  last_verified_hash: '9a48fbc91028347eecba19028348912739812739182371928371928371928371',
  verified_at: '2026-04-19T14:30:00Z',
  message: 'Hash-chain unbroken across 4 records',
};

const mockAuditRecords: AuditLogRecord[] = [
  {
    sequence_number: 1,
    organization_id: 'org_test',
    entity_type: 'MTC',
    entity_id: 'MTC-TATA-2026-001',
    action: 'CREATE',
    user_id: 'usr_uploader',
    user_name: 'Priya Sharma (QA Clerk)',
    user_role: 'QA_OPERATOR',
    ip_address: '10.0.0.12',
    timestamp: '2026-04-19T09:00:00Z',
    before_state: '{}',
    after_state: '{"status":"UPLOADED","heat_no":"H49102"}',
    previous_hash: 'GENESIS_ROOT_HEATLEDGER_SHA256_V1',
    record_hash: '1111111111111111111111111111111111111111111111111111111111111111',
  },
  {
    sequence_number: 2,
    organization_id: 'org_test',
    entity_type: 'MTC',
    entity_id: 'MTC-JSW-2026-002',
    action: 'REVIEW',
    user_id: 'usr_reviewer',
    user_name: 'Rajesh Sen',
    user_role: 'QA_INSPECTOR',
    ip_address: '10.0.0.15',
    timestamp: '2026-04-19T09:05:00Z',
    before_state: '{"status":"UPLOADED"}',
    after_state: '{"status":"REVIEWED","carbon":0.18,"cev":0.38}',
    previous_hash: '1111111111111111111111111111111111111111111111111111111111111111',
    record_hash: '2222222222222222222222222222222222222222222222222222222222222222',
  },
  {
    sequence_number: 3,
    organization_id: 'org_test',
    entity_type: 'SHIPMENT',
    entity_id: 'EXP-2026-089',
    action: 'APPROVE',
    user_id: 'usr_approver',
    user_name: 'Vikram Mehta (QA Head)',
    user_role: 'QA_HEAD',
    ip_address: '10.0.0.20',
    timestamp: '2026-04-19T09:15:00Z',
    before_state: '{"status":"REVIEWED"}',
    after_state: '{"status":"APPROVED"}',
    previous_hash: '2222222222222222222222222222222222222222222222222222222222222222',
    record_hash: '3333333333333333333333333333333333333333333333333333333333333333',
  },
];

const mockTrailResponse: AuditTrailResponse = {
  total_count: 3,
  limit: 100,
  offset: 0,
  integrity_verified: true,
  integrity_status: mockVerification,
  records: mockAuditRecords,
};

const mockWorkflowConfig: PlantWorkflowConfig = {
  organization_id: 'org_test',
  small_plant_mode: 0,
  require_separate_reviewer: 1,
  retention_years: 10,
  updated_at: '2026-04-19T10:00:00Z',
};

describe('AuditTrailView (Prompt P9: Tamper-Evident Audit Trail & Maker-Checker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'fetchAuditTrail').mockResolvedValue(mockTrailResponse);
    vi.spyOn(api, 'fetchPlantWorkflowConfig').mockResolvedValue(mockWorkflowConfig);
    vi.spyOn(api, 'fetchAuditNotifications').mockResolvedValue([]);
    vi.spyOn(api, 'verifyAuditChain').mockResolvedValue(mockVerification);
    vi.spyOn(api, 'updatePlantWorkflowConfig').mockResolvedValue({
      ...mockWorkflowConfig,
      small_plant_mode: 1,
    });
    vi.spyOn(api, 'setAuditLegalHold').mockResolvedValue({
      success: true,
      legal_hold_enabled: true,
      audit_record_seq: 4,
    });
    vi.spyOn(api, 'fetchAuditComments').mockResolvedValue([]);
    vi.spyOn(api, 'addAuditComment').mockResolvedValue({
      id: 'cmt_1',
      organization_id: 'org_test',
      entity_type: 'MTC',
      entity_id: 'MTC-TATA-2026-001',
      author_id: 'usr_current',
      author_name: 'Test QA',
      author_role: 'QA_INSPECTOR',
      comment_text: 'Please review carbon % @vikram',
      mentions_json: '["vikram"]',
      created_at: '2026-04-19T11:00:00Z',
    });
    vi.spyOn(api, 'downloadAuditCsv').mockResolvedValue(
      new Blob(['sequence_number,action\n1,CREATE'], { type: 'text/csv' })
    );
    vi.spyOn(api, 'downloadAuditPdf').mockResolvedValue(
      new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' })
    );
  });

  const renderView = () =>
    render(
      <AuthProvider>
        <ToastProvider>
          <AuditTrailView />
        </ToastProvider>
      </AuthProvider>
    );

  it('renders audit ledger title, chain integrity badge, and records', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Approvals & Tamper-Evident Audit Trail/i)).toBeDefined();
    });

    // Check verification status banner
    expect(screen.getByText(/Cryptographic Hash-Chain Integrity: 100% Verified/i)).toBeDefined();
    expect(screen.getByText(/3 append-only entries/i)).toBeDefined();

    // Check records loaded
    expect(screen.getByText('MTC-TATA-2026-001')).toBeDefined();
    expect(screen.getByText('MTC-JSW-2026-002')).toBeDefined();
    expect(screen.getByText('EXP-2026-089')).toBeDefined();
    expect(screen.getByText('Priya Sharma (QA Clerk)')).toBeDefined();
    expect(screen.getByText('Vikram Mehta (QA Head)')).toBeDefined();
  });

  it('performs on-demand cryptographic verification when "Verify Chain Now" is clicked', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Approvals & Tamper-Evident Audit Trail/i)).toBeDefined();
    });

    const verifyBtn = screen.getByRole('button', { name: /Verify Chain Now/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(api.verifyAuditChain).toHaveBeenCalledTimes(1);
    });
  });

  it('filters records by search query', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('MTC-TATA-2026-001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search entity, user, hash/i);
    fireEvent.change(searchInput, { target: { value: 'EXP-2026-089' } });

    // Tata MTC should be filtered out from visible rows
    expect(screen.queryByText('Priya Sharma (QA Clerk)')).toBeNull();
    // Shipment row should be visible
    expect(screen.getByText('EXP-2026-089')).toBeDefined();
  });

  it('opens state diff modal showing before and after JSON states', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('MTC-TATA-2026-001')).toBeDefined();
    });

    // Find and click the diff inspection button for row 2
    const viewDiffButtons = screen.getAllByTitle(/View state delta and diff/i);
    fireEvent.click(viewDiffButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Audit Block #2/i)).toBeDefined();
    });

    expect(screen.getByText(/State Before/i)).toBeDefined();
    expect(screen.getByText(/State After/i)).toBeDefined();
  });

  it('opens Maker-Checker workflow configuration modal and updates small-plant mode', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByTitle(/Configure Maker-Checker rules & small plant mode/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Configure Maker-Checker rules & small plant mode/i));

    await waitFor(() => {
      expect(screen.getByText(/Plant Maker-Checker Rules/i)).toBeDefined();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const smallPlantCheckbox = checkboxes[0] as HTMLInputElement;
    expect(smallPlantCheckbox.checked).toBe(false);

    fireEvent.click(smallPlantCheckbox);
    expect(smallPlantCheckbox.checked).toBe(true);

    const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updatePlantWorkflowConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          small_plant_mode: true,
        })
      );
    });
  });

  it('opens Statutory Legal Hold modal and toggles legal hold with mandatory reason', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByTitle(/Toggle statutory legal hold on plant records/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Toggle statutory legal hold on plant records/i));

    await waitFor(() => {
      expect(screen.getByText(/Statutory Legal-Hold/i)).toBeDefined();
    });

    const reasonInput = screen.getByPlaceholderText(/e.g. European Commission CBAM verifier audit notice/i);
    fireEvent.change(reasonInput, { target: { value: 'DGFT Order #49201' } });

    const applyHoldBtn = screen.getByRole('button', { name: /Activate Legal-Hold/i });
    fireEvent.click(applyHoldBtn);

    await waitFor(() => {
      expect(api.setAuditLegalHold).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: 'GLOBAL_HOLD',
          legal_hold: true,
          reason: 'DGFT Order #49201',
        })
      );
    });
  });

  it('opens comments drawer, posts a comment with mention, and refreshes comments', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('MTC-TATA-2026-001')).toBeDefined();
    });

    const commentButtons = screen.getAllByTitle(/View comments & mentions/i);
    fireEvent.click(commentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Audit Notes: MTC-TATA-2026-001/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Write audit note or @mention colleague/i);
    fireEvent.change(input, { target: { value: 'Please review carbon % @vikram' } });

    // The post button contains the Send icon
    const postBtns = screen.getAllByRole('button');
    const sendBtn = postBtns[postBtns.length - 1]; // Last button in drawer
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.addAuditComment).toHaveBeenCalledWith(
        expect.objectContaining({
          comment_text: 'Please review carbon % @vikram',
        })
      );
    });
  });

  it('triggers CSV and PDF export downloads', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByTitle(/Download CSV audit ledger/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Download CSV audit ledger/i));
    await waitFor(() => {
      expect(api.downloadAuditCsv).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTitle(/Download verified A4 audit attestation certificate/i));
    await waitFor(() => {
      expect(api.downloadAuditPdf).toHaveBeenCalled();
    });
  });
});
