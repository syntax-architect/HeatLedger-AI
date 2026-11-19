import { test, expect } from '@playwright/test';

test.describe('Prompt D3: Mobile App Shell, Viewports and Safe Areas', () => {
  const VIEWPORTS = [
    { name: 'android-compact-360x640', width: 360, height: 640, isMobile: true },
    { name: 'iphone-390x844', width: 390, height: 844, isMobile: true },
    { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: true },
    { name: 'desktop-1366x768', width: 1366, height: 768, isMobile: false },
  ];

  for (const vp of VIEWPORTS) {
    test(`renders flawlessly on viewport ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');

      // Login to reach app shell
      const qaBtn = page.locator('button:has-text("QA Inspector")');
      if (await qaBtn.isVisible()) {
        await qaBtn.click();
        await page.locator('button[type="submit"]').click();
      }
      await page.waitForURL(/\/app/);

      // Verify ZERO horizontal scroll on all viewports (Prompt D3 core requirement)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      if (vp.isMobile) {
        // 1. Mobile Top App Bar
        const mobileTopBar = page.locator('header.lg\\:hidden');
        await expect(mobileTopBar).toBeVisible();

        // Plant switcher trigger visible
        await expect(mobileTopBar.locator('button[aria-label="Switch factory plant"]')).toBeVisible();

        // 2. Mobile Bottom Tab Bar with 4 tabs + center raised Capture button
        const bottomNav = page.locator('nav.lg\\:hidden');
        await expect(bottomNav).toBeVisible();

        const homeTab = bottomNav.locator('button[aria-label="Home Dashboard"]');
        const shipmentsTab = bottomNav.locator('button[aria-label="Customs Shipments"]');
        const captureBtn = bottomNav.locator('button[aria-label="Capture MTC or Export Document"]');
        const heatsTab = bottomNav.locator('button[aria-label="Heat Inventory & Mass Balance"]');
        const moreTab = bottomNav.locator('button[aria-label="More Workspaces and Controls"]');

        await expect(homeTab).toBeVisible();
        await expect(shipmentsTab).toBeVisible();
        await expect(captureBtn).toBeVisible();
        await expect(heatsTab).toBeVisible();
        await expect(moreTab).toBeVisible();

        // 3. Center Capture button opens CaptureChoiceModal
        await captureBtn.click();
        await expect(page.locator('text=Capture Mill Test Certificate (MTC)')).toBeVisible();
        await expect(page.locator('text=Snap Photo with Camera')).toBeVisible();
        await expect(page.locator('text=Upload PDF or Certificate Scan')).toBeVisible();

        // Close capture modal
        const closeCapture = page.locator('button[aria-label="Close sheet"]');
        if (await closeCapture.isVisible()) {
          await closeCapture.click();
        }

        // 4. More Tab opens Full-Screen More Sheet
        await moreTab.click();
        await expect(page.locator('text=More Workspaces & Controls')).toBeVisible();
        await expect(page.locator('text=CBAM Declarations')).toBeVisible();
        await expect(page.locator('text=Customs Dossiers')).toBeVisible();
        await expect(page.locator('text=Suppliers Registry')).toBeVisible();
        await expect(page.locator('text=Audit Reports')).toBeVisible();
        await expect(page.locator('text=Toggle Theme')).toBeVisible();

        // Close more sheet
        const closeMore = page.locator('button[aria-label="Close menu"]');
        if (await closeMore.isVisible()) {
          await closeMore.click();
        }
      } else {
        // Desktop (1366x768): Left sidebar + top header
        const desktopSidebar = page.locator('aside');
        await expect(desktopSidebar).toBeVisible();

        // Test Sidebar collapse/expand toggle
        const collapseBtn = desktopSidebar.locator('button[aria-label="Collapse sidebar"]');
        await expect(collapseBtn).toBeVisible();
        await collapseBtn.click();

        // Verify collapsed mode icon
        const expandBtn = desktopSidebar.locator('button[aria-label="Expand sidebar"]');
        await expect(expandBtn).toBeVisible();
        await expandBtn.click();

        // Test Command Palette with Ctrl+K / Cmd+K
        await page.keyboard.press('Control+k');
        await expect(page.locator('input[placeholder*="Search commands"]')).toBeVisible();
        await page.keyboard.press('Escape');
      }

      // Take screenshot for device QA gate
      await page.screenshot({
        path: `e2e/screenshots/shell-${vp.name}.png`,
        fullPage: false,
      });
    });
  }
});
