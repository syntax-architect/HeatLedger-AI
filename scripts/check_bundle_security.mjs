/**
 * Prompt Pack v5 Task 3.7: Production Bundle, Session Storage & CSP Verification Gate
 *
 * Verifies against the built dist/ output and static header configs:
 * 1. No source maps (.map files or sourceMappingURL comments) in production dist/.
 * 2. No 'hl_auth_token', 'MOCK_PREVIEW', or 'VITE_UI_PREVIEW_MODE' strings in built JS/HTML.
 * 3. No localStorage.setItem / sessionStorage.setItem calls storing token/jwt/password/secret keys.
 * 4. vercel.json and public/_headers enforce script-src without 'unsafe-inline',
 *    object-src 'none', frame-ancestors 'none', base-uri 'self', and no localhost connect-src.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');

if (!fs.existsSync(DIST_DIR) || !fs.existsSync(DIST_ASSETS)) {
  console.error(`Error: Built output not found at ${DIST_DIR}. Run 'npm run build' first.`);
  process.exit(1);
}

const failures = [];

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const distFiles = walkFiles(DIST_DIR);

for (const filePath of distFiles) {
  const rel = path.relative(DIST_DIR, filePath);
  if (filePath.endsWith('.map')) {
    failures.push(`Source map artifact present in dist/: ${rel}`);
    continue;
  }
  if (!filePath.endsWith('.js') && !filePath.endsWith('.html')) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (/sourceMappingURL\s*=/.test(content)) {
    failures.push(`sourceMappingURL directive found in ${rel}`);
  }
  if (content.includes('hl_auth_token')) {
    failures.push(`Forbidden legacy token key 'hl_auth_token' found in ${rel}`);
  }
  if (content.includes('MOCK_PREVIEW') || content.includes('VITE_UI_PREVIEW_MODE')) {
    failures.push(`Preview-mode mock identifier found in production bundle: ${rel}`);
  }
  const storageTokenRx = /(?:localStorage|sessionStorage)\.setItem\(\s*['"`][^'"`]*(?:token|jwt|secret|password)[^'"`]*['"`]/gi;
  const storageMatches = content.match(storageTokenRx);
  if (storageMatches) {
    failures.push(`Sensitive storage write in ${rel}: ${storageMatches.join(', ')}`);
  }
}

// Verify index.html contains no executable inline <script> bodies (application/ld+json data blocks allowed)
const distIndexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
const scriptTagMatches = distIndexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
for (const match of scriptTagMatches) {
  const attrs = match[1] || '';
  const body = (match[2] || '').trim();
  const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(attrs);
  const hasSrc = /\bsrc\s*=/i.test(attrs);
  if (!hasSrc && !isJsonLd && body.length > 0) {
    failures.push('dist/index.html contains an executable inline <script> block without src attribute');
  }
}

// Verify CSP headers in vercel.json and public/_headers
function verifyCspString(label, csp) {
  if (!csp) {
    failures.push(`${label}: missing Content-Security-Policy`);
    return;
  }
  const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
  if (!scriptSrcMatch || /'unsafe-inline'|'unsafe-eval'/i.test(scriptSrcMatch[1])) {
    failures.push(`${label}: script-src must not permit unsafe-inline or unsafe-eval`);
  }
  for (const requiredDirective of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) {
    if (!csp.toLowerCase().includes(requiredDirective)) {
      failures.push(`${label}: missing required CSP directive ${requiredDirective}`);
    }
  }
  if (/localhost:8000|127\.0\.0\.1:8000/i.test(csp)) {
    failures.push(`${label}: production CSP must not whitelist localhost:8000 or 127.0.0.1:8000`);
  }
}

const vercelCfg = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
const vercelHeaders = vercelCfg.headers?.[0]?.headers ?? [];
const vercelCsp = vercelHeaders.find((h) => h.key.toLowerCase() === 'content-security-policy')?.value ?? '';
verifyCspString('vercel.json', vercelCsp);

const cfHeaders = fs.readFileSync(path.resolve('public', '_headers'), 'utf8');
const cfCspMatch = cfHeaders.match(/^\s*Content-Security-Policy:\s*(.+)$/im);
verifyCspString('public/_headers', cfCspMatch?.[1] ?? '');

if (failures.length > 0) {
  console.error('FAIL: Task 3.7 bundle/CSP security checks failed:');
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log(`PASS: Verified ${distFiles.length} dist/ files, session-cookie storage policy, and CSP configs.`);
