import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CbamDossierView } from '../components/dashboard/views/CbamDossierView';
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

  // Mock URL methods for downloading files
  if (typeof window.URL.createObjectURL === 'undefined') {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  } else {
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  }
  if (typeof window.URL.revokeObjectURL === 'undefined') {
    window.URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

vi.mock('../services/api', () => ({
  ApiService: {
    exportCbamXml: vi.fn().mockResolvedValue(new Blob(['<CBAMCommunication/>'], { type: 'application/xml' })),
    exportCbamVerifierCsv: vi.fn().mockResolvedValue(new Blob(['CN_Code,Jurisdiction'], { type: 'text/csv' })),
    confirmEnergyBill: vi.fn().mockResolvedValue({ status: 'success', human_confirmed: true }),
    simulateCbamWhatIf: vi.fn(),
    fetchCbamWorkspaceProfile: vi.fn(),
    fetchCbamScopeCnCodes: vi.fn(),
  },
}));

describe('Prompt P6: Period-Based CBAM Workspace & Proof-of-Value Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <AuthProvider>
        <ToastProvider>
          <CbamDossierView {...props} />
        </ToastProvider>
      </AuthProvider>
    );
  };

  it('renders installation profile, UNLOCODE, and scope resolution badge', () => {
    renderComponent();

    expect(screen.getByText(/CBAM Period Workspace & Proof-of-Value Engine/i)).toBeDefined();
    expect(screen.getByText(/INCCU/i)).toBeDefined();
    expect(screen.getByText(/Howrah Precision Forgings Pvt. Ltd./i)).toBeDefined();
    expect(screen.getByText(/Confirmed in Scope/i)).toBeDefined();
  });

  it('toggles jurisdiction between EU CBAM and UK CBAM', () => {
    renderComponent();

    const ukBtn = screen.getByText(/🇬🇧 UK CBAM/i);
    fireEvent.click(ukBtn);

    expect(screen.getByText(/UK CBAM Confirmed in Scope/i)).toBeDefined();

    const euBtn = screen.getByText(/🇪🇺 EU CBAM/i);
    fireEvent.click(euBtn);

    expect(screen.getByText(/Confirmed in Scope \(Regulation EU 2023\/956 Annex I\)/i)).toBeDefined();
  });

  it('identifies proposed downstream extensions properly', () => {
    renderComponent();

    const cnInput = screen.getByDisplayValue('7307 91 00');
    fireEvent.change(cnInput, { target: { value: '8481 80 00' } });

    expect(screen.getByText(/Proposed Downstream Extension/i)).toBeDefined();
  });

  it('updates live recalculation when What-If Sliders move', () => {
    renderComponent();

    const verifiedSeeHeading = screen.getByText(/Verified Specific Embedded Emissions \(SEE\):/i);
    expect(verifiedSeeHeading).toBeDefined();

    // Switch fuel mix to Natural Gas
    const natGasBtn = screen.getByText(/Natural Gas/i);
    fireEvent.click(natGasBtn);

    // Switch to Green Hydrogen
    const greenH2Btn = screen.getByText(/Green H₂/i);
    fireEvent.click(greenH2Btn);

    expect(screen.getByText(/0.00 kg\/kg/i)).toBeDefined();
  });

  it('opens and closes "How this was calculated" audit trace drawer', () => {
    renderComponent();

    const traceBtn = screen.getByRole('button', { name: /How this was calculated/i });
    fireEvent.click(traceBtn);

    expect(screen.getByText(/Calculation Trace & Regulatory Audit Log/i)).toBeDefined();
    expect(screen.getByText(/REG-2026-Q1-V1/i)).toBeDefined();
    expect(screen.getByText(/Estimate for planning only/i)).toBeDefined();
    expect(screen.getByText(/Central Electricity Authority \(CEA\) User Guide v20.0/i)).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /Close Audit Trace/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Calculation Trace & Regulatory Audit Log/i)).toBeNull();
  });

  it('triggers verifier XML and CSV exports', async () => {
    renderComponent();

    const xmlExportBtn = screen.getByText(/Official CBAM XML Sheet/i);
    fireEvent.click(xmlExportBtn);

    await waitFor(() => {
      expect(ApiService.exportCbamXml).toHaveBeenCalled();
    });

    const csvExportBtn = screen.getByText(/Verifier Audit CSV/i);
    fireEvent.click(csvExportBtn);

    await waitFor(() => {
      expect(ApiService.exportCbamVerifierCsv).toHaveBeenCalled();
    });
  });
});
