import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RegulationRadarView } from '../components/dashboard/views/RegulationRadarView';
import { ApiService } from '../services/api';
import { ToastProvider } from '../components/ui/ToastContext';
import { AuthProvider } from '../context/AuthContext';

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
    function () {
      return {
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };

  if (typeof window.URL.createObjectURL === 'undefined') {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-ics');
  } else {
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-ics');
  }
  if (typeof window.URL.revokeObjectURL === 'undefined') {
    window.URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

const mockRegulations = [
  {
    id: 'reg_eu_cbam_def_2026',
    jurisdiction: 'EU',
    title: 'EU CBAM Definitive Period Operational',
    summary: 'Mandatory quarterly reporting of actual verified embedded emissions without transitional default-only fallback.',
    applies_to_cn: ['7307', '7207', '7214', '7326'],
    applies_to_destinations: ['DE', 'NL', 'BE', 'EU_ALL'],
    effective_date: '2026-01-01',
    deadline_date: '2026-04-30',
    status: 'IN_FORCE',
    legal_act: 'Regulation (EU) 2023/956 Article 36',
    source_url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    last_verified: '2026-11-19',
    severity: 'CRITICAL',
    action_guidance: 'Complete OCR extraction and human confirmation of all Q1 energy bills and Tata/SAIL precursor heats.',
    days_remaining: 162,
    is_past: false,
    is_imminent: false,
    is_urgent: false,
    relevant_to_plant: true,
    calendar_ics_url: '/api/radar/regulations/reg_eu_cbam_def_2026/export.ics',
    google_calendar_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=EU+CBAM',
    disclaimer: 'Sourced from official gazettes. Verify against primary legal texts. HeatLedger is not a legal advisory body.',
  },
  {
    id: 'reg_uk_cbam_def_2027',
    jurisdiction: 'UK',
    title: 'UK CBAM Definitive Start (No Transitional Grace)',
    summary: 'UK Carbon Border Adjustment Mechanism enters into legal force for iron and steel imports.',
    applies_to_cn: ['7307', '7207', '7214', '7326'],
    applies_to_destinations: ['GB', 'UK'],
    effective_date: '2027-01-01',
    deadline_date: '2027-05-31',
    status: 'IN_FORCE',
    legal_act: 'UK Finance Act 2024 & CBAM Consultation Framework',
    source_url: 'https://www.gov.uk/government/consultations/consultation-on-the-introduction-of-a-uk-carbon-border-adjustment-mechanism',
    last_verified: '2026-11-19',
    severity: 'CRITICAL',
    action_guidance: 'Review UK customer contracts and include UK CBAM data sheet annex in container documentation.',
    days_remaining: 408,
    is_past: false,
    is_imminent: false,
    is_urgent: false,
    relevant_to_plant: true,
    calendar_ics_url: '/api/radar/regulations/reg_uk_cbam_def_2027/export.ics',
    google_calendar_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=UK+CBAM',
    disclaimer: 'Sourced from official gazettes. Verify against primary legal texts. HeatLedger is not a legal advisory body.',
  },
  {
    id: 'reg_eu_downstream_prop',
    jurisdiction: 'EU',
    title: 'Proposed Downstream Goods Scope Extension (Proposed, Not Law)',
    summary: 'European Parliament review to extend CBAM to industrial valves (8481) and ball bearings (8482). NOT legally binding today.',
    applies_to_cn: ['8481', '8482', '8483', '8708'],
    applies_to_destinations: ['EU_ALL'],
    effective_date: '2028-01-01',
    deadline_date: null,
    status: 'PROPOSED',
    legal_act: 'European Parliament Draft Review (Non-Binding)',
    source_url: 'https://www.europarl.europa.eu/committees/en/envi/home.html',
    last_verified: '2026-11-19',
    severity: 'INFO',
    action_guidance: 'No active compliance requirement. Keep monitoring updates. Mark as "proposed, not law" on all internal reports.',
    days_remaining: 773,
    is_past: false,
    is_imminent: false,
    is_urgent: false,
    relevant_to_plant: false,
    calendar_ics_url: '/api/radar/regulations/reg_eu_downstream_prop/export.ics',
    google_calendar_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Downstream',
    disclaimer: 'Sourced from official gazettes. Verify against primary legal texts. HeatLedger is not a legal advisory body.',
  },
];

const mockBulletins = [
  {
    id: 'bul_2026_01',
    title: 'Official Default Markup Schedule Confirmed (+10% in 2026, +20% in 2027)',
    summary: 'Commission published Implementing Regulation (EU) 2025/2621 establishing progressive default markups to penalize non-reporting exporters.',
    source_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2621',
    jurisdiction: 'EU',
    published_by: 'Compliance Advisory Desk',
    published_at: '2026-11-19T08:00:00Z',
    tags: ['EU CBAM', 'Markups', 'Implementing Reg 2025/2621'],
  },
];

vi.mock('../services/api', () => ({
  ApiService: {
    fetchRadarRegulations: vi.fn().mockImplementation(() =>
      Promise.resolve({ total_count: mockRegulations.length, relevant_count: 2, regulations: mockRegulations })
    ),
    fetchRadarBulletins: vi.fn().mockImplementation(() =>
      Promise.resolve({ bulletins: mockBulletins })
    ),
    publishRadarBulletin: vi.fn().mockImplementation((payload) =>
      Promise.resolve({ id: 'bul_new_123', ...payload, published_at: new Date().toISOString() })
    ),
    reportRadarError: vi.fn().mockImplementation((payload) =>
      Promise.resolve({ status: 'received', report_id: 'err_test_456', message: 'Received' })
    ),
  },
}));

describe('Prompt P7: Deadline and Regulation Radar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <ToastProvider>
          <RegulationRadarView />
        </ToastProvider>
      </AuthProvider>
    );
  };

  it('renders radar title, verified facts badge, and mandatory disclaimer banner', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Deadline & Regulation Radar/i)).toBeDefined();
    });

    expect(screen.getByText(/Verified Facts Only/i)).toBeDefined();
    expect(screen.getByText(/Statutory Disclaimer:/i)).toBeDefined();
    expect(screen.getByText(/HeatLedger AI is not an accredited legal advisory body/i)).toBeDefined();
  });

  it('renders verified EU and UK statutory regulations with countdowns and guidance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/EU CBAM Definitive Period Operational/i)).toBeDefined();
    });

    expect(screen.getByText(/UK CBAM Definitive Start/i)).toBeDefined();
    const actionHeaders = screen.getAllByText(/What To Do Next:/i);
    expect(actionHeaders.length).toBeGreaterThan(0);
    expect(screen.getByText(/Complete OCR extraction and human confirmation/i)).toBeDefined();
  });

  it('displays published "What Changed" compliance bulletins', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Official Default Markup Schedule Confirmed/i)).toBeDefined();
    });

    expect(screen.getByText(/Implementing Regulation \(EU\) 2025\/2621/i)).toBeDefined();
  });

  it('toggles plant relevance filter to show/hide non-plant products', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/EU CBAM Definitive Period Operational/i)).toBeDefined();
    });

    const plantFilterBtn = screen.getByText(/My Plant's Products Only/i);
    expect(plantFilterBtn).toBeDefined();

    // Initially filtered for plant: proposed downstream (not relevant to plant) is not shown
    expect(screen.queryByText(/Proposed Downstream Goods Scope Extension/i)).toBeNull();

    // Toggle off plant filter: all regulations visible including proposed downstream
    fireEvent.click(plantFilterBtn);
    expect(screen.getByText(/Proposed Downstream Goods Scope Extension/i)).toBeDefined();
    expect(screen.getByText(/Proposed, Not Law/i)).toBeDefined();
  });

  it('filters regulations by jurisdiction (EU vs UK)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/EU CBAM Definitive Period Operational/i)).toBeDefined();
    });

    // Click UK Only filter
    const ukFilterBtn = screen.getByText(/🇬🇧 UK Only/i);
    fireEvent.click(ukFilterBtn);

    expect(screen.getByText(/UK CBAM Definitive Start/i)).toBeDefined();
    expect(screen.queryByText(/EU CBAM Definitive Period Operational/i)).toBeNull();

    // Click EU Only filter
    const euFilterBtn = screen.getByText(/🇪🇺 EU Only/i);
    fireEvent.click(euFilterBtn);

    expect(screen.getByText(/EU CBAM Definitive Period Operational/i)).toBeDefined();
    expect(screen.queryByText(/UK CBAM Definitive Start/i)).toBeNull();
  });

  it('opens and submits "Report Regulatory Discrepancy" modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/EU CBAM Definitive Period Operational/i)).toBeDefined();
    });

    // Click first Report button
    const reportButtons = screen.getAllByRole('button', { name: /Report/i });
    expect(reportButtons.length).toBeGreaterThan(0);
    fireEvent.click(reportButtons[0]);

    expect(screen.getByText(/Report Regulatory Discrepancy/i)).toBeDefined();

    // Fill in textarea
    const issueTextarea = screen.getByPlaceholderText(/e\.g\. In HMRC Notice/i);
    fireEvent.change(issueTextarea, { target: { value: 'In Article 36, the wording was updated.' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Submit Discrepancy/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ApiService.reportRadarError).toHaveBeenCalled();
    });
  });

  it('opens and submits founder "Publish What Changed Note" modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Deadline & Regulation Radar/i)).toBeDefined();
    });

    const publishModalBtn = screen.getByRole('button', { name: /Publish 'What Changed' Note/i });
    fireEvent.click(publishModalBtn);

    expect(screen.getByText(/Broadcast verified legal changes to all connected export plants/i)).toBeDefined();

    // Fill in title, summary, source url
    const titleInput = screen.getByPlaceholderText(/e\.g\. EU Publishes Q2/i);
    fireEvent.change(titleInput, { target: { value: 'New UK CBAM Guidance Document' } });

    const summaryInput = screen.getByPlaceholderText(/Explain the practical consequence clearly/i);
    fireEvent.change(summaryInput, { target: { value: 'HMRC released detailed technical guidance for electric steel.' } });

    const urlInput = screen.getByPlaceholderText(/https:\/\/eur-lex/i);
    fireEvent.change(urlInput, { target: { value: 'https://www.gov.uk/cbam-guidance-2026' } });

    const submitPublishBtn = screen.getByRole('button', { name: /Publish Bulletin/i });
    fireEvent.click(submitPublishBtn);

    await waitFor(() => {
      expect(ApiService.publishRadarBulletin).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New UK CBAM Guidance Document',
        source_url: 'https://www.gov.uk/cbam-guidance-2026',
      }));
    });
  });
});
