import { test, expect } from '@playwright/test';
import { admitted, admittedType, immortal } from './helpers.js';

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
  await admitted(page);

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

test('the player is faster than the enemies, measured, not assumed', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await admitted(page);

  // This used to hold S and assert the nearest enemy got further away. That was only true while
  // every enemy spawned on one side; Slice 5 spawns them on a RING around the player, so running
  // "away" runs toward the far side of the ring. The test assumption died, not the game.
  //
  // What "you can outrun them" actually MEANS is: in the same interval, the player covers more
  // ground than any enemy. That is true whatever the geometry.
  const sample = () => page.evaluate(() => ({
    player: { ...window.__swanPlayerPos },
    enemies: window.__swanEnemyPos.map((e) => ({ x: e.x, z: e.z })),
  }));

  await page.locator('canvas').click();
  // TEST-DELTA (S6a): the map has COVER now, and the counter sits directly south of the origin —
  // walking 'away' from spawn ran into it after 0.6 units and the test read that as a slow player.
  // Start clear of the furniture and walk along the room's long axis instead.
  await page.evaluate(() => { window.__swanAim.yaw = 0; window.__swanTeleport?.({ x: -8, z: 6 }); });
  await page.waitForTimeout(150);
  const before = await sample();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyD');
  const after = await sample();

  const moved = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const playerMoved = moved(before.player, after.player);
  const enemyMoved = Math.max(
    ...before.enemies.map((e, i) => (after.enemies[i] ? moved(e, after.enemies[i]) : 0)),
  );

  expect(playerMoved, 'the player actually moved').toBeGreaterThan(0.5);
  expect(playerMoved, `player ${playerMoved} must outpace fastest enemy ${enemyMoved}`)
    .toBeGreaterThan(enemyMoved);
});
