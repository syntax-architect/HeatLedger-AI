/**
 * HEATLEDGER AI: Prompt D10 Test Suite
 * Hindi, Bengali, German, accessibility, and plain language
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import i18n, {
  formatIndianNumber,
  formatIndianRupees,
  formatDateIndian,
  formatHeatNumber,
  formatCnCode,
  applyLanguageSettings,
  SUPPORTED_LANGUAGES,
  LANGUAGE_METADATA,
} from '../i18n';
import { GlossaryTooltip } from '../components/ui/GlossaryTooltip';
import { LanguageSwitcher } from '../components/navigation/LanguageSwitcher';
import { StatusChip } from '../components/ui/Badges';
import { SettingsView } from '../components/dashboard/views/SettingsView';
import { ThemeProvider } from '../context/ThemeContext';

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

beforeEach(() => {
  i18n.changeLanguage('en');
  applyLanguageSettings('en');
});

describe('Prompt D10: i18n, Multilingual Localization', () => {
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

  it('d10.4: LanguageSwitcher allows switching between English, Hindi, Bengali and German', async () => {
    render(<LanguageSwitcher />);

    const switcherBtn = screen.getByRole('button', { name: /Select Interface Language/i });
    expect(switcherBtn).toBeTruthy();

    fireEvent.click(switcherBtn);

    // Verify options for Hindi, Bengali and German are rendered with native script labels
    expect(screen.getByRole('button', { name: /हिन्दी/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /বাংলা/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Deutsch/i })).toBeTruthy();

    // Select Hindi
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी/i }));
    expect(i18n.language).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');

    // Select Bengali
    fireEvent.click(screen.getByRole('button', { name: /Select Interface Language/i }));
    fireEvent.click(screen.getByRole('button', { name: /বাংলা/i }));
    expect(i18n.language).toBe('bn');
    expect(document.documentElement.lang).toBe('bn');

    // Select German
    fireEvent.click(screen.getByRole('button', { name: /Select Interface Language/i }));
    fireEvent.click(screen.getByRole('button', { name: /Deutsch/i }));
    expect(i18n.language).toBe('de');
    expect(document.documentElement.lang).toBe('de');

    // Reset back to English
    fireEvent.click(screen.getByRole('button', { name: /Select Interface Language/i }));
    fireEvent.click(screen.getByRole('button', { name: /English/i }));
    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
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

  it('d10.6: All supported languages provide full translation key coverage for nav and common', () => {
    const keysToCheck = [
      'nav.home',
      'nav.workbench',
      'nav.dossier',
      'nav.settings',
      'common.save',
      'common.cancel',
      'common.verified',
      'common.needs_review',
      'dashboard.title',
      'settings.title',
    ];

    for (const lang of SUPPORTED_LANGUAGES) {
      i18n.changeLanguage(lang);
      for (const key of keysToCheck) {
        const text = i18n.t(key);
        expect(text).toBeDefined();
        expect(text).not.toBe(key); // Must not return untranslated key path
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('d10.7: StatusChip translates properly in Hindi, Bengali, German and English', () => {
    // English
    act(() => {
      i18n.changeLanguage('en');
    });
    const { rerender } = render(<StatusChip status="Verified" />);
    expect(screen.getByText('Verified')).toBeTruthy();

    // Hindi
    act(() => {
      i18n.changeLanguage('hi');
    });
    rerender(<StatusChip status="Verified" />);
    expect(screen.getByText('सत्यापित')).toBeTruthy();

    // Bengali
    act(() => {
      i18n.changeLanguage('bn');
    });
    rerender(<StatusChip status="Verified" />);
    expect(screen.getByText('যাচাইকৃত')).toBeTruthy();

    // German
    act(() => {
      i18n.changeLanguage('de');
    });
    rerender(<StatusChip status="Verified" />);
    expect(screen.getByText('Verifiziert')).toBeTruthy();
  });

  it('d10.8: SettingsView renders all supported language cards and allows switching', () => {
    render(
      <ThemeProvider>
        <SettingsView />
      </ThemeProvider>
    );

    // Verify all supported language native labels are visible
    expect(screen.getByText('हिन्दी')).toBeTruthy();
    expect(screen.getByText('বাংলা')).toBeTruthy();
    expect(screen.getByText('Deutsch')).toBeTruthy();

    // Click Hindi card
    fireEvent.click(screen.getByText('हिन्दी'));
    expect(i18n.language).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');
  });

  it('d10.9: Dynamically applies font classes and loads Google Fonts for Indic scripts', () => {
    applyLanguageSettings('hi');
    expect(document.body.classList.contains('font-hi')).toBe(true);
    expect(document.getElementById('google-font-noto-devanagari')).toBeTruthy();

    applyLanguageSettings('bn');
    expect(document.body.classList.contains('font-bn')).toBe(true);
    expect(document.body.classList.contains('font-hi')).toBe(false);
    expect(document.getElementById('google-font-noto-bengali')).toBeTruthy();

    applyLanguageSettings('en');
    expect(document.body.classList.contains('font-bn')).toBe(false);
    expect(document.body.classList.contains('font-hi')).toBe(false);
  });
});
