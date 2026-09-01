import { test, expect } from '@playwright/test';

/**
 * The world is translation-invariant: floor, grid, and sun all follow the player.
 *
 * Why this exists — a defect no assertion caught: the grid was a fixed 50x50 object, and after
 * ~9 units of travel the lines running along the camera's view direction stopped drawing (the GL
 * layer on Windows mishandles clipping lines whose endpoint is far behind the camera). Scene graph
 * unchanged, suite green, half the grid gone. A screenshot found it; this test guards the FIX —
 * the anchors move with the player — because "the grid actually rasterized its lines" is not
 * reachable from JS. See CONCEPTS/debugging-by-elimination.md.
 *
 * The grid must land on WHOLE units: it snaps to its own 1-unit cell so its lines sit exactly
 * where an infinite grid's lines would. A grid that glides continuously with the player destroys
 * the very motion cue it exists to provide.
 */
test('floor, grid and sun follow the player; the grid snaps to whole units', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__swanScene && window.__swanPlayerPos), undefined, { timeout: 20_000 });

  // Drive far enough that the old fixed-world defect would fire (it appeared at ~9 units).
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__swanPlayerPos.z < -11, undefined, { timeout: 10_000 });
  await page.keyboard.up('w');
  // One settled frame so the useFrame followers run after the final position write.
  await page.waitForTimeout(100);

  const world = await page.evaluate(() => {
    const out = { player: window.__swanPlayerPos };
    window.__swanScene.traverse((o) => {
      if (o.name === 'ground') out.floor = { x: o.position.x, z: o.position.z };
      if (o.type === 'GridHelper') out.grid = { x: o.position.x, z: o.position.z };
      if (o.isDirectionalLight) out.sun = { x: o.position.x, z: o.position.z, tx: o.target.position.x, tz: o.target.position.z };
    });
    return out;
  });

  // Floor glides continuously with the player.
  expect(Math.abs(world.floor.x - world.player.x)).toBeLessThan(0.01);
  expect(Math.abs(world.floor.z - world.player.z)).toBeLessThan(0.01);

  // Grid stays within one cell of the player AND sits on exact whole units.
  expect(Math.abs(world.grid.x - world.player.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(world.grid.z - world.player.z)).toBeLessThanOrEqual(0.5);
  // Math.abs also normalizes -0: (-12 % 1) is -0 in JS, and Object.is(-0, 0) is false.
  expect(Math.abs(world.grid.x % 1), 'grid x is a whole unit').toBe(0);
  expect(Math.abs(world.grid.z % 1), 'grid z is a whole unit').toBe(0);

  // The sun keeps its OFFSET (direction is what shading comes from) and its target on the player.
  expect(Math.abs(world.sun.x - (world.player.x + 12))).toBeLessThan(0.01);
  expect(Math.abs(world.sun.z - (world.player.z + 8))).toBeLessThan(0.01);
  expect(Math.abs(world.sun.tx - world.player.x)).toBeLessThan(0.01);
  expect(Math.abs(world.sun.tz - world.player.z)).toBeLessThan(0.01);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
