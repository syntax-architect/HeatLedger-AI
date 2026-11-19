/**
 * HEATLEDGER AI: Prompt D8 Test Suite
 * Certificate review workbench for phones and desktops
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MtcWorkbenchView } from '../components/dashboard/views/MtcWorkbenchView';
import { ToastProvider } from '../components/ui/ToastContext';

beforeAll(() => {
  // Mock localStorage for test environment
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
        for (const k in store) delete store[k];
      },
    },
    writable: true,
  });

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

const renderWorkbench = () => {
  return render(
    <ToastProvider>
      <MtcWorkbenchView />
    </ToastProvider>
  );
};

describe('Prompt D8: Certificate Review Workbench', () => {
  it('d8.1: Renders MTC workbench with fields grouped by Identity, Traceability, Chemistry, Mechanical', () => {
    renderWorkbench();

    expect(screen.getByText('EN 10204 3.1 Certificate Review Workbench')).toBeTruthy();
    expect(screen.getAllByText(/Manufacturer Mill/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Heat \/ Cast Number/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Country of Melt & Pour/i).length).toBeGreaterThanOrEqual(1);
  });

  it('d8.2: Displays original document lock icon and SHA-256 integrity hash', () => {
    renderWorkbench();

    expect(screen.getByText(/PyMuPDF word bounds active/i)).toBeTruthy();
    // Verify SHA-256 hash preview
    expect(screen.getByText(/d9b7a18e209f/i)).toBeTruthy();
  });

  it('d8.3: Blocks approval when fields are below 85% confidence and unconfirmed', () => {
    renderWorkbench();

    const approveBtn = screen.getByRole('button', { name: /Approve MTC/i });
    expect(approveBtn).toBeTruthy();
    expect(approveBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/field\(s\) require inspector review/i)).toBeTruthy();
  });

  it('d8.4: Allows confirming flagged fields to unlock the Approve button', () => {
    renderWorkbench();

    // Find all confirm buttons on flagged fields
    const confirmButtons = screen.getAllByRole('button', { name: /Confirm/i });
    expect(confirmButtons.length).toBeGreaterThan(0);

    // Confirm each flagged field
    confirmButtons.forEach((btn) => {
      fireEvent.click(btn);
    });

    // Verify Approve button is now unlocked
    const unlockedApproveBtn = screen.getByRole('button', { name: /Approve MTC/i });
    expect(unlockedApproveBtn).toBeTruthy();
    expect(unlockedApproveBtn.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText(/100% Verified · Ready to Sign/i)).toBeTruthy();
  });

  it('d8.5: Switches between certificates using Next / Previous controls', () => {
    renderWorkbench();

    const nextBtn = screen.getByRole('button', { name: /Next Certificate/i });
    fireEvent.click(nextBtn);

    // After clicking next, preset indicator advances to 2 / 3
    expect(screen.getByText(/2 \/ 3/i)).toBeTruthy();
  });

  it('d8.6: Supports mobile tab switching between Document View and Extracted Fields', () => {
    renderWorkbench();

    const fieldsTabBtn = screen.getByRole('button', { name: /Extracted Fields/i });
    fireEvent.click(fieldsTabBtn);

    const docTabBtn = screen.getByRole('button', { name: /Document View/i });
    fireEvent.click(docTabBtn);
  });
});
