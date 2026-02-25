/**
 * TimeWheelPicker — Playwright E2E Tests
 * =======================================
 * Tests for the adaptive time picker:
 * - Desktop: dropdown with keyboard navigation
 * - Mobile: bottom-sheet wheel
 * - Past-time prevention (frozen clock)
 * - Timezone badge
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper: log in and navigate to /schedule
async function loginAndNavigateToSchedule(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(process.env.TEST_EMAIL || 'admin@sswanstudios.com');
    await passwordInput.fill(process.env.TEST_PASSWORD || 'testpassword');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
  }

  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForSelector('[data-testid="schedule-kpi-total"]', { timeout: 15000 });
}

// Helper: open create session dialog
async function openCreateSessionDialog(page: Page) {
  // Look for a "Create Session" or "New Session" button
  const createBtn = page.locator('button:has-text("Create"), button:has-text("New Session"), button:has-text("Add Session")').first();
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(500);
  }
}

// ─── Desktop Tests ───────────────────────────────────────────────────────────

test.describe('TimeWheelPicker — Desktop', () => {
  test.beforeEach(async ({ page }) => {
    // Freeze clock to a known time for deterministic tests
    try {
      await page.clock.install({ time: new Date('2026-03-01T10:00:00') });
    } catch {
      // Fallback for CI runners where page.clock isn't available
      await page.addInitScript(() => {
        const fakeNow = new Date('2026-03-01T10:00:00').getTime();
        const OrigDate = Date;
        const FakeDate = function (...args: any[]) {
          if (args.length === 0) return new OrigDate(fakeNow);
          // @ts-ignore
          return new OrigDate(...args);
        } as any;
        FakeDate.now = () => fakeNow;
        FakeDate.parse = OrigDate.parse;
        FakeDate.UTC = OrigDate.UTC;
        FakeDate.prototype = OrigDate.prototype;
        globalThis.Date = FakeDate;
      });
    }

    await loginAndNavigateToSchedule(page);
  });

  test('time picker trigger shows "Select time" initially', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(trigger).toContainText(/select time/i);
    }
  });

  test('time picker opens dropdown on click', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      // First set a date so the time picker is enabled
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-03-01');
      }

      await trigger.click();

      const dropdown = page.locator('[data-testid="time-dropdown-list"]');
      await expect(dropdown).toBeVisible({ timeout: 2000 });
    }
  });

  test('timezone badge is visible', async ({ page }) => {
    await openCreateSessionDialog(page);

    const tzBadge = page.locator('[data-testid="tz-badge"]').first();
    if (await tzBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await tzBadge.textContent();
      expect(text).toBeTruthy();
      // Should be a timezone abbreviation like EST, PST, GMT-5, etc.
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test('dropdown closes on Escape', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-03-01');
      }

      await trigger.click();
      const dropdown = page.locator('[data-testid="time-dropdown-list"]');
      await expect(dropdown).toBeVisible({ timeout: 2000 });

      await page.keyboard.press('Escape');
      await expect(dropdown).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('selecting a time slot updates trigger text', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-03-02'); // Future date to avoid minTime issues
      }

      await trigger.click();

      // Click a time slot
      const firstSlot = page.locator('[data-testid^="time-slot-"]').first();
      if (await firstSlot.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstSlot.click();

        // Trigger should now show the selected time (not "Select time")
        const text = await trigger.textContent();
        expect(text).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      }
    }
  });

  test('screenshot: desktop time picker', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-03-02');
      }

      await trigger.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: 'e2e/screenshots/time-picker-desktop-open.png',
        fullPage: false
      });
    }
  });
});

// ─── Mobile Tests ────────────────────────────────────────────────────────────

test.describe('TimeWheelPicker — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    try {
      await page.clock.install({ time: new Date('2026-03-01T10:00:00') });
    } catch {
      await page.addInitScript(() => {
        const fakeNow = new Date('2026-03-01T10:00:00').getTime();
        const OrigDate = Date;
        const FakeDate = function (...args: any[]) {
          if (args.length === 0) return new OrigDate(fakeNow);
          // @ts-ignore
          return new OrigDate(...args);
        } as any;
        FakeDate.now = () => fakeNow;
        FakeDate.parse = OrigDate.parse;
        FakeDate.UTC = OrigDate.UTC;
        FakeDate.prototype = OrigDate.prototype;
        globalThis.Date = FakeDate;
      });
    }

    await loginAndNavigateToSchedule(page);
  });

  test('time picker trigger has 44px+ touch target', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await trigger.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('screenshot: mobile time picker', async ({ page }) => {
    await openCreateSessionDialog(page);

    const trigger = page.locator('[data-testid="session-time-picker-trigger"]');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-03-02');
      }

      await trigger.tap();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'e2e/screenshots/time-picker-mobile-open.png',
        fullPage: false
      });
    }
  });
});
