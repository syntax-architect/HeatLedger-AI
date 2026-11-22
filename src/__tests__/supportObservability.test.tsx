import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelpButton } from '../components/common/HelpButton';
import { StatusPage } from '../pages/StatusPage';

describe('Prompt R7: Support, Feedback & Error Tracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Help button and opens support options with WhatsApp and Email prefilled links', () => {
    render(<HelpButton screenName="MTCReview" organizationId="org_tata_01" lastRequestId="req_abc123" />);

    const helpTrigger = screen.getByLabelText(/Help and Support/i);
    expect(helpTrigger).toBeDefined();

    // Click to open modal
    fireEvent.click(helpTrigger);

    // Verify WhatsApp link contains org and screen
    const waLink = screen.getByRole('link', { name: /^WhatsApp$/i });
    expect(waLink).toBeDefined();
    expect(waLink.getAttribute('href')).toContain('org_tata_01');
    expect(waLink.getAttribute('href')).toContain('MTCReview');

    // Verify Email link contains subject and request id
    const mailLink = screen.getByRole('link', { name: /^Email Help$/i });
    expect(mailLink).toBeDefined();
    expect(mailLink.getAttribute('href')).toContain('support@heatledger.ai');
    expect(mailLink.getAttribute('href')).toContain('req_abc123');
  });

  it('submits Report a problem ticket attaching screen and request id without document contents', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'created', ticket_id: 'tkt_123' }),
    });
    globalThis.fetch = fetchMock;

    render(<HelpButton screenName="ShipmentRelease" organizationId="org_jsw_02" lastRequestId="req_xyz789" />);
    fireEvent.click(screen.getByLabelText(/Help and Support/i));

    const input = screen.getByPlaceholderText(/What happened\? \(No certificate details needed\)/i);
    fireEvent.change(input, { target: { value: 'Export seal validation button timed out' } });

    const submitBtn = screen.getByRole('button', { name: /Send Problem Report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/support/ticket',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            screen_name: 'ShipmentRelease',
            message: 'Export seal validation button timed out',
            request_id: 'req_xyz789',
          }),
        })
      );
    });
  });

  it('renders StatusPage showing healthy system components', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        api: 'ok',
        database: 'connected',
        extraction_service: 'ready',
        version: '2.0.0',
        regulatory_version: '2026.1',
        timestamp: '2026-11-22T20:00:00Z',
      }),
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText(/All Systems Operational/i)).toBeDefined();
      expect(screen.getByText(/API Gateway/i)).toBeDefined();
      expect(screen.getByText(/Postgres & Storage/i)).toBeDefined();
      expect(screen.getByText(/Extraction Engine/i)).toBeDefined();
    });
  });
});
