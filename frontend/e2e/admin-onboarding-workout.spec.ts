/**
 * Admin Onboarding & Workout Logger — Playwright E2E Tests
 * ========================================================
 *
 * Run:
 *   cd frontend
 *   npx playwright test e2e/admin-onboarding-workout.spec.ts --project="Desktop Chrome"
 *
 * 12 tests covering:
 *   - Admin Onboarding (4): page load, context menu, panel open, screenshot
 *   - Admin Workout Logger (6): context menu, modal open, form fields, dynamic exercises,
 *     validation, screenshot
 *   - Mobile viewport (2): responsive render, mobile screenshot
 *
 * Prerequisites:
 *   - Backend running with at least 1 client in the database
 *   - TEST_EMAIL / TEST_PASSWORD env vars set for an admin account
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper: log in as admin and navigate to client management
async function loginAndNavigateToClients(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(process.env.TEST_EMAIL || 'admin@sswanstudios.com');
  await passwordInput.fill(process.env.TEST_PASSWORD || 'testpassword');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Navigate to client management page
  await page.goto(`${BASE_URL}/dashboard/admin-clients`);
  // Wait for client management content to be present
  await page.waitForTimeout(3000);
}

// Helper: open context menu on first client row's action button
async function openFirstClientContextMenu(page: Page) {
  // Find the first action button (MoreVertical 3-dot icon button) in the client list
  const actionBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
  await expect(actionBtn).toBeVisible({ timeout: 10000 });
  await actionBtn.click();
  await page.waitForTimeout(500);
}

// ─── Admin Onboarding Tests ──────────────────────────────────────────────────

test.describe('Admin Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToClients(page);
  });

  test('1 — Client management page loads and displays content', async ({ page }) => {
    // Page must have loaded with visible content
    await expect(page.locator('body')).toBeVisible();
    // At minimum, there should be some text content present (heading, table, or placeholder)
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(0);
  });

  test('2 — Context menu shows Start Onboarding item', async ({ page }) => {
    await openFirstClientContextMenu(page);
    const onboardingItem = page.locator('[data-testid="menu-start-onboarding"]');
    await expect(onboardingItem).toBeVisible({ timeout: 5000 });
    await expect(onboardingItem).toContainText('Start Onboarding');
  });

  test('3 — Clicking Start Onboarding opens panel', async ({ page }) => {
    await openFirstClientContextMenu(page);
    const onboardingItem = page.locator('[data-testid="menu-start-onboarding"]');
    await expect(onboardingItem).toBeVisible({ timeout: 5000 });
    await onboardingItem.click();

    const panel = page.locator('[data-testid="admin-onboarding-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test('4 — Screenshot: admin onboarding panel', async ({ page }) => {
    await openFirstClientContextMenu(page);
    const onboardingItem = page.locator('[data-testid="menu-start-onboarding"]');
    await expect(onboardingItem).toBeVisible({ timeout: 5000 });
    await onboardingItem.click();

    const panel = page.locator('[data-testid="admin-onboarding-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/admin-onboarding-panel.png', fullPage: true });
  });
});

// ─── Admin Workout Logger Tests ──────────────────────────────────────────────

test.describe('Admin Workout Logger', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToClients(page);
  });

  test('5 — Context menu shows Log Workout item', async ({ page }) => {
    await openFirstClientContextMenu(page);
    const workoutItem = page.locator('[data-testid="menu-log-workout"]');
    await expect(workoutItem).toBeVisible({ timeout: 5000 });
    await expect(workoutItem).toContainText('Log Workout');
  });

  test('6 — Workout logger modal opens with form fields', async ({ page }) => {
    await openFirstClientContextMenu(page);
    const workoutItem = page.locator('[data-testid="menu-log-workout"]');
    await expect(workoutItem).toBeVisible({ timeout: 5000 });
    await workoutItem.click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="workout-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="workout-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="workout-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="workout-intensity"]')).toBeVisible();
  });

  test('7 — Can add exercises and sets dynamically', async ({ page }) => {
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should have 1 exercise card initially
    await expect(page.locator('[data-testid="exercise-card-0"]')).toBeVisible();

    // Add a second exercise
    await page.locator('[data-testid="add-exercise-btn"]').click();
    await expect(page.locator('[data-testid="exercise-card-1"]')).toBeVisible();

    // Add a set to first exercise
    await page.locator('[data-testid="add-set-0"]').click();
    await expect(page.locator('[data-testid="set-reps-0-1"]')).toBeVisible();
  });

  test('8 — Form rejects submit with empty fields', async ({ page }) => {
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click submit without filling anything
    await page.locator('[data-testid="workout-submit-btn"]').click();
    await page.waitForTimeout(500);

    // Modal must still be visible (not closed — validation prevented submit)
    await expect(modal).toBeVisible();
  });

  test('9 — Form controls meet 44px minimum touch target', async ({ page }) => {
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Submit button must meet 44px touch target
    const submitBtn = page.locator('[data-testid="workout-submit-btn"]');
    const submitBox = await submitBtn.boundingBox();
    expect(submitBox).not.toBeNull();
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);

    // Close button must meet 44px touch target
    const closeBtn = page.locator('[data-testid="workout-close-btn"]');
    const closeBox = await closeBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    expect(closeBox!.height).toBeGreaterThanOrEqual(44);
    expect(closeBox!.width).toBeGreaterThanOrEqual(44);
  });

  test('10 — Screenshot: workout logger form filled', async ({ page }) => {
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in form fields
    await page.locator('[data-testid="workout-title"]').fill('Upper Body Strength');
    await page.locator('[data-testid="workout-duration"]').fill('60');
    await page.locator('[data-testid="workout-intensity"]').fill('7');
    await page.locator('[data-testid="exercise-name-0"]').fill('Bench Press');
    await page.locator('[data-testid="set-reps-0-0"]').fill('10');
    await page.locator('[data-testid="set-weight-0-0"]').fill('135');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/workout-logger-filled.png', fullPage: true });
  });
});

// ─── Mobile Viewport Tests ──────────────────────────────────────────────────

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('11 — Workout logger renders correctly at 375px viewport', async ({ page }) => {
    await loginAndNavigateToClients(page);
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal must fit within 375px viewport
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test('12 — Screenshot: mobile workout logger at 375px', async ({ page }) => {
    await loginAndNavigateToClients(page);
    await openFirstClientContextMenu(page);
    await page.locator('[data-testid="menu-log-workout"]').click();

    const modal = page.locator('[data-testid="workout-logger-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/workout-logger-mobile-375.png', fullPage: true });
  });
});
