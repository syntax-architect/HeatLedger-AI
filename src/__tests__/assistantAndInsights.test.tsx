import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { InsightsTrendsView } from '../components/dashboard/views/InsightsTrendsView';
import { AssistantBottomSheet } from '../components/dashboard/AssistantBottomSheet';
import {
  api,
  EmissionsTrendData,
  CbamForecastData,
  MillBenchmarkingData,
  InventoryGradeDistribution,
  AssistantChatResponse,
  AssistantUsageInfo,
} from '../services/api';

const mockEmissionsTrend: EmissionsTrendData = {
  date_range: '90d',
  organization_id: 'org_howrah_steel_01',
  summary: {
    total_tonnes_shipped: 1405,
    avg_primary_see: 2.12,
    eu_default_benchmark: 2.85,
    cumulative_savings_inr: 2840000,
    performance_label: 'Low Carbon Performance',
  },
  series: [
    {
      period: '2025-11',
      label: 'Nov 2025',
      primary_see: 2.14,
      eu_benchmark_default: 2.85,
      markup_pct: 10,
      default_with_markup: 3.135,
      tonnes_shipped: 142.5,
      savings_eur: 25600,
      savings_inr: 2334720,
    },
    {
      period: '2025-12',
      label: 'Dec 2025',
      primary_see: 2.1,
      eu_benchmark_default: 2.85,
      markup_pct: 10,
      default_with_markup: 3.135,
      tonnes_shipped: 185.0,
      savings_eur: 33300,
      savings_inr: 3036960,
    },
    {
      period: '2026-01',
      label: 'Jan 2026',
      primary_see: 2.05,
      eu_benchmark_default: 2.92,
      markup_pct: 10,
      default_with_markup: 3.212,
      tonnes_shipped: 220.0,
      savings_eur: 41800,
      savings_inr: 3812160,
    },
  ],
  table_data: [],
};

const mockForecast: CbamForecastData = {
  organization_id: 'org_howrah_steel_01',
  ets_benchmark_price_eur: 75.36,
  inr_per_eur: 91.2,
  total_5yr_savings_inr: 28400000,
  total_5yr_savings_eur: 311400,
  projections: [
    {
      year: 2026,
      statutory_markup_pct: 10,
      annual_export_tonnes: 1200,
      default_liability_eur: 257500,
      primary_liability_eur: 169600,
      avoided_markup_savings_eur: 87900,
      avoided_markup_savings_inr: 8016480,
      status: 'Statutory 10% Default Markup',
    },
    {
      year: 2027,
      statutory_markup_pct: 20,
      annual_export_tonnes: 1400,
      default_liability_eur: 360000,
      primary_liability_eur: 220000,
      avoided_markup_savings_eur: 140000,
      avoided_markup_savings_inr: 12768000,
      status: 'Statutory 20% Default Markup',
    },
  ],
  statutory_basis: 'EU Implementing Regulation 2025/2621',
};

const mockBenchmarks: MillBenchmarkingData = {
  organization_id: 'org_howrah_steel_01',
  mill_count: 2,
  preferred_mill: 'Tata Steel (Jamshedpur)',
  mills: [
    {
      mill_name: 'Tata Steel (Jamshedpur)',
      short_name: 'Tata Steel',
      avg_precursor_see: 2.05,
      melt_and_pour_pass_rate_pct: 100.0,
      total_heats_received: 28,
      verified_tonnes: 450.0,
      compliance_tier: 'PREFERRED',
      color: 'emerald',
    },
    {
      mill_name: 'SAIL (Durgapur Steel Plant)',
      short_name: 'SAIL Durgapur',
      avg_precursor_see: 2.22,
      melt_and_pour_pass_rate_pct: 92.0,
      total_heats_received: 19,
      verified_tonnes: 320.0,
      compliance_tier: 'VERIFIED',
      color: 'blue',
    },
  ],
};

const mockInventoryGrades: InventoryGradeDistribution = {
  organization_id: 'org_howrah_steel_01',
  total_active_grades: 2,
  grades: [
    { grade: 'SS 316L', tonnes_available: 45.0, tonnes_allocated: 139.5, pct_of_total: 41.5 },
    { grade: 'S355J2', tonnes_available: 62.0, tonnes_allocated: 198.0, pct_of_total: 58.5 },
  ],
};

const mockUsage: AssistantUsageInfo = {
  organization_id: 'org_howrah_steel_01',
  monthly_token_cap: 50000,
  tokens_used: 7500,
  tokens_remaining: 42500,
  cap_exceeded: false,
  powered_by: 'HeatLedger Deterministic RAG',
};

