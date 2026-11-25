/**
 * Open Redirect Defense (Prompt Pack v5 - Task 3.3 #4)
 * Strictly validates returnUrl before navigation:
 * - Must start with a single '/' followed by an ASCII letter
 * - Must NOT contain '//', backslash '\', scheme ':', or control characters
 * - Must match known internal application route prefixes
 * Any invalid or external URL resolves safely to the default app route.
 */

export const DEFAULT_AUTH_REDIRECT = '/app/shipments';

const ALLOWED_ROUTE_PREFIXES = [
  '/app',
  '/verify',
  '/portal',
  '/check',
  '/roi',
  '/pilot',
  '/partners',
  '/intake',
  '/traction',
];

export function sanitizeReturnUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_AUTH_REDIRECT;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Reject backslashes, protocol-relative '//', whitespace/control chars, or schemes
  if (
    trimmed.includes('\\') ||
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Must start with a single '/' immediately followed by an ASCII letter
  if (!/^\/[A-Za-z][A-Za-z0-9\-_/?=&#%]*$/.test(trimmed)) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Path component (before ? or #) must not contain ':' or '//'
  const pathOnly = trimmed.split(/[?#]/)[0] || '';
  if (pathOnly.includes(':') || pathOnly.includes('//')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  const matchesKnownRoute = ALLOWED_ROUTE_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)
  );

  return matchesKnownRoute ? trimmed : DEFAULT_AUTH_REDIRECT;
}
