/**
 * Prompt M4: Production Bundle Size Budget Gate
 * Specification: Prompt Pack v3 - Phase 2 (M4)
 *
 * Enforces production build budgets:
 * - Initial JS bundle (index-*.js): <= 180 KB gzipped
 * - Route / vendor chunks: <= 60 KB gzipped
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_ASSETS = path.resolve('dist', 'assets');

if (!fs.existsSync(DIST_ASSETS)) {
  console.error(`Error: Assets directory not found at ${DIST_ASSETS}. Run 'npm run build' first.`);
  process.exit(1);
}

const jsFiles = fs.readdirSync(DIST_ASSETS).filter((file) => file.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error(`Error: Zero JavaScript assets found in ${DIST_ASSETS}.`);
  process.exit(1);
}

console.log('='.repeat(78));
console.log('PROMPT M4: PRODUCTION BUNDLE SIZE BUDGET VERIFICATION');
console.log('='.repeat(78));
console.log(`Analyzing ${jsFiles.length} JavaScript asset chunks in dist/assets...\n`);

let hasBudgetExceeded = false;
let maxInitialSizeKb = 0;
let maxChunkSizeKb = 0;

const INITIAL_BUDGET_KB = 180.0;
const ROUTE_CHUNK_BUDGET_KB = 60.0;

for (const file of jsFiles) {
  const filePath = path.join(DIST_ASSETS, file);
  const rawBytes = fs.readFileSync(filePath);
  const gzippedBytes = zlib.gzipSync(rawBytes);

  const rawKb = (rawBytes.length / 1024).toFixed(2);
  const gzipKb = (gzippedBytes.length / 1024).toFixed(2);
  const numGzipKb = parseFloat(gzipKb);

  const isInitial = file.startsWith('index-');
  const budgetKb = isInitial ? INITIAL_BUDGET_KB : ROUTE_CHUNK_BUDGET_KB;
  const chunkType = isInitial ? 'Initial App Entrypoint' : 'Route / Vendor Chunk';

  if (isInitial) {
    if (numGzipKb > maxInitialSizeKb) maxInitialSizeKb = numGzipKb;
  } else {
    if (numGzipKb > maxChunkSizeKb) maxChunkSizeKb = numGzipKb;
  }

  const passed = numGzipKb <= budgetKb;
  if (!passed) {
    hasBudgetExceeded = true;
  }

  const statusLabel = passed ? '[PASS]' : '[FAIL - BUDGET EXCEEDED]';
  console.log(
    `${statusLabel.padEnd(26)} ${file.padEnd(42)} ${rawKb.padStart(8)} KB raw  |  ${gzipKb.padStart(6)} KB gzip (limit: ${budgetKb} KB) [${chunkType}]`
  );
}

console.log('\n' + '-'.repeat(78));
console.log(`Peak Initial Entrypoint Size : ${maxInitialSizeKb.toFixed(2)} KB gzipped (Budget: <= ${INITIAL_BUDGET_KB} KB)`);
console.log(`Peak Route / Chunk Size      : ${maxChunkSizeKb.toFixed(2)} KB gzipped (Budget: <= ${ROUTE_CHUNK_BUDGET_KB} KB)`);
console.log('-'.repeat(78));

if (hasBudgetExceeded) {
  console.error('\nFAIL: One or more JavaScript bundles exceeded the Prompt M4 gzip size budget.');
  process.exit(1);
}

console.log('\nSUCCESS: All production JavaScript bundles strictly conform to Prompt M4 size budgets.');
process.exit(0);
