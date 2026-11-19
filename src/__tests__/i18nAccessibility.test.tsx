/**
 * HEATLEDGER AI: Prompt D10 Test Suite
 * Hindi and Bengali, accessibility, and plain language
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n, {
  formatIndianNumber,
  formatIndianRupees,
  formatDateIndian,
  formatHeatNumber,
  formatCnCode,
  applyLanguageSettings,
} from '../i18n';
import { GlossaryTooltip } from '../components/ui/GlossaryTooltip';
import { LanguageSwitcher } from '../components/navigation/LanguageSwitcher';

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
});

describe('Prompt D10: i18n, Hindi & Bengali Localization', () => {
  it('d10.1: Correctly groups numbers into Lakhs and Crores (Indian numbering system)', () => {
    expect(formatIndianNumber(125000)).toBe('1,25,000');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000');

    // Compact mode
    expect(formatIndianNumber(150000, true)).toBe('1.50 Lakh');
    expect(formatIndianNumber(25000000, true)).toBe('2.50 Cr');

    // Rupee currency
    expect(formatIndianRupees(99990)).toBe('₹99,990');
    expect(formatIndianRupees(150000, true)).toBe('₹1.50 Lakh');
  });

  it('d10.2: Enforces DD-MM-YYYY date format per Prompt D10', () => {
    const formatted = formatDateIndian('2026-03-15T10:00:00Z');
    expect(formatted).toMatch(/^15-03-2026$/);
  });

  it('d10.3: Enforces Latin script preservation for Heat Numbers and CN Codes', () => {
    // Heat numbers must NEVER be transliterated into Devanagari or Bengali
    expect(formatHeatNumber('tsj-26-9021')).toBe('TSJ-26-9021');
    expect(formatHeatNumber('sail-bo-8812')).toBe('SAIL-BO-8812');

    // CN codes must remain in standard Latin decimal notation
    expect(formatCnCode('7304.19.10')).toBe('7304.19.10');
    expect(formatCnCode('7325 10 00')).toBe('7325 10 00');
  });

  it('d10.4: LanguageSwitcher allows switching between English, Hindi and Bengali', async () => {
    render(<LanguageSwitcher />);

    const switcherBtn = screen.getByRole('button', { name: /Select Interface Language/i });
    expect(switcherBtn).toBeTruthy();

    fireEvent.click(switcherBtn);

    // Verify option for Hindi and Bengali are rendered with native script labels
    expect(screen.getByRole('button', { name: /हिन्दी/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /বাংলা/i })).toBeTruthy();

    // Select Hindi
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी/i }));
    expect(i18n.language).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');

    // Select Bengali
    fireEvent.click(screen.getByRole('button', { name: /Select Interface Language/i }));
    fireEvent.click(screen.getByRole('button', { name: /বাংলা/i }));
    expect(i18n.language).toBe('bn');
    expect(document.documentElement.lang).toBe('bn');

    // Reset back to English
    fireEvent.click(screen.getByRole('button', { name: /Select Interface Language/i }));
    fireEvent.click(screen.getByRole('button', { name: /English/i }));
    expect(i18n.language).toBe('en');
  });

  it('d10.5: GlossaryTooltip renders plain-language definitions with accessible roles', () => {
    render(<GlossaryTooltip term="heat_number">Heat Number</GlossaryTooltip>);

    const button = screen.getByRole('button', { name: /Glossary definition for/i });
    expect(button).toBeTruthy();

    // Hover to reveal tooltip
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(screen.getByText(/Unique identifier assigned to a specific batch/i)).toBeTruthy();
  });
});
