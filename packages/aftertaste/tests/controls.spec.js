import { test, expect } from '@playwright/test';

/**
 * Slice 2 acceptance, in the real browser: pressing W actually moves the player.
 *
 * The unit test (tests/movement.test.mjs) proves the RULE is right. This proves the rule is
 * actually WIRED — that the key reaches the store and the store reaches the screen. A correct
 * function that nothing calls is the most common way a green suite hides a broken feature.
 */
test('holding W moves the player forward, and nothing throws', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  // Read the player's position out of the store, which is the same value the camera follows.
  const read = () => page.evaluate(() => window.__swanPlayerPos ?? null);

  // Wait for the CONDITION, not a duration. A fixed sleep here was too short on a cold vite start
  // (first request compiles React + three + R3F), so the test failed against a working app —
  // a flake caused by the test, not the game. Wait for the thing you actually need.
  await page.waitForFunction(() => window.__swanPlayerPos !== undefined, null, { timeout: 20_000 });
  const before = await read();
  expect(before, 'the game exposes the player position for testing').not.toBeNull();

  await page.locator('canvas').click(); // focus the window so key events land
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(100);

  const after = await read();
  expect(after.z, 'holding W should decrease z (forward)').toBeLessThan(before.z - 0.5);
  expect(Math.abs(after.x - before.x), 'W alone should not move sideways').toBeLessThan(0.01);
  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
