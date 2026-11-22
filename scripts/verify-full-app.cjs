const { chromium } = require('@playwright/test');

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 STARTING FULL DEEP APPLICATION AUDIT & DEBUGGING');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      // Ignore normal guest 401 or expected network favicon logs
      if (!text.includes('favicon') && !text.includes('DevTools') && !text.includes('401 (Unauthorized)')) {
        errors.push(`[Console Error] ${text}`);
      }
    } else if (msg.type() === 'warning') {
      warnings.push(`[Console Warn] ${text}`);
    } else {
      consoleLogs.push(`[Console Log] ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Uncaught Page Error] ${err.message}\n${err.stack}`);
  });

  page.on('requestfailed', req => {
    // Only capture unexpected failures (ignore vite module aborts during quick navigation)
    const url = req.url();
    const errorText = req.failure()?.errorText || '';
    if (
      !url.includes('favicon') &&
      !url.includes('.map') &&
      !url.includes('/api/auth/me') &&
      !url.includes('fonts.googleapis.com') &&
      !errorText.includes('ERR_ABORTED')
    ) {
      errors.push(`[Network Request Failed] ${req.method()} ${url}: ${errorText}`);
    }
  });

  const results = [];
  function record(step, ok, details = '') {
    results.push({ step, ok, details });
    console.log(`${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${step} ${details ? '- ' + details : ''}`);
  }

  try {
    // ----------------------------------------------------
    // STEP 1: Landing Page & Public Navigation
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Landing Page (/) ---');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const title = await page.title();
    record('Landing Page Title', title.includes('HeatLedger'), `Title: "${title}"`);

    const hero = await page.locator('h1').first().textContent();
    record('Landing Hero Heading', !!hero, `Hero: "${hero?.trim().substring(0, 50)}..."`);

    // Verify footer disclaimer
    const footerText = await page.locator('footer').textContent();
    record('Legal Notice Disclaimer', footerText.includes('compliance preparation'), 'Legal disclaimer verified');

    // ----------------------------------------------------
    // STEP 2: Language Switcher on Landing Page
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Language Switcher on Landing Page ---');
    const langBtn = page.locator('button[aria-label="Select Language"], button:has-text("English")').first();
    const hasLangBtn = await langBtn.isVisible();
    record('Landing Language Switcher Button Visible', hasLangBtn);

    if (hasLangBtn) {
      // Switch to Hindi
      await langBtn.click();
      await page.waitForTimeout(300);
      const hiOption = page.locator('button:has-text("हिन्दी")').first();
      if (await hiOption.isVisible()) {
        await hiOption.click();
        await page.waitForTimeout(500);
        const rootLang = await page.locator('html').getAttribute('lang');
        record('Language switch to Hindi (hi)', rootLang === 'hi', `HTML lang: ${rootLang}`);
      }

      // Switch to Bengali
      const langBtn2 = page.locator('button:has-text("हिन्दी")').first();
      await langBtn2.click();
      await page.waitForTimeout(300);
      const bnOption = page.locator('button:has-text("বাংলা")').first();
      if (await bnOption.isVisible()) {
        await bnOption.click();
        await page.waitForTimeout(500);
        const rootLangBn = await page.locator('html').getAttribute('lang');
        record('Language switch to Bengali (bn)', rootLangBn === 'bn', `HTML lang: ${rootLangBn}`);
      }

      // Switch to German
      const langBtn3 = page.locator('button:has-text("বাংলা")').first();
      await langBtn3.click();
      await page.waitForTimeout(300);
      const deOption = page.locator('button:has-text("Deutsch")').first();
      if (await deOption.isVisible()) {
        await deOption.click();
        await page.waitForTimeout(500);
        const rootLangDe = await page.locator('html').getAttribute('lang');
        record('Language switch to German (de)', rootLangDe === 'de', `HTML lang: ${rootLangDe}`);
      }

      // Switch back to English
      const langBtn4 = page.locator('button:has-text("Deutsch")').first();
      await langBtn4.click();
      await page.waitForTimeout(300);
      const enOption = page.locator('button:has-text("English")').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(500);
        const rootLangEn = await page.locator('html').getAttribute('lang');
        record('Language switch back to English (en)', rootLangEn === 'en', `HTML lang: ${rootLangEn}`);
      }
    }

    // ----------------------------------------------------
    // STEP 3: Public Verifier (/verify)
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Public Verification Page (/verify) ---');
    await page.goto('http://localhost:3000/verify', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const verifyHeader = await page.locator('text=Certificate Integrity & Signature Verifier').first().isVisible();
    record('Public Verifier Header Visible', verifyHeader);

    // ----------------------------------------------------
    // STEP 4: Login Flow (/login)
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Authentication Flow (/login) ---');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const qaBtn = page.locator('button:has-text("QA Inspector")').first();
    const hasQaBtn = await qaBtn.isVisible();
    record('Demo Account Quick Fill Button', hasQaBtn);

    if (hasQaBtn) {
      await qaBtn.click();
      await page.waitForTimeout(300);
    }

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForURL(/.*\/app.*/, { timeout: 8000 });
    const currentUrl = page.url();
    record('Redirect to Authenticated /app', currentUrl.includes('/app'), `URL: ${currentUrl}`);

    // ----------------------------------------------------
    // STEP 5: Command Center View & Navigation
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Command Center View ---');
    await page.goto('http://localhost:3000/app/command', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const commandCenterHeading = await page.getByRole('heading', { name: /Command Center/i }).first().isVisible().catch(() => false)
      || await page.getByText('Command Center').first().isVisible();
    record('Command Center Title / Header Visible', commandCenterHeading);

    // Check KPI metric cards
    const kpiCount = await page.locator('.kpi-card, [data-testid="kpi-card"]').count();
    const hasKpiText = await page.getByText(/Verified Precursors/i).first().isVisible().catch(() => false);
    record('KPI Metric Cards Rendered', kpiCount > 0 || hasKpiText, `Cards: ${kpiCount}, HasText: ${hasKpiText}`);

    // Check zero horizontal overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    record('Responsive Ergonomics (Zero Horizontal Overflow)', !hasOverflow);

    // ----------------------------------------------------
    // STEP 6: Core Workspaces Navigation & Validation
    // ----------------------------------------------------
    const workspaces = [
      { name: 'MTC Workbench', hash: 'certificates', checkText: 'Certificate Review Workbench' },
      { name: 'Heat Inventory', hash: 'heats', checkText: 'Heat Inventory Ledger' },
      { name: 'Sign-Off Queue', hash: 'sign-off', checkText: 'Sign-Off Queue' },
      { name: 'CBAM Dossier', hash: 'dossiers', checkText: 'CBAM' },
      { name: 'Regulation Radar', hash: 'radar', checkText: 'Regulation' },
      { name: 'Intake Channels', hash: 'intake', checkText: 'Intake' },
      { name: 'Supplier Intelligence', hash: 'suppliers', checkText: 'Supplier' },
      { name: 'Audit Trail', hash: 'audit', checkText: 'Audit' },
      { name: 'ROI Analytics', hash: 'roi', checkText: 'ROI' },
      { name: 'Settings & Language', hash: 'settings', checkText: 'Settings' },
    ];

    console.log('\n--- 6. Testing Workspace Views Navigation ---');
    for (const ws of workspaces) {
      await page.goto(`http://localhost:3000/app/${ws.hash}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const contentFound = await page.getByText(ws.checkText).first().isVisible().catch(() => false);
      record(`Workspace: ${ws.name}`, contentFound, `Matched: "${ws.checkText}"`);
    }

    // ----------------------------------------------------
    // STEP 7: Settings View - In-App Multilingual Switcher
    // ----------------------------------------------------
    console.log('\n--- 7. Testing In-App Settings Language Controls ---');
    await page.goto('http://localhost:3000/app/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Verify all 4 language cards exist in SettingsView
    const hasEnCard = await page.locator('text=English').first().isVisible();
    const hasHiCard = await page.locator('text=हिन्दी').first().isVisible();
    const hasBnCard = await page.locator('text=বাংলা').first().isVisible();
    const hasDeCard = await page.locator('text=Deutsch').first().isVisible();
    record('Settings Language Options Rendered', hasEnCard && hasHiCard && hasBnCard && hasDeCard, 'EN, HI, BN, DE visible');

    // Test switching to Bengali in Settings
    const bnCard = page.locator('button:has-text("বাংলা")').first();
    if (await bnCard.isVisible()) {
      await bnCard.click();
      await page.waitForTimeout(500);
      const bnRoot = await page.locator('html').getAttribute('lang');
      record('Settings Switch to Bengali (বাংলা)', bnRoot === 'bn', `HTML lang: ${bnRoot}`);
    }

    // Test switching to German in Settings
    const deCard = page.locator('button:has-text("Deutsch")').first();
    if (await deCard.isVisible()) {
      await deCard.click();
      await page.waitForTimeout(500);
      const deRoot = await page.locator('html').getAttribute('lang');
      record('Settings Switch to German (Deutsch)', deRoot === 'de', `HTML lang: ${deRoot}`);
    }

    // Switch back to English
    const enCard = page.locator('button:has-text("English")').first();
    if (await enCard.isVisible()) {
      await enCard.click();
      await page.waitForTimeout(500);
      const enRoot = await page.locator('html').getAttribute('lang');
      record('Settings Switch back to English', enRoot === 'en', `HTML lang: ${enRoot}`);
    }

    // ----------------------------------------------------
    // STEP 8: Command Palette (Ctrl+K)
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Command Palette (Ctrl+K) ---');
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(400);
    const searchInput = page.locator('input[placeholder*="Search commands"], input[placeholder*="search"]').first();
    const cmdPaletteVisible = await searchInput.isVisible();
    record('Command Palette Opened with Ctrl+K', cmdPaletteVisible);

    if (cmdPaletteVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const closed = !(await searchInput.isVisible());
      record('Command Palette Closed with Escape', closed);
    }

  } catch (err) {
    errors.push(`[Test Execution Error] ${err.message}\n${err.stack}`);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('📊 AUDIT SUMMARY REPORT');
  console.log('====================================================');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`Passed checks: ${passed}/${results.length}`);
  console.log(`Failed checks: ${failed}/${results.length}`);

  if (errors.length > 0) {
    console.log('\n🚨 DETECTED RUNTIME ISSUES & ERRORS:');
    errors.forEach((err, idx) => console.log(`${idx + 1}. ${err}`));
  } else {
    console.log('\n✨ ZERO RUNTIME ERRORS DETECTED!');
  }

  console.log('====================================================\n');
  process.exit(failed > 0 || errors.length > 0 ? 1 : 0);
}

runAudit();
