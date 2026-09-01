import { test, expect } from '@playwright/test';

/**
 * Slice 5 acceptance: a round you can lose, and go again.
 *
 * The unit tests prove the round RULES. This proves the loop is wired end to end: damage reaches
 * the HUD, death shows a screen, and restart genuinely resets rather than just hiding the overlay.
 */
test('the round starts with full hp on wave 1', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('hud-wave')).toHaveText('Wave: 1');
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 3');
  await expect(page.getByTestId('gameover')).toHaveCount(0);
});

test('clearing every enemy advances the wave and spawns a bigger one', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanEnemyPos?.length > 0, null, { timeout: 20_000 });

  const firstWaveSize = await page.evaluate(() => window.__swanEnemyPos.length);

  // Kill everything by shooting straight down at each enemy, wherever it currently is (the FPS
  // model: shoot() takes a ray; a vertical ray over the target is the deterministic aim). Polled,
  // because freshly spawned enemies are briefly UNSHOOTABLE (fair-spawn protection) — keep firing
  // until the wave actually clears.
  await page.waitForFunction(() => {
    const store = window.__swanGameStore;
    for (const e of store.getState().enemies.map((x) => ({ x: x.x, z: x.z }))) {
      store.getState().shoot({ x: e.x, y: 10, z: e.z }, { x: 0, y: -1, z: 0 });
    }
    return store.getState().wave >= 2;
  }, null, { timeout: 15_000, polling: 100 });

  await expect(page.getByTestId('hud-wave')).toHaveText('Wave: 2', { timeout: 10_000 });
  // Count what holds the wave: corpses from wave 1 may still be toppling on the board.
  const secondWaveSize = await page.evaluate(
    () => window.__swanGameStore.getState().enemies.filter((e) => e.state !== 'dying').length,
  );
  expect(secondWaveSize, 'wave 2 must be bigger than wave 1').toBeGreaterThan(firstWaveSize);
});

test('losing all hp ends the round, and Go again really resets it', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanRound, null, { timeout: 20_000 });

  // Kill the player by putting an enemy on top of them, repeatedly. The invulnerability window
  // means this takes a moment of real time — which is the point of that window.
  await page.evaluate(() => {
    const store = window.__swanGameStore;
    const player = window.__swanPlayerPos;
    for (const e of store.getState().enemies) { e.x = player.x; e.z = player.z; }
  });

  await expect(page.getByTestId('gameover')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 0');

  await page.getByTestId('restart').click();

  await expect(page.getByTestId('gameover')).toHaveCount(0);
  await expect(page.getByTestId('hud-hp')).toHaveText('HP: 3');
  await expect(page.getByTestId('hud-wave')).toHaveText('Wave: 1');
  await expect(page.getByTestId('hud-kills')).toHaveText('Kills: 0');
  // Restart must respawn enemies, not leave an empty board that instantly advances the wave.
  const left = await page.evaluate(() => window.__swanGameStore.getState().enemies.length);
  expect(left, 'restart must respawn a wave').toBeGreaterThan(0);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
