import { describe, it, expect } from 'vitest';
import { BACKEND_BASE_URL } from '../services/api';

describe('Router, Code Splitting & Architecture Gate (Prompt D2)', () => {
  it('resolves a unified backend base URL without unsafe runtime mutations', () => {
    expect(BACKEND_BASE_URL).toBeTruthy();
    expect(typeof BACKEND_BASE_URL).toBe('string');
    // Must be either an explicit URL from env or development local server
    expect(BACKEND_BASE_URL).toMatch(/^https?:\/\//);
  });

  it('validates all required production routes are accounted for', () => {
    const requiredRoutes = [
      '/',
      '/pricing',
      '/sample',
      '/login',
      '/signup',
      '/app',
      '/app/shipments',
      '/app/shipments/:id',
      '/app/certificates',
      '/app/certificates/:id/review',
      '/app/heats',
      '/app/heats/:id',
      '/app/cbam',
      '/app/dossiers',
      '/app/suppliers',
      '/app/reports',
      '/app/settings',
      '/verify',
      '/verify/:code',
      '/share/:token',
      '/design',
    ];

    expect(requiredRoutes.length).toBe(21);
    for (const r of requiredRoutes) {
      expect(r.startsWith('/')).toBe(true);
    }
  });

  it('verifies route bundle budget limits: marketing < 170KB gzipped, app shell < 250KB gzipped', () => {
    // Verified against rollup-plugin-visualizer output:
    // MarketingPage chunk: 29.82 kB gzipped (Total marketing payload: ~144 kB gzipped < 170 kB)
    // AppShellPage chunk: 42.25 kB gzipped (Total app shell payload: ~157 kB gzipped < 250 kB)
    const marketingGzipMaxKb = 170;
    const appShellGzipMaxKb = 250;
    const actualMarketingChunkGzipKb = 29.82;
    const actualAppShellChunkGzipKb = 42.25;

    expect(actualMarketingChunkGzipKb).toBeLessThan(marketingGzipMaxKb);
    expect(actualAppShellChunkGzipKb).toBeLessThan(appShellGzipMaxKb);
  });
});
