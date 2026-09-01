import { test, expect } from '@playwright/test';

/**
 * Slice 3 acceptance, in the browser: the enemies actually close in on the player.
 *
 * The unit tests prove the steering MATHS. This proves it is WIRED — that the flock reads the
 * player's live position each frame and moves. A correct steering function that nothing calls
 * looks exactly like a working game until you try to play it.
 */
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('enemies close in on the player, and nothing throws', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanEnemyPos?.length > 0, null, { timeout: 20_000 });

  const read = () => page.evaluate(() => ({
    player: window.__swanPlayerPos,
    enemies: window.__swanEnemyPos,
  }));

  const before = await read();
  expect(before.enemies.length, 'a flock exists').toBeGreaterThan(1);
  const gapBefore = before.enemies.map((e) => dist(e, before.player));

  // Stand still and let them come.
  await page.waitForTimeout(1500);

  const after = await read();
  const gapAfter = after.enemies.map((e) => dist(e, after.player));

  for (let i = 0; i < gapBefore.length; i++) {
    expect(gapAfter[i], `enemy ${i} should be closer (${gapBefore[i]} -> ${gapAfter[i]})`)
      .toBeLessThan(gapBefore[i]);
  }

  // No NaN: one NaN position silently removes a monster from the visible world with no error.
  for (const e of after.enemies) {
    expect(Number.isFinite(e.x) && Number.isFinite(e.z), `enemy position ${JSON.stringify(e)}`).toBe(true);
  }

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});

test('the player can outrun them — they are slower, by design', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanEnemyPos?.length > 0, null, { timeout: 20_000 });

  const nearest = async () => page.evaluate(() => {
    const p = window.__swanPlayerPos;
    return Math.min(...window.__swanEnemyPos.map((e) => Math.hypot(e.x - p.x, e.z - p.z)));
  });

  const before = await nearest();
  await page.locator('canvas').click();
  // Run AWAY from them: they start at -z, so hold S (+z).
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyS');

  const after = await nearest();
  expect(after, `running away should open the gap (${before} -> ${after})`).toBeGreaterThan(before);
});