const mockChatResponse: AssistantChatResponse = {
  answer: 'Found 2 heats matching SS 316L with melt & pour in Durgapur, West Bengal. Heat HT-2026-4401 has verified specific embedded emissions of 2.04 tCO2e/t.',
  cited_records: [
    { type: 'heat', id: 'HT-2026-4401', heat_number: 'HT-2026-4401', title: 'Heat HT-2026-4401 (SS 316L)' },
  ],
  tools_used: ['query_heats'],
  refusal: false,
  tokens_used: 480,
  powered_by: 'HeatLedger Deterministic RAG',
};

beforeAll(() => {
  // Polyfill scrollIntoView for jsdom
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('Prompt P12: Insights & Trends View', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getEmissionsTrend').mockResolvedValue(mockEmissionsTrend);
    vi.spyOn(api, 'getCbamForecast').mockResolvedValue(mockForecast);
    vi.spyOn(api, 'getMillBenchmarking').mockResolvedValue(mockBenchmarks);
    vi.spyOn(api, 'getInventoryGrades').mockResolvedValue(mockInventoryGrades);
    vi.spyOn(api, 'exportAnalyticsCsv').mockResolvedValue(new Blob(['test,csv'], { type: 'text/csv' }));
  });

  it('renders all key analytics summary KPIs correctly', async () => {
    render(
      <BrowserRouter>
        <InsightsTrendsView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Insights & Long-Term Trends')).toBeDefined();
      expect(screen.getByText('2.12')).toBeDefined();
      expect(screen.getAllByText('Tata Steel (Jamshedpur)').length).toBeGreaterThan(0);
    });
  });

  it('allows toggling between Chart and Table view for Emissions Trend', async () => {
    render(
      <BrowserRouter>
        <InsightsTrendsView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Monthly Specific Embedded Emissions/i)).toBeDefined();
    });

    const tableToggleBtn = screen.getByRole('button', { name: /Toggle Data Table/i });
    fireEvent.click(tableToggleBtn);

    expect(screen.getByText('2025-11')).toBeDefined();
    expect(screen.getByText('2.14')).toBeDefined();
    expect(screen.getAllByText('2.85').length).toBeGreaterThan(0);
  });

  it('renders statutory penalty forecast with +10% and +20% markups', async () => {
    render(
      <BrowserRouter>
        <InsightsTrendsView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Year 2026')).toBeDefined();
      expect(screen.getByText('+10% markup')).toBeDefined();
      expect(screen.getByText('Year 2027')).toBeDefined();
      expect(screen.getByText('+20% markup')).toBeDefined();
    });
  });

  it('renders upstream mill benchmarking cards', async () => {
    render(
      <BrowserRouter>
        <InsightsTrendsView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SAIL (Durgapur Steel Plant)')).toBeDefined();
      expect(screen.getByText(/100% Melt & Pour Pass/i)).toBeDefined();
      expect(screen.getByText('PREFERRED')).toBeDefined();
    });
  });
});

describe('Prompt P13: Ask Your Data Assistant Bottom Sheet', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAssistantSuggestedPrompts').mockResolvedValue({
      prompts: [
        { id: '1', label: 'Missing Origin', prompt: 'Which heats have missing Melt & Pour origin proof?' },
        { id: '2', label: 'CBAM Exposure', prompt: 'Calculate projected CBAM exposure for Hamburg shipment.' },
      ],
    });
    vi.spyOn(api, 'getAssistantUsage').mockResolvedValue(mockUsage);
    vi.spyOn(api, 'askAssistant').mockResolvedValue(mockChatResponse);
  });

  it('renders suggested prompts and token usage when opened', async () => {
    render(
      <BrowserRouter>
        <AssistantBottomSheet isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ask Your Data Assistant')).toBeDefined();
      expect(screen.getByText(/Which heats lack Country of Melt and Pour\?/i)).toBeDefined();
      expect(screen.getByText(/50,000/i)).toBeDefined();
    });
  });

  it('sends query and renders assistant response with cited record links', async () => {
    render(
      <BrowserRouter>
        <AssistantBottomSheet isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask about heats, shipments/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask about heats, shipments/i);
    fireEvent.change(input, { target: { value: 'Show me SS 316L heats' } });

    const sendBtn = screen.getByLabelText(/Send message/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Found 2 heats matching SS 316L/i)).toBeDefined();
      expect(screen.getByText('HT-2026-4401')).toBeDefined();
    });
  });
});
