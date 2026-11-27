import { describe, it, expect } from 'vitest';
import viteConfigRaw from '../../vite.config.ts?raw';
import vercelRaw from '../../vercel.json?raw';
import cfHeadersRaw from '../../public/_headers?raw';

const srcModules = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('Prompt Pack v5 Task 3.7: Frontend & CSP Hardening', () => {
  it('bans hl_auth_token, MOCK_PREVIEW, dangerouslySetInnerHTML, and eval across src/', () => {
    const entries = Object.entries(srcModules).filter(
      ([filePath]) => !filePath.includes('/__tests__/')
    );
    expect(entries.length).toBeGreaterThan(20);

    for (const [filePath, content] of entries) {
      expect(content, `${filePath} contains forbidden hl_auth_token`).not.toContain('hl_auth_token');
      expect(content, `${filePath} contains MOCK_PREVIEW`).not.toContain('MOCK_PREVIEW');
      expect(content, `${filePath} contains dangerouslySetInnerHTML`).not.toContain('dangerouslySetInnerHTML');
      expect(/\beval\s*\(/.test(content), `${filePath} calls eval()`).toBe(false);
    }
  });

  it('enforces strict CSP without unsafe-inline scripts or localhost in vercel.json and public/_headers', () => {
    const vercel = JSON.parse(vercelRaw) as {
      headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
    };
    const vercelCsp =
      vercel.headers?.[0]?.headers?.find(
        (h) => h.key.toLowerCase() === 'content-security-policy'
      )?.value || '';
    const cfCsp = cfHeadersRaw.match(/^\s*Content-Security-Policy:\s*(.+)$/im)?.[1] || '';

    for (const csp of [vercelCsp, cfCsp]) {
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).not.toContain('localhost:8000');
      expect(csp).not.toContain('127.0.0.1:8000');
    }
  });

  it('blocks VITE_UI_PREVIEW_MODE and secret-like VITE_* variables in vite.config.ts', () => {
    expect(viteConfigRaw).toContain('VITE_UI_PREVIEW_MODE');
    expect(viteConfigRaw).toContain('SECRET|KEY|TOKEN|PASSWORD|PRIVATE');
    expect(viteConfigRaw).toContain('sourcemap: false');
  });
});
