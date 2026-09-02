import { test, expect } from '@playwright/test';

/**
 * The feel pack (playtest 2: "I wanna see bullets... run, jump, punch"), end to end. Unit tests
 * prove the physics and the arcs; this proves the keys and buttons actually reach them.
 */
const boot = async (page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => window.__swanLook && window.__swanScene && window.__swanEnemyPos?.length > 0,
    null, { timeout: 20_000 },
  );
  await page.locator('canvas').click(); // focus + arm
};

test('SPACE jumps: the player leaves the ground and comes back down', async ({ page }) => {
  await boot(page);
  const flight = await page.evaluate(async () => {
    // Tap, don't hold: holding Space re-jumps on landing (bunny-hop, working as intended) —
    // the first version of this test held it for the whole window and then demanded a landing.
    const samples = [];
    const t0 = performance.now();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true })), 120);
    while (performance.now() - t0 < 1600) {
      samples.push(window.__swanPlayerPos.y ?? 0);
      await new Promise((r) => requestAnimationFrame(r));
      if (performance.now() - t0 > 400 && samples.at(-1) === 0) break; // landed after the arc
    }
    return { peak: Math.max(...samples), final: samples.at(-1) };
  });
  expect(flight.peak, 'left the ground').toBeGreaterThan(0.3);
  expect(flight.final, 'landed').toBe(0);
});

test('SHIFT sprints: measured ground speed rises by the sprint multiplier', async ({ page }) => {
  await boot(page);
  const speed = async (sprint) => page.evaluate(async (s) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    if (s) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
    await new Promise((r) => setTimeout(r, 350)); // past the accel ramp
    const a = { ...window.__swanPlayerPos };
    await new Promise((r) => setTimeout(r, 400));
    const b = { ...window.__swanPlayerPos };
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    if (s) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
    await new Promise((r) => setTimeout(r, 250)); // decel to rest between measurements
    return Math.hypot(b.x - a.x, b.z - a.z) / 0.4;
  }, sprint);
  const walk = await speed(false);
  const run = await speed(true);
  expect(walk).toBeGreaterThan(3.5);
  expect(run / walk, `sprint ratio (walk ${walk.toFixed(1)}, run ${run.toFixed(1)})`).toBeGreaterThan(1.25);
});

test('right-click PUNCHES: an adjacent enemy takes damage and is shoved', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => window.__swanEnemyPos?.some((e) => e.state === 'alive'), null, { timeout: 10_000 });
  const result = await page.evaluate(() => {
    const store = window.__swanGameStore;
    const p = window.__swanPlayerPos;
    const target = store.getState().enemies.find((e) => e.state === 'alive');
    // Stand the enemy directly in front (yaw 0 faces -z), then punch via the REAL input path.
    target.x = p.x; target.z = p.z - 1.2;
    window.__swanAim.yaw = 0; window.__swanAim.pitch = 0;
    const before = { hp: target.hp, z: target.z };
    const canvas = document.querySelector('canvas');
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    const after = store.getState().enemies.find((e) => e.id === target.id);
    return { before, after: { hp: after.hp, z: after.z, state: after.state } };
  });
  expect(result.after.hp, 'punch dealt 1 damage (or killed)').toBeLessThan(result.before.hp + 1);
  const damaged = result.after.hp === result.before.hp - 1 || result.after.state === 'dying';
  expect(damaged, 'the punch connected').toBe(true);
  expect(result.after.z, 'shoved away').toBeLessThan(result.before.z - 0.5);
});

test('firing draws a tracer streak in the scene and blooms the crosshair', async ({ page }) => {
  await boot(page);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  const seen = await page.waitForFunction(() => {
    let streaks = 0;
    window.__swanScene.traverse((o) => { if (o.parent?.name === 'tracers' && o.isMesh) streaks += 1; });
    const bloomed = /scale\(1\.3/.test(document.querySelector('[data-testid="crosshair"]')?.style.transform ?? '');
    return (streaks >= 1 && bloomed) ? { streaks, bloomed } : false;
  }, null, { timeout: 10_000 });
  await page.mouse.up();
  expect(seen).toBeTruthy();
});
