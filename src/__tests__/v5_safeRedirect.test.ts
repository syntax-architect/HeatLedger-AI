import { describe, it, expect } from 'vitest';
import { sanitizeReturnUrl, DEFAULT_AUTH_REDIRECT } from '../utils/safeRedirect';

describe('Prompt Pack v5 Task 3.3: Open Redirect Defense (sanitizeReturnUrl)', () => {
  it('allows valid internal app routes', () => {
    expect(sanitizeReturnUrl('/app/shipments')).toBe('/app/shipments');
    expect(sanitizeReturnUrl('/app/certificates?filter=pending')).toBe('/app/certificates?filter=pending');
    expect(sanitizeReturnUrl('/verify/tok_123')).toBe('/verify/tok_123');
    expect(sanitizeReturnUrl('/portal/precursor/abc')).toBe('/portal/precursor/abc');
  });

  it('blocks external URLs, protocol-relative URLs, backslashes, and schemes', () => {
    expect(sanitizeReturnUrl('https://evil.example')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('http://evil.example/app/shipments')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('//evil.example')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('/\\evil.example')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('data:text/html,<script>alert(1)</script>')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('/unknown-route')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl('')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeReturnUrl(null)).toBe(DEFAULT_AUTH_REDIRECT);
  });
});
