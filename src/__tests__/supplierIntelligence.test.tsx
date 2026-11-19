import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupplierIntelligenceView } from '../components/dashboard/views/SupplierIntelligenceView';
import { ToastProvider } from '../components/ui/ToastContext';

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
    function (query: string): any {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
});

describe('Prompt P2: Supplier Intelligence View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <SupplierIntelligenceView />
      </ToastProvider>
    );

  it('renders supplier directory with quality scorecards and rating badges', () => {
    renderComponent();

    expect(screen.getByText(/Supplier & Mill Intelligence/i)).toBeDefined();
    expect(screen.getAllByText(/Tata Steel Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Steel Authority of India Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/JSW Steel Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Apex Steel Intermediaries/i).length).toBeGreaterThanOrEqual(1);

    // Check rating badges
    expect(screen.getAllByText(/GRADE A · VERIFIED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GRADE C · DEFECT PRONE/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GRADE D · HIGH RISK/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters suppliers by search input and rating grade filter buttons', () => {
    renderComponent();

    // Filter by grade D
    const gradeDButton = screen.getByRole('button', { name: 'Grade D' });
    fireEvent.click(gradeDButton);

    expect(screen.getAllByText(/Apex Steel Intermediaries/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText(/Tata Steel Limited/i).length).toBe(0);

    // Reset filter
    const allButton = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allButton);
    expect(screen.getAllByText(/Tata Steel Limited/i).length).toBeGreaterThanOrEqual(1);

    // Search input
    const searchInput = screen.getByPlaceholderText(/Search mills, locations, grades.../i);
    fireEvent.change(searchInput, { target: { value: 'Bokaro' } });
    expect(screen.getAllByText(/Steel Authority of India Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText(/Tata Steel Limited/i).length).toBe(0);
  });

  it('switches to Learned Templates tab and displays deterministic layout fingerprints', () => {
    renderComponent();

    const templatesTab = screen.getByRole('button', { name: /Learned Templates/i });
    fireEvent.click(templatesTab);

    expect(screen.getByText(/Deterministic Layout Fingerprints & OCR Field Maps/i)).toBeDefined();
    expect(screen.getByText('tata_tsj_rev4_bof_cc')).toBeDefined();
    expect(screen.getByText('sail_bsp_dotmatrix_v2')).toBeDefined();
    expect(screen.getByText('jsw_vy_digital_signed_v3')).toBeDefined();
    expect(screen.getByText(/STEEL MELTED AND MANUFACTURED IN INDIA/i)).toBeDefined();
  });

  it('switches to PO Matcher tab and checks weight reconciliation tolerance', () => {
    renderComponent();

    const poTab = screen.getByRole('button', { name: /PO Matcher/i });
    fireEvent.click(poTab);

    expect(screen.getByText(/Purchase Order Weight Reconciler/i)).toBeDefined();

    const reconcileBtn = screen.getByRole('button', { name: /Reconcile Weights/i });
    fireEvent.click(reconcileBtn);

    // Initial state: 25000 expected, 25220 received -> 220 kg (0.88%) -> within 2% margin
    expect(screen.getByText(/TOLERANCE VERIFIED/i)).toBeDefined();

    // Change received weight to 26000 kg (+1000 kg = 4.0% > 2.0%)
    const receivedInput = screen.getByDisplayValue('25220');
    fireEvent.change(receivedInput, { target: { value: '26000' } });
    fireEvent.click(reconcileBtn);

    expect(screen.getAllByText(/DISCREPANCY FLAGGED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/exceeds ±2% allowable rolling margin/i)).toBeDefined();
  });

  it('opens Ask Supplier to Fix modal and formats WhatsApp & email messages', async () => {
    renderComponent();

    const askButtons = screen.getAllByRole('button', { name: /Ask to Fix/i });
    fireEvent.click(askButtons[0]);

    expect(screen.getByText(/Ask Supplier to Fix:/i)).toBeDefined();
    expect(screen.getByText(/WhatsApp Direct Notice:/i)).toBeDefined();
    expect(screen.getByText(/Formal Email Template:/i)).toBeDefined();

    // Copy WhatsApp
    const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
