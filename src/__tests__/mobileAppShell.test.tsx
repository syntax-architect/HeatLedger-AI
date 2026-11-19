import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { REGISTERED_PLANTS, PlantSwitcherModal } from '../components/dashboard/PlantSwitcherModal';
import { NotificationsModal } from '../components/dashboard/NotificationsModal';
import { CaptureChoiceModal } from '../components/dashboard/CaptureChoiceModal';
import { CommandPalette } from '../components/dashboard/CommandPalette';
import { MobileMoreSheet } from '../components/dashboard/MobileMoreSheet';
import { ThemeProvider } from '../context/ThemeContext';
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

describe('Prompt D3: Mobile App Shell & Modals', () => {
  it('registers manufacturing plants with valid UN/LOCODEs and installation IDs', () => {
    expect(REGISTERED_PLANTS.length).toBeGreaterThanOrEqual(4);
    const howrah = REGISTERED_PLANTS.find((p) => p.id === 'howrah-plant-1');
    expect(howrah).toBeDefined();
    expect(howrah?.installationId).toBe('IN-WB-4409');
    expect(howrah?.unLocode).toBe('IN CCU');
  });

  it('renders PlantSwitcherModal and triggers plant selection', () => {
    const onSelectPlant = vi.fn();
    const onClose = vi.fn();

    render(
      <PlantSwitcherModal
        isOpen={true}
        onClose={onClose}
        activePlantId="howrah-plant-1"
        onSelectPlant={onSelectPlant}
      />
    );

    expect(screen.getByText('Switch Factory Installation')).toBeDefined();
    expect(screen.getByText('Central India Steel & Alloys Ltd.')).toBeDefined();

    // Click another plant
    const raipurBtn = screen.getByText('SMS-2 · Raipur Works');
    fireEvent.click(raipurBtn);
    expect(onSelectPlant).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'raipur-sms-2' })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('renders NotificationsModal with factory QA alerts and unread indicators', () => {
    const onClose = vi.fn();

    render(
      <BrowserRouter>
        <NotificationsModal isOpen={true} onClose={onClose} />
      </BrowserRouter>
    );

    expect(screen.getByText('Factory QA & Compliance Alerts')).toBeDefined();
    expect(screen.getByText('3 Shipments Awaiting Clause 6 Sign-Off')).toBeDefined();
    expect(screen.getByText('CBAM Dossier Ready: Shipment #SHP-2026-0881')).toBeDefined();
  });

  it('renders CaptureChoiceModal with camera, document upload and sample presets', () => {
    const onSelectFile = vi.fn();
    const onSelectPreset = vi.fn();
    const onClose = vi.fn();

    render(
      <CaptureChoiceModal
        isOpen={true}
        onClose={onClose}
        onSelectFile={onSelectFile}
        onSelectPreset={onSelectPreset}
      />
    );

    expect(screen.getByText('Capture Mill Test Certificate (MTC)')).toBeDefined();
    expect(screen.getByText('Snap Photo with Camera')).toBeDefined();
    expect(screen.getByText('Upload PDF or Certificate Scan')).toBeDefined();

    // Sample presets exist
    const presetBtn = screen.getByText('SAIL Bokaro Steel Plant');
    expect(presetBtn).toBeDefined();
    fireEvent.click(presetBtn);
    expect(onSelectPreset).toHaveBeenCalledWith('preset-a');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders CommandPalette and filters actions on search query', () => {
    const onClose = vi.fn();
    const onTriggerCapture = vi.fn();
    const onTriggerPlantSwitch = vi.fn();
    const onTriggerSecurity = vi.fn();
    const onTriggerPinModal = vi.fn();

    render(
      <BrowserRouter>
        <ThemeProvider>
          <CommandPalette
            isOpen={true}
            onClose={onClose}
            onTriggerCapture={onTriggerCapture}
            onTriggerPlantSwitch={onTriggerPlantSwitch}
            onTriggerSecurity={onTriggerSecurity}
            onTriggerPinModal={onTriggerPinModal}
          />
        </ThemeProvider>
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Search commands, views, heats/i);
    expect(input).toBeDefined();

    // Type query "plant"
    fireEvent.change(input, { target: { value: 'plant' } });
    expect(screen.getByText('Switch Factory Installation')).toBeDefined();
  });

  it('renders MobileMoreSheet with full compliance suite: CBAM, Dossiers, Suppliers, Reports, Settings, Language, Theme, Help', () => {
    const onClose = vi.fn();
    const onOpenPlantSwitcher = vi.fn();
    const onOpenSecurity = vi.fn();
    const onOpenPinModal = vi.fn();

    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <MobileMoreSheet
              isOpen={true}
              onClose={onClose}
              activePlant={REGISTERED_PLANTS[0]}
              onOpenPlantSwitcher={onOpenPlantSwitcher}
              onOpenSecurity={onOpenSecurity}
              onOpenPinModal={onOpenPinModal}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    // Required links from Prompt D3
    expect(screen.getByText('CBAM Declarations')).toBeDefined();
    expect(screen.getByText('Customs Dossiers')).toBeDefined();
    expect(screen.getByText('Suppliers Registry')).toBeDefined();
    expect(screen.getByText('Audit Reports')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText(/Language:/i)).toBeDefined();
    expect(screen.getByText('Toggle Theme')).toBeDefined();
  });
});
