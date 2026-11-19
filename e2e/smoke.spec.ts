import { test, expect } from '@playwright/test';

test.describe('HeatLedger AI Core User Smoke Journey', () => {
  test('1. Landing Page Smoke: Renders hero, simulator, and canonical disclaimer', async ({ page }) => {
    await page.goto('/');

    // Check title and hero text
    await expect(page).toHaveTitle(/HeatLedger/i);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    // Check standard disclaimer in footer
    const footer = page.locator('footer');
    await expect(footer).toContainText('HeatLedger supports compliance preparation');
  });

  test('2. Authentication Flow: Logs in with Demo QA Inspector credentials', async ({ page }) => {
    await page.goto('/login');

    // Verify login page loaded
    await expect(page.locator('text=Sign in to HeatLedger')).toBeVisible();

    // Select QA Inspector demo account
    const qaButton = page.locator('button:has-text("QA Inspector")');
    if (await qaButton.isVisible()) {
      await qaButton.click();
    }

    // Submit login form
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Successfully navigates to /app
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('text=Command Center').first()).toBeVisible();
  });

  test('3. Factory App Workbench Navigation: Inspects tabs and views', async ({ page }) => {
    // Navigate straight to /app (will use session or demo auto-auth)
    await page.goto('/login');
    const qaButton = page.locator('button:has-text("QA Inspector")');
    if (await qaButton.isVisible()) {
      await qaButton.click();
      await page.locator('button[type="submit"]').click();
    }
    await page.waitForURL(/\/app/);

    // Verify sidebar navigation items
    await expect(page.locator('button:has-text("Command Center")').first()).toBeVisible();
    await expect(page.locator('button:has-text("MTC Workbench")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Heat Inventory")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign-Off Queue")').first()).toBeVisible();
    await expect(page.locator('button:has-text("CBAM Dossier")').first()).toBeVisible();

    // Switch to MTC Workbench
    await page.locator('button:has-text("MTC Workbench")').first().click();
    await expect(page.locator('text=EN 10204 3.1 Verification Workbench').first()).toBeVisible();

    // Switch to Heat Inventory
    await page.locator('button:has-text("Heat Inventory")').first().click();
    await expect(page.locator('text=Heat Allocation Ledger').first()).toBeVisible();

    // Switch to Sign-Off Queue
    await page.locator('button:has-text("Sign-Off Queue")').first().click();
    await expect(page.locator('text=Digital Sign-Off Queue').first()).toBeVisible();
  });

  test('4. Public Tamper & Verification Page: Verifies /verify loads', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.locator('text=Certificate Integrity & Signature Verifier').first()).toBeVisible();
    await expect(page.locator('text=Drop Certificate Package').first()).toBeVisible();
  });
});
