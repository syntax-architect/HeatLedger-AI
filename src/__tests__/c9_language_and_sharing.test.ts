/**
 * HEATLEDGER AI: Prompt Pack v4 Task C9 Test Suite
 * Language and WhatsApp Sharing Verification
 * - Indian number grouping (1,25,000)
 * - Dates as DD MMM YYYY (e.g. 12 Feb 2026)
 * - Pack summaries shared as short WhatsApp message (wa.me link, no external API)
 * - Translation keys present for English, Hindi, and Bengali
 */

import { describe, it, expect } from 'vitest';
import {
  formatIndianNumber,
  formatIndianRupees,
  formatDateDdMmmYyyy,
  generateWhatsAppPackShareUrl,
  SUPPORTED_LANGUAGES,
} from '../i18n';
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import bn from '../i18n/locales/bn.json';

describe('Prompt Pack v4 Task C9: Language and Sharing', () => {
  it('formats numbers into Indian numbering system with Lakhs grouping (1,25,000)', () => {
    expect(formatIndianNumber(125000)).toBe('1,25,000');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
    expect(formatIndianRupees(125000)).toBe('₹1,25,000');
  });

  it('formats dates strictly as DD MMM YYYY', () => {
    const formatted = formatDateDdMmmYyyy('2026-02-12T10:00:00Z');
    expect(formatted).toBe('12 Feb 2026');

    const octFormatted = formatDateDdMmmYyyy('2026-10-01T00:00:00Z');
    expect(octFormatted).toBe('01 Oct 2026');
  });

  it('generates short WhatsApp wa.me direct URL with tamper-evident notice without external API', () => {
    const waUrl = generateWhatsAppPackShareUrl(
      '+919876543210',
      'SHP-EU-2026-881',
      'https://app.heatledger.ai/share/sh_test123',
      '2 heats verified · Ready for customs inspection'
    );

    expect(waUrl).toContain('https://wa.me/919876543210?text=');
    expect(waUrl).toContain(encodeURIComponent('SHP-EU-2026-881'));
    expect(waUrl).toContain(encodeURIComponent('https://app.heatledger.ai/share/sh_test123'));
    expect(waUrl).toContain(encodeURIComponent('Tamper-evident seal. Not a legal verification'));
  });

  it('supports English, Hindi, Bengali locales with translation files', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('hi');
    expect(SUPPORTED_LANGUAGES).toContain('bn');

    // Key common actions present in all 3 languages
    expect(en.common).toBeDefined();
    expect(hi.common).toBeDefined();
    expect(bn.common).toBeDefined();
  });
});
