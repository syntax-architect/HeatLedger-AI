import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeatInventoryView } from '../components/dashboard/views/HeatInventoryView';
import { CommandCenterView } from '../components/dashboard/views/CommandCenterView';
import { MassBalanceBar } from '../components/dashboard/MassBalanceBar';
import { ToastProvider } from '../components/ui/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// In-memory mock for localStorage in jsdom
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
  });

  window.matchMedia =
    window.matchMedia ||
    (function (query: string): any {
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
    } as any);
});

describe('Prompt D6: Responsive Data Views & Ledgers', () => {
  it('renders MassBalanceBar with received, shipped, and remaining amounts', () => {
    render(
      <MassBalanceBar
        receivedKg={100000}
        shippedKg={60000}
        remainingKg={40000}
        scrapKg={0}
        unit="MT"
      />
    );

    expect(screen.getByText(/Total:/i)).toBeDefined();
    expect(screen.getByText(/Remaining:/i)).toBeDefined();
    expect(screen.getByText(/Shipped:/i)).toBeDefined();
    expect(screen.getByText(/Available:/i)).toBeDefined();
    expect(screen.getByText('100.0 MT')).toBeDefined();
    expect(screen.getByText('40.0 MT')).toBeDefined();
  });

  it('detects and flags over-allocation with warning label and deficit MT', () => {
    render(
      <MassBalanceBar
        receivedKg={50000}
        shippedKg={65000}
        remainingKg={-15000}
        scrapKg={0}
        unit="MT"
      />
    );

    // Over-allocation must be visually and textually flagged per Prompt D6
    expect(screen.getByText(/OVER-ALLOCATED/i)).toBeDefined();
    expect(screen.getByText(/OVER-ALLOCATED: -15.0 MT/i)).toBeDefined();
  });

  it('renders HeatInventoryView with aggregate mass-balance and Anti-Phantom Sandbox', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <HeatInventoryView />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Raw Material Heat Inventory Ledger')).toBeDefined();
    expect(screen.getByText('Aggregate Plant Mass Balance Status')).toBeDefined();

    // Anti-Phantom Engine toggle
    const testEngineBtn = screen.getByText('Test Anti-Phantom Engine');
    expect(testEngineBtn).toBeDefined();
    fireEvent.click(testEngineBtn);

    expect(screen.getByText('Interactive Anti-Phantom Allocation Sandbox')).toBeDefined();
    expect(screen.getByText('Execute Allocation Check')).toBeDefined();
  });

  it('renders CommandCenterView with KPI metrics and responsive search filter', () => {
    const onOpenDossier = vi.fn();
    render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <CommandCenterView
              onOpenShipmentDossier={onOpenDossier}
              onNavigateToWorkbench={vi.fn()}
              onNavigateToInventory={vi.fn()}
              onNavigateToSignOff={vi.fn()}
              onTriggerUpload={vi.fn()}
            />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('EU/UK Shipments')).toBeDefined();
    expect(screen.getByText('Verified Precursors')).toBeDefined();

    // Search filtering
    const searchInput = screen.getByPlaceholderText(/Search container, invoice/i);
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_CONTAINER_12345' } });
    expect(screen.getByText('No shipments found')).toBeDefined();
  });
});
