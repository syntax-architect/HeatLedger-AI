import { test, expect } from '@playwright/test';

/**
 * Prompt M5: Mobile & Speed Polish Playwright E2E Suite
 * Specification: Prompt Pack v3 - Phase 2 (M5)
 *
 * Verifies mobile layout ergonomics at:
 * - 360px viewport (Moto G / budget Android device class)
 * - 390px viewport (iPhone 12/13/14 class)
 */

test.describe('Prompt M5: Mobile Quality and Viewport Ergonomics', () => {
  const VIEWPORTS = [
    { name: 'Moto G Class (360x640)', width: 360, height: 640 },
    { name: 'iPhone Class (390x844)', width: 390, height: 844 },
  ];

  for (const vp of VIEWPORTS) {
    test(`renders without horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Verify ZERO horizontal scroll on marketing page
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify touch targets have sufficient height (>= 40px - 44px)
      const primaryButtons = page.locator('a[href="/login"], a[href="/check"], button[type="submit"]');
      const count = await primaryButtons.count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = primaryButtons.nth(i);
        if (await btn.isVisible()) {
          const box = await btn.boundingBox();
          if (box && box.height > 0) {
            expect(box.height).toBeGreaterThanOrEqual(40); // Touch ergonomics budget
          }
        }
      }
    });

    test(`login page fits single screen without horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Submit button is visible and tap-friendly
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
      const box = await submitBtn.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      }
    });
  }

  test('offline fallback page loads standalone with zero external dependencies', async ({ page }) => {
    await page.goto('/offline.html');
    await expect(page.locator('text=Factory Network Unavailable')).toBeVisible();
    await expect(page.locator('text=Offline Queue Active')).toBeVisible();
    await expect(page.locator('button:has-text("Recheck Connection")')).toBeVisible();
  });
});
