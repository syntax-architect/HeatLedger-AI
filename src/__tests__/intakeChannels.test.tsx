import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntakeConfigModal } from '../components/intake/IntakeConfigModal';
import { CaptureChoiceModal } from '../components/dashboard/CaptureChoiceModal';
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

describe('Prompt P3: WhatsApp & Email Intake Channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  const renderIntakeModal = (isOpen = true, onClose = vi.fn()) =>
    render(
      <ToastProvider>
        <IntakeConfigModal isOpen={isOpen} onClose={onClose} plantId="plant-howrah-01" />
      </ToastProvider>
    );

  it('renders IntakeConfigModal with WhatsApp pairing info and copy action', () => {
    renderIntakeModal();

    expect(screen.getByText(/WhatsApp & Email Intake Channels/i)).toBeDefined();
    expect(screen.getByText(/\+91 98300 22000/i)).toBeDefined();
    expect(screen.getByText(/Plant Pairing Code:/i)).toBeDefined();
    expect(screen.getByText(/Open in WhatsApp with Code/i)).toBeDefined();

    // Copy pairing command
    const copyPairBtn = screen.getByRole('button', { name: /Copy PAIR/i });
    fireEvent.click(copyPairBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('PAIR'));
  });

  it('switches to Email-In tab and manages sender allow-list domains', () => {
    renderIntakeModal();

    const emailTab = screen.getByRole('button', { name: /Email-In/i });
    fireEvent.click(emailTab);

    expect(screen.getByText(/Dedicated Plant Inbound Mailbox/i)).toBeDefined();
    expect(screen.getByDisplayValue(/@inbound\.heatledger\.ai/i)).toBeDefined();
    expect(screen.getByText('@howrahsteel.in')).toBeDefined();

    // Add new domain to allowlist
    const input = screen.getByPlaceholderText(/e\.g\. @tatasteel\.com/i);
    const addBtn = screen.getByRole('button', { name: /Add/i });

    fireEvent.change(input, { target: { value: '@jswsteel.in' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('@jswsteel.in')).toBeDefined();
  });

  it('switches to Budget tab and displays Cost Guard quota indicator', () => {
    renderIntakeModal();

    const budgetTab = screen.getByRole('button', { name: /Budget/i });
    fireEvent.click(budgetTab);

    expect(screen.getByText(/Monthly Message Quota:/i)).toBeDefined();
    expect(screen.getByText(/Cost Guard automatically halts outbound template messages/i)).toBeDefined();
  });

  it('displays WhatsApp & Email intake entrypoint in CaptureChoiceModal', () => {
    render(
      <ToastProvider>
        <CaptureChoiceModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectFile={vi.fn()}
          onSelectPreset={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Send via WhatsApp or Email/i)).toBeDefined();
    expect(screen.getByText(/P3 INTAKE/i)).toBeDefined();
  });
});
