import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminConsolePage } from '../pages/AdminConsolePage';
import { api } from '../services/api';

describe('Prompt B10: Super-Admin Console & Background Queue', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchAdminMetrics').mockResolvedValue({
      platform_version: '2.0.0-PROD',
      active_pilot_organizations: 8,
      total_documents_processed: 1420,
      average_gemini_ocr_cost_per_page_usd: 0.00045,
      total_ai_spend_usd: 12.85,
      ai_monthly_spend_cap_usd: 100.0,
      spend_cap_utilization_pct: 12.85,
      queue_health: { queued: 2, running: 1, completed: 50, failed: 1, dead_letter: 0 },
      tenants: [
        { org_id: 'org_howrah_01', name: 'Howrah Precision Forgings', plan: 'PILOT', documents: 142, spend_usd: 1.28, status: 'ACTIVE' },
      ],
      feature_flags: {
        ocr_processing_enabled: true,
        whatsapp_ingestion_enabled: true,
        cbam_calculation_enabled: true,
        external_webhooks_enabled: true,
        maintenance_mode: false,
      },
    });

    vi.spyOn(api, 'fetchAdminJobs').mockResolvedValue({
      jobs: [
        {
          id: 'job_ocr_9912',
          organization_id: 'org_howrah_01',
          job_name: 'ocr_extraction_task',
          status: 'FAILED',
          payload: { doc_id: 'MTC-9921' },
          retries: 1,
          max_retries: 3,
          created_at: '2026-04-18T10:15:00Z',
          updated_at: '2026-04-18T10:15:04Z',
        },
      ],
    });

    vi.spyOn(api, 'retryAdminJob').mockResolvedValue({ status: 'RETRY_QUEUED' });
    vi.spyOn(api, 'toggleKillSwitch').mockResolvedValue({ flag: 'whatsapp_ingestion_enabled', enabled: false });
  });

  it('renders Super-Admin title, metrics cards, and active pilot tenants', async () => {
    render(
      <BrowserRouter>
        <AdminConsolePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Super-Admin Console')).toBeDefined();
      expect(screen.getByText('STAFF ONLY')).toBeDefined();
      expect(screen.getByText('Howrah Precision Forgings')).toBeDefined();
      expect(screen.getByText('1,420')).toBeDefined();
    });
  });

  it('renders background task queue and displays failed job with retry button', async () => {
    render(
      <BrowserRouter>
        <AdminConsolePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ocr_extraction_task')).toBeDefined();
      expect(screen.getAllByText('FAILED').length).toBeGreaterThanOrEqual(1);
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    expect(api.retryAdminJob).toHaveBeenCalledWith('job_ocr_9912');
  });
});
