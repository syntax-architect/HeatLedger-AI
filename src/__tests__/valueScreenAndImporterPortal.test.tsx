import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ImporterPortalPage } from '../pages/ImporterPortalPage';
import { ValueScreenSettingsModal } from '../components/dashboard/ValueScreenSettingsModal';

describe('Prompt C6: Value Screen Settings & Money-at-Risk Modal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders editable parameters and transparent owner label', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        demurrage_per_day_inr: 15000,
        default_hold_days: 5,
        quota_safeguard_rate: 0.25,
        cbam_default_markup_rate: 0.10,
        cbam_price_eur_per_tonne: 75.36,
        eur_to_inr_exchange_rate: 90.0,
        reshipping_rejection_pct: 0.08,
        minutes_per_shipment: 45,
        label: 'your estimate',
      }),
    } as any);

    render(
      <ValueScreenSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onParametersUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Value Screen & Money-at-Risk Formula')).toBeDefined();
    expect(screen.getByText(/Owner Transparency Invariant/i)).toBeDefined();
    expect(screen.getByText(/your estimate/i)).toBeDefined();
    expect(screen.getByDisplayValue('15000')).toBeDefined();
    expect(screen.getByDisplayValue('45')).toBeDefined();
  });
});

describe('Prompt C3: Free Importer Portal Page', () => {
  const mockPackPayload = {
    pack: {
      pack_id: 'PACK-TEST-01',
      shipment_id: 'SHP-EU-2026',
      plant_name: 'Howrah Precision Steel Works',
      importer_name: 'Salzgitter Stahl GmbH',
      destination_country: 'DE',
      is_sealed: true,
      seal_hash: 'a1b2c3d4e5f6',
      heats_evidence: [
        {
          heat_number: 'HT-901',
          country_of_melt: 'India',
          country_of_pour: 'India',
          source: 'EN 10204 3.1 MTC',
          status: 'Evidence present',
        },
      ],
    },
    receipt_status: 'PENDING',
    statutory_line: 'This seal shows the file has not changed since sealing. It is not a legal verification.',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads evidence pack without login and allows seal check', async () => {
    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/verify-seal')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            verified: true,
            match: true,
            disclaimer: 'This seal shows the file has not changed since sealing. It is not a legal verification.',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockPackPayload,
      });
    });

    render(
      <MemoryRouter initialEntries={['/importer/portal/valid-token-123']}>
        <Routes>
          <Route path="/importer/portal/:token" element={<ImporterPortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getAllByText('Howrah Precision Steel Works').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('HT-901')).toBeDefined();
    expect(screen.getAllByText('Salzgitter Stahl GmbH').length).toBeGreaterThan(0);
    expect(screen.getByText('Check Seal Integrity')).toBeDefined();

    // Click Check Seal Integrity
    const verifyBtn = screen.getByText('Check Seal Integrity');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Seal Signature Valid/i)).toBeDefined();
    });
  });

  it('displays the supplier invite banner with consent requirement', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPackPayload,
    } as any);

    render(
      <MemoryRouter initialEntries={['/importer/portal/valid-token-123']}>
        <Routes>
          <Route path="/importer/portal/:token" element={<ImporterPortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Do your other suppliers send you packs like this\? Invite them\./i)
      ).toBeDefined();
    });

    const sendBtn = screen.getByText('Send Free Invitation') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true); // Disabled without checkbox consent
  });
});
