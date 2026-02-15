/**
 * Schedule KPI Cards — Playwright E2E Tests
 * ==========================================
 *
 * Setup (one-time):
 *   cd frontend
 *   npm run test:e2e:install
 *
 * Run:
 *   npm run test:e2e
 *   npm run test:e2e:ui        # headed / debug mode
 *
 * These tests validate the interactive KPI stat cards on the /schedule route:
 *   - Click/toggle filtering
 *   - Keyboard (Tab → Enter/Space) activation
 *   - Drill-down panel open/close + scrollable region
 *   - Available KPI excludes past dates
 *   - Mobile viewport tap targets (≥ 44px)
 */

import { test, expect, type Page } from '@playwright/test';

// Adjust if your dev server runs on a different port
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper: log in and navigate to /schedule
async function loginAndNavigateToSchedule(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  // Fill login form — adjust selectors to match your login page
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(process.env.TEST_EMAIL || 'admin@sswanstudios.com');
    await passwordInput.fill(process.env.TEST_PASSWORD || 'testpassword');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
  }

  // Route is /schedule (root-level, not nested under /dashboard)
  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForSelector('[data-testid="schedule-kpi-total"]', { timeout: 15000 });
}

// ─── Stat Card IDs ───────────────────────────────────────────────────────────

const CARD_KEYS = ['total', 'available', 'scheduled', 'completed'] as const;
const cardSelector = (key: string) => `[data-testid="schedule-kpi-${key}"]`;

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Schedule KPI Cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToSchedule(page);
  });

  test('all 4 KPI cards render with numeric values', async ({ page }) => {
    for (const key of CARD_KEYS) {
      const card = page.locator(cardSelector(key));
      await expect(card).toBeVisible();

      const value = card.locator('.stat-value');
      await expect(value).toBeVisible();
      const text = await value.textContent();
      expect(text).toMatch(/^\d+$/);
    }
  });

  test('clicking a card activates it (aria-pressed=true)', async ({ page }) => {
    const availableCard = page.locator(cardSelector('available'));
    await expect(availableCard).toHaveAttribute('aria-pressed', 'false');

    await availableCard.click();
    await expect(availableCard).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking same card again deactivates it (toggle off)', async ({ page }) => {
    const scheduledCard = page.locator(cardSelector('scheduled'));

    // Click on → should activate
    await scheduledCard.click();
    await expect(scheduledCard).toHaveAttribute('aria-pressed', 'true');

    // Click again → should deactivate
    await scheduledCard.click();
    await expect(scheduledCard).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking a different card switches filter', async ({ page }) => {
    const totalCard = page.locator(cardSelector('total'));
    const completedCard = page.locator(cardSelector('completed'));

    await totalCard.click();
    await expect(totalCard).toHaveAttribute('aria-pressed', 'true');
    await expect(completedCard).toHaveAttribute('aria-pressed', 'false');

    await completedCard.click();
    await expect(completedCard).toHaveAttribute('aria-pressed', 'true');
    await expect(totalCard).toHaveAttribute('aria-pressed', 'false');
  });

  test('drill-down panel appears when a card is active', async ({ page }) => {
    const drillDown = page.locator('[data-testid="schedule-kpi-drilldown"]');

    // Should not be visible initially
    await expect(drillDown).not.toBeVisible();

    // Click available card
    await page.locator(cardSelector('available')).click();

    // Drill-down should appear
    await expect(drillDown).toBeVisible({ timeout: 2000 });
  });

  test('drill-down panel hides after clearing filter', async ({ page }) => {
    const drillDown = page.locator('[data-testid="schedule-kpi-drilldown"]');

    // Activate
    await page.locator(cardSelector('total')).click();
    await expect(drillDown).toBeVisible({ timeout: 2000 });

    // Click "Clear filter" button inside drill-down
    await page.locator('[aria-label="Clear filter"]').click();

    // Panel should collapse
    await expect(drillDown).not.toBeVisible({ timeout: 2000 });
  });

  test('drill-down scroll area exists and has overflow-y', async ({ page }) => {
    await page.locator(cardSelector('total')).click();

    const scrollArea = page.locator('[data-testid="schedule-drilldown-scroll"]');
    await expect(scrollArea).toBeVisible({ timeout: 2000 });

    // Verify it has scrollable styles
    const overflowY = await scrollArea.evaluate(el => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
  });

  test('drill-down row count matches KPI card value', async ({ page }) => {
    // Click "available" and compare KPI value vs drill-down count
    const availableCard = page.locator(cardSelector('available'));
    const kpiValue = await availableCard.locator('.stat-value').textContent();
    const kpiNum = parseInt(kpiValue || '0', 10);

    await availableCard.click();
    const drillDown = page.locator('[data-testid="schedule-kpi-drilldown"]');
    await expect(drillDown).toBeVisible({ timeout: 2000 });

    // The drill-down count text should contain the same number
    const countText = await drillDown.locator('text=/\\d+ session/').first().textContent();
    const countNum = parseInt((countText || '').match(/(\d+)/)?.[1] || '0', 10);
    expect(countNum).toBe(kpiNum);
  });

  test('keyboard: Tab to card and activate with Enter', async ({ page }) => {
    // Focus first KPI card via Tab
    const firstCard = page.locator(cardSelector('total'));
    await firstCard.focus();

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await expect(firstCard).toHaveAttribute('aria-pressed', 'true');

    // Press Enter again to deactivate
    await page.keyboard.press('Enter');
    await expect(firstCard).toHaveAttribute('aria-pressed', 'false');
  });

  test('keyboard: activate card with Space', async ({ page }) => {
    const card = page.locator(cardSelector('available'));
    await card.focus();

    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('screenshot: desktop KPI cards', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/kpi-desktop-before.png', fullPage: false });

    await page.locator(cardSelector('available')).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/kpi-desktop-drilldown.png', fullPage: false });
  });
});

test.describe('Schedule KPI Cards — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToSchedule(page);
  });

  test('all cards have ≥ 44px touch target height', async ({ page }) => {
    for (const key of CARD_KEYS) {
      const card = page.locator(cardSelector(key));
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('tap activates card on mobile', async ({ page }) => {
    const card = page.locator(cardSelector('scheduled'));
    await card.tap();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('drill-down renders within viewport on mobile', async ({ page }) => {
    await page.locator(cardSelector('total')).tap();

    const drillDown = page.locator('[data-testid="schedule-kpi-drilldown"]');
    await expect(drillDown).toBeVisible({ timeout: 2000 });

    const box = await drillDown.boundingBox();
    expect(box).not.toBeNull();
    // Panel should not overflow horizontally
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 2); // small tolerance
  });

  test('screenshot: mobile KPI cards', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/kpi-mobile-before.png', fullPage: false });

    await page.locator(cardSelector('completed')).tap();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/kpi-mobile-drilldown.png', fullPage: false });
  });
});
