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

test('F PUNCHES: an adjacent enemy takes damage and is shoved', async ({ page }) => {
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
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
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
  // The crosshair reads the real cone now, so this asserts a MEASURED bloom rather than a magic
  // string — the earlier version pinned `scale(1.3` and would have gone green on a frozen value.
  const seen = await page.waitForFunction(() => {
    let streaks = 0;
    window.__swanScene.traverse((o) => { if (o.parent?.name === 'tracers' && o.isMesh) streaks += 1; });
    const t = document.querySelector('[data-testid="crosshair"]')?.style.transform ?? '';
    const scale = Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? 1);
    return (streaks >= 1 && scale > 1.25) ? { streaks, scale } : false;
  }, null, { timeout: 10_000 });
  await page.mouse.up();
  expect(seen).toBeTruthy();
});

test('the spread has a LIMIT: a long hold stops opening, and letting go closes it', async ({ page }) => {
  await boot(page);
  // Standing still while holding the trigger is how you get eaten, and death freezes the gun
  // mid-bloom. Survival is not what is under test, so it is removed as a variable rather than left
  // to luck — this test failed once inside the full suite and its artifacts were gone before the
  // cause could be read, so BOTH plausible causes are closed: death here, and a fixed sleep that
  // assumes a frame rate (the wait below is a condition, not a stopwatch).
  await page.evaluate(() => window.__swanGameStore.setState({ hp: 99999 }));
  await page.mouse.move(640, 400);
  await page.mouse.down();

  // Bloom until the cap, however long the machine takes to fire those shots.
  await page.waitForFunction(() => window.__swanGun.spread >= 0.035, null, { timeout: 15_000 });
  // Then keep holding. THIS is the claim Sean asked for — not "it reaches a number" but "it stops
  // there while you keep spraying".
  await page.waitForTimeout(1200);
  const capped = await page.evaluate(() => ({ spread: window.__swanGun.spread, shots: window.__swanShotsFired }));

  await page.mouse.up();
  await page.waitForFunction(() => window.__swanGun.spread < 0.006, null, { timeout: 5_000 });
  const rested = await page.evaluate(() => window.__swanGun.spread);

  expect(capped.shots, 'the burst actually fired').toBeGreaterThan(8);
  expect(capped.spread, 'held at the cap, not climbing forever').toBeCloseTo(0.035, 5);
  expect(rested, 'the cone closes again once you let go').toBeLessThan(0.006);
});

test('AMMO: firing drains the mag on the HUD, R reloads it, and an empty mag reloads itself', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__swanGameStore.setState({ hp: 99999 }));
  const full = await page.evaluate(() => window.__swanGun.mag);

  // Drain some rounds and watch the HUD tell the truth about it.
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.waitForFunction((f) => window.__swanGun.mag <= f - 5, full, { timeout: 10_000 });
  await page.mouse.up();
  const midHud = await page.locator('[data-testid="hud-ammo"]').textContent();
  const midMag = await page.evaluate(() => window.__swanGun.mag);
  expect(midHud, `HUD shows the live count (${midMag})`).toContain(`${midMag} /`);

  // R reloads: the HUD announces it, then the mag is full and the reserve paid for it.
  const reserveBefore = await page.evaluate(() => window.__swanGun.reserveAmmo);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true })));
  await expect(page.locator('[data-testid="hud-ammo"]')).toContainText('RELOADING', { timeout: 3_000 });
  await page.waitForFunction((f) => window.__swanGun.mag === f, full, { timeout: 5_000 });
  const paid = await page.evaluate(() => window.__swanGun.reserveAmmo);
  expect(paid, 'reserve paid exactly the topped-up rounds').toBe(reserveBefore - (full - midMag));

  // Empty the mag entirely: the gun reloads itself. Let go once the auto-reload begins — with the
  // trigger still held, firing resumes the same FRAME the reload lands, so "mag === full" exists
  // for zero observable frames and a poll can never see it (first version of this test did that).
  await page.mouse.down();
  await page.waitForFunction(() => window.__swanGun.reloadingUntil > 0, null, { timeout: 20_000 });
  await page.mouse.up();
  await page.waitForFunction((f) => window.__swanGun.mag === f, full, { timeout: 8_000 });
});

test('death holsters the gun: the cone closes and the burst resets before you go again', async ({ page }) => {
  await boot(page);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.waitForFunction(() => window.__swanGun.spread >= 0.035, null, { timeout: 15_000 });
  await page.evaluate(() => window.__swanGameStore.setState({ over: true }));
  const holstered = await page.waitForFunction(
    () => (window.__swanGun.spread <= 0.0041 && window.__swanGun.burstIndex === 0 && !window.__swanGun.ads)
      ? { ...window.__swanGun } : false,
    null, { timeout: 5_000 },
  );
  await page.mouse.up();
  expect(holstered).toBeTruthy();
});

test('right-click AIMS DOWN SIGHTS: the view zooms in and the cone tightens; release restores it', async ({ page }) => {
  await boot(page);
  const canvas = page.locator('canvas');
  const hipFov = await page.evaluate(() => window.__swanCamera.fov);

  await canvas.dispatchEvent('mousedown', { button: 2 });
  await page.waitForTimeout(700); // the FOV is eased, never snapped
  const ads = await page.evaluate(() => ({ fov: window.__swanCamera.fov, ads: window.__swanGun.ads }));

  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true })));
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => ({ fov: window.__swanCamera.fov, ads: window.__swanGun.ads }));

  expect(hipFov).toBeGreaterThan(70);
  expect(ads.ads, 'holding RMB is aiming').toBe(true);
  expect(ads.fov, `zoomed in from ${hipFov}`).toBeLessThan(60);
  expect(back.ads).toBe(false);
  expect(back.fov, 'released back to hip-fire FOV').toBeGreaterThan(70);
});

test('a fever is VISIBLE on the HUD and clears itself when the timer runs out', async ({ page }) => {
  await boot(page);
  // The DAMAGE path that sets a fever is proven in the unit suite (where ATTACK_WINDUP is
  // importable and the strike sequence is exact). What only a browser can prove is the design
  // rule itself: that the fever is never hidden from the player.
  await expect(page.getByTestId('hud-fever')).toHaveCount(0);
  await page.evaluate(() => {
    const store = window.__swanGameStore;
    store.setState({ feverUntil: 9_999_999 });
  });
  await expect(page.getByTestId('hud-fever')).toBeVisible({ timeout: 3_000 });

  await page.evaluate(() => {
    const store = window.__swanGameStore;
    const p = window.__swanPlayerPos;
    store.setState({ feverUntil: 1, enemies: [] });
    store.getState().tick({ x: p.x, z: p.z }, 600); // the clock passes it: the store expires it
  });
  await expect(page.getByTestId('hud-fever')).toHaveCount(0, { timeout: 3_000 });
});
