import { test, expect } from '@playwright/test';
import { admitted, immortal } from './helpers.js';

/**
 * S6b in the browser: the barricade is a real bottleneck, not a queue rule in a comment.
 * These are the claims the whole round design rests on, checked against the running game.
 */

const boot = async (page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanGameStore, null, { timeout: 20_000 });
  await immortal(page);
};

test('monsters wait OUTSIDE and are let in one at a time', async ({ page }) => {
  await boot(page);
  await admitted(page);

  // Over a stretch of play there is always work queued outside — the room never receives the
  // whole round at once. That IS the shape change: pressure has a place.
  const seen = await page.evaluate(async () => {
    let maxOutside = 0; let maxClimbing = 0; let sawQueue = false;
    for (let i = 0; i < 90; i++) {
      const st = window.__swanGameStore.getState();
      const outside = st.enemies.filter((e) => e.outside).length;
      const climbing = Object.values(st.windows).filter((w) => w.climbing).length;
      maxOutside = Math.max(maxOutside, outside);
      maxClimbing = Math.max(maxClimbing, climbing);
      if (outside > 0) sawQueue = true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return { maxOutside, maxClimbing, sawQueue, windows: Object.keys(window.__swanGameStore.getState().windows).length };
  });
  expect(seen.sawQueue, 'monsters queue outside the wall').toBe(true);
  expect(seen.maxClimbing, 'never more climbers than windows').toBeLessThanOrEqual(seen.windows);
});

test('a barricade takes real damage: panels come down one at a time, and repair puts one back', async ({ page }) => {
  await boot(page);
  await admitted(page);

  // Panels only fall while something is tearing them, and they fall one per beat — so over a
  // window of play the count goes DOWN in steps, never to zero in a frame.
  const torn = await page.evaluate(async () => {
    const readings = [];
    for (let i = 0; i < 60; i++) {
      readings.push(Object.values(window.__swanGameStore.getState().windows).map((w) => w.panels));
      await new Promise((r) => setTimeout(r, 100));
    }
    const first = readings[0];
    const last = readings.at(-1);
    // The biggest single-frame drop anywhere: a barricade must never vanish in one step.
    let worstStep = 0;
    for (let i = 1; i < readings.length; i++) {
      for (let w = 0; w < readings[i].length; w++) {
        worstStep = Math.max(worstStep, readings[i - 1][w] - readings[i][w]);
      }
    }
    return { first, last, worstStep };
  });
  expect(Math.min(...torn.last), 'something got torn down').toBeLessThan(Math.max(...torn.first));
  expect(torn.worstStep, 'panels fall ONE at a time, never a wall in a frame').toBeLessThanOrEqual(1);

  // Repair puts a panel back — the player's defensive verb.
  const repaired = await page.evaluate(async () => {
    const { repair } = await import('/src/systems/windows.js');
    const store = window.__swanGameStore;
    const [id, w] = Object.entries(store.getState().windows).find(([, x]) => x.panels < 5 && !x.climbing) ?? [];
    if (!id) return null;
    const before = w.panels;
    store.setState({ windows: { ...store.getState().windows, [id]: { ...w, ...repair(w) } } });
    return { before, after: store.getState().windows[id].panels };
  });
  if (repaired) expect(repaired.after, 'a repair rebuilds exactly one panel').toBe(repaired.before + 1);
});

test('a queued monster cannot be shot through the wall', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => window.__swanGameStore.getState().enemies.some((e) => e.outside), null, { timeout: 40_000 });

  const result = await page.evaluate(() => {
    const store = window.__swanGameStore;
    const queued = store.getState().enemies.find((e) => e.outside);
    const before = queued.hp;
    // A vertical ray straight down onto it — the most generous aim there is.
    const hit = store.getState().shoot({ x: queued.x, y: 10, z: queued.z }, { x: 0, y: -1, z: 0 });
    const after = store.getState().enemies.find((e) => e.id === queued.id);
    return { hit, before, after: after?.hp };
  });
  expect(result.hit, 'the shot finds nothing — the wall is between you').toBe(false);
  expect(result.after, 'and the queued monster is untouched').toBe(result.before);
});
