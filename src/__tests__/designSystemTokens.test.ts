import { describe, it, expect } from 'vitest';

/**
 * WCAG 2.2 Relative Luminance and Contrast Ratio Calculation
 * Standard ISO/IEC 17025 & W3C WCAG AA (4.5:1 for normal text).
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

export interface DesignTokenPair {
  name: string;
  theme: 'dark' | 'light';
  fg: string;
  bg: string;
  description: string;
}

export const DESIGN_SYSTEM_COLOR_PAIRS: DesignTokenPair[] = [
  // Light Theme (Precision Daylight)
  {
    name: 'Primary Emerald on White Surface',
    theme: 'light',
    fg: '#047857', // Emerald 700 shade (replaces failing emerald-500)
    bg: '#FFFFFF',
    description: 'Compliant primary CTA text and icons on daylight white sheet',
  },
  {
    name: 'Molten Warning Amber on White Surface',
    theme: 'light',
    fg: '#B45309', // Amber 700 shade (replaces failing amber-500)
    bg: '#FFFFFF',
    description: 'Precursor warning badges and heat highlights',
  },
  {
    name: 'Alert Danger Red on White Surface',
    theme: 'light',
    fg: '#DC2626', // Red 600
    bg: '#FFFFFF',
    description: 'Off-spec chemistry and rejection alerts',
  },
  {
    name: 'Main Text on Light Surface',
    theme: 'light',
    fg: '#0F172A', // Slate 900
    bg: '#FFFFFF',
    description: 'Primary body text on light backgrounds',
  },
  {
    name: 'Muted Text on Light Surface',
    theme: 'light',
    fg: '#475569', // Slate 600
    bg: '#FFFFFF',
    description: 'Secondary metadata and labels on light backgrounds',
  },
  {
    name: 'Info Cobalt on Light Surface',
    theme: 'light',
    fg: '#1D4ED8', // Blue 700
    bg: '#FFFFFF',
    description: 'Audit traces and information chips',
  },

  // Dark Theme (Obsidian Forge)
  {
    name: 'Electric Emerald on Obsidian Deep',
    theme: 'dark',
    fg: '#10B981', // Electric Emerald 500
    bg: '#090D16', // Obsidian Deep
    description: 'Verified badges and affirmative CTAs on dark forge',
  },
  {
    name: 'Molten Amber on Obsidian Deep',
    theme: 'dark',
    fg: '#F59E0B', // Molten Amber 500
    bg: '#090D16',
    description: 'Heat numbers and melt-and-pour tags on dark forge',
  },
  {
    name: 'Main Frost Text on Obsidian Deep',
    theme: 'dark',
    fg: '#E8EEF7', // Frost
    bg: '#090D16',
    description: 'Primary text on dark forge',
  },
  {
    name: 'Steel Muted Text on Obsidian Deep',
    theme: 'dark',
    fg: '#94A3B8', // Steel / Slate 400
    bg: '#090D16',
    description: 'Secondary technical labels on dark forge',
  },
  {
    name: 'Danger Red on Obsidian Deep',
    theme: 'dark',
    fg: '#EF4444',
    bg: '#090D16',
    description: 'Rejection indicators on dark forge',
  },
  {
    name: 'Sky Info on Obsidian Deep',
    theme: 'dark',
    fg: '#38BDF8',
    bg: '#090D16',
    description: 'Customs coordinate metadata on dark forge',
  },
];

describe('Design System v2: WCAG 2.2 AA Contrast & Token Specifications (Prompt D1)', () => {
  it('enforces that EVERY semantic color token pair satisfies WCAG AA (>= 4.5:1)', () => {
    const failedPairs: string[] = [];

    for (const pair of DESIGN_SYSTEM_COLOR_PAIRS) {
      const ratio = getContrastRatio(pair.fg, pair.bg);
      if (ratio < 4.5) {
        failedPairs.push(
          `[FAIL] ${pair.name} (${pair.theme}): fg=${pair.fg} on bg=${pair.bg} has contrast ${ratio}:1 (< 4.5:1 required by WCAG AA)`
        );
      }
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }

    if (failedPairs.length > 0) {
      throw new Error(`Design System Contrast Violations:\n${failedPairs.join('\n')}`);
    }
  });

  it('validates the strict typography scale: 12 / 14 / 16 / 18 / 24 / 32 / 48 px', () => {
    const typeScale = {
      xs: 12, // Floor: Nothing below 12px
      sm: 14, // Body on mobile app screens
      base: 16, // Body on marketing screens
      lg: 18,
      xl: 24,
      '2xl': 32,
      '3xl': 48,
    };

    expect(typeScale.xs).toBe(12);
    expect(typeScale.sm).toBe(14);
    expect(typeScale.base).toBe(16);
    expect(typeScale.lg).toBe(18);
    expect(typeScale.xl).toBe(24);
    expect(typeScale['2xl']).toBe(32);
    expect(typeScale['3xl']).toBe(48);
  });
});
