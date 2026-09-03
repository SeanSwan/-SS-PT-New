import { test, expect } from '@playwright/test';

/**
 * THE PERF GATE (Fable 5.1 review, F13).
 *
 * Nothing in this project measured frame time, and the cast just tripled its triangle count. A
 * suite can be entirely green while the game is unplayable at round 9 — the blueprint's own
 * "green suite, broken game" row.
 *
 * IT MEASURES A RATIO, NOT A NUMBER. The first version asserted an absolute budget and failed the
 * moment the suite ran alongside anything else: 23ms alone, 58ms under contention — the same code,
 * a different machine load. An absolute threshold on a shared machine tests the machine. So this
 * measures the SAME page twice — a near-empty board, then a full one — and asserts what the game
 * actually controls: how much a full wave costs relative to an idle frame. Absolute numbers are
 * still logged every run, because the trend is the value.
 */
const MAX_LOAD_RATIO = 3.0; // a full wave may cost up to 3x an idle frame

const sample = (page, frames = 200) => page.evaluate((n) => new Promise((resolve) => {
  const deltas = [];
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    deltas.push(now - last);
    last = now;
    if (deltas.length < n) requestAnimationFrame(tick);
    else resolve(deltas.slice(30)); // drop warm-up
  };
  requestAnimationFrame(tick);
}), frames);

const p = (xs, q) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)];

test('a full wave costs a bounded multiple of an idle frame', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanScene && window.__swanEnemyPos?.length > 0, null, { timeout: 20_000 });

  // BASELINE: an almost-empty board on this exact machine, right now.
  await page.evaluate(() => window.__swanGameStore.setState({ hp: 99999, enemies: [] }));
  await page.waitForTimeout(400);
  const idle = await sample(page);

  // LOADED: the wave cap, through the REAL spawner — real models, gaits, steering, round ticking.
  const spawned = await page.evaluate(async () => {
    const store = window.__swanGameStore;
    const mod = await import('/src/systems/waves.js');
    store.setState({ hp: 99999, enemies: mod.spawnRing(40, 14, 4, { x: 0, z: 0 }, 0) });
    await new Promise((r) => setTimeout(r, 1500)); // mature + models resolve
    return store.getState().enemies.length;
  });
  expect(spawned, 'the board really is loaded').toBeGreaterThanOrEqual(40);
  const loaded = await sample(page);

  const idleP50 = p(idle, 0.5);
  const loadP50 = p(loaded, 0.5);
  const ratio = loadP50 / idleP50;
  console.log(`[perf] ${spawned} mobs — idle p50 ${idleP50.toFixed(1)}ms · loaded p50 ${loadP50.toFixed(1)}ms · p95 ${p(loaded, 0.95).toFixed(1)}ms · ratio ${ratio.toFixed(2)}x`);
  expect(ratio, `a full wave cost ${ratio.toFixed(2)}x an idle frame (idle ${idleP50.toFixed(1)}ms)`)
    .toBeLessThan(MAX_LOAD_RATIO);
});
