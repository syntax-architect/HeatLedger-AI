import { test, expect } from '@playwright/test';

/**
 * Prompt M2: One Clear Flow (Upload, Review, Add to Shipment, Download)
 * Validates the core 4-step linear flow at both 360px mobile and 1280px desktop viewports.
 */

const VIEWPORTS = [
  { name: 'Mobile (360px)', width: 360, height: 740 },
  { name: 'Desktop (1280px)', width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Prompt M2: 4-Step Flow on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('walks through upload, review, add to shipment, and download buyer pack', async ({ page }) => {
      // 1. Visit app upload/review
      await page.goto('/login');
      const qaBtn = page.locator('button:has-text("QA Inspector")');
      if (await qaBtn.isVisible()) {
        await qaBtn.click();
        await page.locator('button[type="submit"]').click();
      }
      await page.waitForURL(/\/app/);

      // Go to upload flow
      await page.goto('/app/upload');

      // Verify Stepper is visible
      const progressNav = page.locator('nav[aria-label="Progress"]');
      await expect(progressNav).toBeVisible();

      // Step 1: Upload step
      await page.click('button:has-text("1. Upload")');
      await expect(page.locator('text=Step 1: Upload Inspection Certificate')).toBeVisible();
      await expect(page.locator('text=Drop MTC here or tap to browse')).toBeVisible();

      // Step 2: Review step
      await page.click('button:has-text("Use Sample MTC (Auto-Demo)")');
      await expect(page.locator('text=8 Core Certificate Fields')).toBeVisible();

      // Step 3: Add to shipment step
      await page.click('button:has-text("3. Add to Shipment")');
      await expect(page.locator('text=Step 3: Add to Export Shipment')).toBeVisible();
      await expect(page.locator('text=Statutory Readiness Checklist')).toBeVisible();

      // Step 4: Download Buyer pack
      await page.click('button:has-text("Confirm & Build Buyer Pack")');
      await expect(page.locator('text=Step 4: Buyer Pack Ready for Download')).toBeVisible();
      await expect(page.locator('text=Buyer Pack Contents')).toBeVisible();
      await expect(page.locator('text=Download Buyer Pack (PDF)')).toBeVisible();
    });
  });
}
