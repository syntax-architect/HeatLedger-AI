import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiIntegrationsView } from '../components/dashboard/views/ApiIntegrationsView';
import { api } from '../services/api';

describe('Prompt P11: API, Webhooks & ERP Integrations View', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchApiKeys').mockResolvedValue([
      {
        id: 'key_test_01',
        organization_id: 'org_test',
        name: 'SAP S/4HANA Connector',
        key_prefix: 'hl_live_a1b2...',
        scopes: ['read:shipments', 'read:dossiers'],
        created_at: '2026-04-12T10:00:00Z',
        last_used_at: '2026-04-18T14:32:00Z',
        is_active: true,
      },
    ]);

    vi.spyOn(api, 'fetchWebhooks').mockResolvedValue([
      {
        id: 'wh_test_01',
        target_url: 'https://erp.client.in/webhook',
        secret_masked: 'whsec_8842...',
        events: ['shipment.ready'],
        is_active: true,
        created_at: '2026-04-12T11:00:00Z',
      },
    ]);

    vi.spyOn(api, 'downloadTallyCsv').mockResolvedValue(
      new Blob(['Voucher_Date,Invoice_Number\n2026-04-12,EXP-109'], { type: 'text/csv' })
    );
  });

  it('renders API Keys tab with existing tokens and scopes', async () => {
    render(<ApiIntegrationsView />);
    await waitFor(() => {
      expect(screen.getByText('SAP S/4HANA Connector')).toBeDefined();
      expect(screen.getByText('hl_live_a1b2...')).toBeDefined();
      expect(screen.getByText('read:shipments')).toBeDefined();
    });
  });

  it('switches between API Keys, Webhooks, and Tally ERP tabs', async () => {
    render(<ApiIntegrationsView />);

    // Switch to Webhooks tab
    const webhookTab = screen.getByRole('button', { name: /Webhooks/i });
    fireEvent.click(webhookTab);
    await waitFor(() => {
      expect(screen.getByText('https://erp.client.in/webhook')).toBeDefined();
      expect(screen.getByText('whsec_8842...')).toBeDefined();
    });

    // Switch to Tally & ERP tab
    const erpTab = screen.getByRole('button', { name: /Tally & ERP/i });
    fireEvent.click(erpTab);
    await waitFor(() => {
      expect(screen.getByText(/Tally Prime \/ ERP-9 Compliance Export/i)).toBeDefined();
      expect(screen.getByText(/Download Tally CSV/i)).toBeDefined();
    });
  });

  it('triggers Tally CSV download', async () => {
    render(<ApiIntegrationsView />);
    const erpTab = screen.getByRole('button', { name: /Tally & ERP/i });
    fireEvent.click(erpTab);

    await waitFor(() => {
      expect(screen.getByText(/Download Tally CSV/i)).toBeDefined();
    });

    const downloadBtn = screen.getByText(/Download Tally CSV/i);
    fireEvent.click(downloadBtn);

    expect(api.downloadTallyCsv).toHaveBeenCalled();
  });
});
