import { test, expect } from '@playwright/test';
import { admitted, admittedType, immortal } from './helpers.js';

/**
 * The lifecycle, end to end in a real browser: a killed enemy TOPPLES instead of popping, the
 * corpse is honest (untargetable, not "remaining", off the board when the clip ends), and the
 * whole flow runs through the same store the trigger uses. Unit tests prove the machine; this
 * proves the machine reaches the screen.
 */
test('a kill topples a corpse: dying on the board, excluded from Remaining, gone after the clip', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  // Wait past fair-spawn: the machine must mature an enemy before it can be shot at all.
  await admitted(page);

  // A stationary tester in a ROOM (S6a) gets reached and killed, and `over` short-circuits tick()
  // — which is what ages a corpse off the board. Death is not under test here.
  await page.evaluate(() => {
    const store = window.__swanGameStore;
    // FREEZE THE INTAKE. This test counts what holds the wave open, and the director keeps
    // admitting monsters while it counts — "Remaining: 2" became "Remaining: 3" because a new
    // arrival walked in mid-assertion. Spending the budget stops the intake without touching the
    // lifecycle, which is the actual subject here.
    store.setState({ hp: 99999, director: { ...store.getState().director, budgetLeft: 0 } });
  });

  const remainingBefore = await page.getByTestId('hud-left').textContent();

  // Two vertical shots kill the first enemy through the real store path.
  const corpse = await page.evaluate(() => {
    const store = window.__swanGameStore;
    const target = store.getState().enemies.find((e) => e.state === 'alive');
    store.getState().shoot({ x: target.x, y: 10, z: target.z }, { x: 0, y: -1, z: 0 });
    store.getState().shoot({ x: target.x, y: 10, z: target.z }, { x: 0, y: -1, z: 0 });
    const after = store.getState().enemies.find((e) => e.id === target.id);
    return { id: target.id, state: after?.state, kills: store.getState().kills };
  });
  expect(corpse.state, 'the killing shot starts the death, not a removal').toBe('dying');
  expect(corpse.kills, 'the kill is scored at the killing shot').toBe(1);

  // Remaining dropped immediately — a toppling corpse does not hold the wave.
  const before = parseInt(remainingBefore.replace(/\D/g, ''), 10);
  await expect(page.getByTestId('hud-left')).toHaveText(`Remaining: ${before - 1}`);

  // A corpse cannot be farmed for double kills.
  const farmed = await page.evaluate((id) => {
    const store = window.__swanGameStore;
    const c = store.getState().enemies.find((e) => e.id === id);
    if (!c) return { present: false };
    const hit = store.getState().shoot({ x: c.x, y: 10, z: c.z }, { x: 0, y: -1, z: 0 });
    return { present: true, hit, kills: store.getState().kills };
  }, corpse.id);
  if (farmed.present) {
    expect(farmed.hit, 'the ray passes through a corpse').toBe(false);
    expect(farmed.kills, 'no double-kill').toBe(1);
  }

  // DRIVE THE CLOCK, DO NOT RACE IT. This used to wait in WALL time for a game-clock TTL, which
  // is a race the moment the machine is busy: under a full suite the browser throttles rAF, a
  // "1 second" death clip takes longer than the budget, and a perfectly working lifecycle reads as
  // a hang. The store's tick takes the elapsed time as an argument, so the test can simply say
  // "it is now later" and assert the consequence. Deterministic, and independent of the machine.
  await page.evaluate(async () => {
    const { DEATH_SECONDS } = await import('/src/systems/lifecycle.js');
    const store = window.__swanGameStore;
    const p = window.__swanPlayerPos;
    // Two ticks: one to cross the boundary, one to prove it stays crossed.
    store.getState().tick({ x: p.x, z: p.z }, 10_000);
    store.getState().tick({ x: p.x, z: p.z }, 10_000 + DEATH_SECONDS + 1);
  });
  await page.waitForFunction(
    (id) => !window.__swanGameStore.getState().enemies.some((e) => e.id === id),
    corpse.id, { timeout: 12_000 },
  );

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
