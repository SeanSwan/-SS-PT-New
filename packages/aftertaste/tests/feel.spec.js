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

/**
 * TEST-DELTA (S5): the starter is now a SEMI-AUTO pistol, so "hold the trigger and watch a stream"
 * stopped being true of the default gun. Every test below that is about AUTOMATIC-fire behaviour —
 * bloom, the spread cap, draining a magazine — equips the rifle first. What they assert did not
 * change; which gun demonstrates it did.
 */
const equipAuto = async (page) => {
  // Digit2 puts the rifle in the EMPTY hand — it does not put it in yours (equip() fills a free
  // slot before it replaces the one you hold). So take it out: press 2, then Q. The first draft of
  // this helper waited for `weaponId === 'fry-rifle'` after only pressing 2 and timed out forever,
  // which was the test being wrong about its own API, not the game.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })));
  await page.waitForFunction(() => window.__swanGun.slots.includes('fry-rifle'), null, { timeout: 5_000 });
  if (await page.evaluate(() => window.__swanGun.weaponId !== 'fry-rifle')) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true })));
  }
  await page.waitForFunction(() => window.__swanGun.weaponId === 'fry-rifle' && window.__swanGun.swapUntil === 0, null, { timeout: 5_000 });
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
  await equipAuto(page);
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
  await equipAuto(page);
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
  await equipAuto(page);
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
  await equipAuto(page);
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
  const ads = await page.evaluate(async () => {
    const { WEAPONS } = await import('/src/combat/weapons.js');
    return { fov: window.__swanCamera.fov, ads: window.__swanGun.ads, want: WEAPONS[window.__swanGun.weaponId].zoomFov };
  });

  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true })));
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => ({ fov: window.__swanCamera.fov, ads: window.__swanGun.ads }));

  expect(hipFov).toBeGreaterThan(70);
  expect(ads.ads, 'holding RMB is aiming').toBe(true);
  // Against the WEAPON's declared zoom, not a hardcoded 60 — the starter changed in S5 and a magic
  // number would have to be re-chosen every time the roster does.
  expect(ads.fov, `zoomed in from ${hipFov} toward ${ads.want}`).toBeLessThan(hipFov - 5);
  expect(ads.fov).toBeLessThanOrEqual(ads.want + 1);
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

test('POINTS: killing pays, the HUD counts it, and a body plink pays nothing', async ({ page }) => {
  await boot(page);
  await expect(page.getByTestId('hud-points')).toContainText('Points: 0');

  const result = await page.evaluate(async () => {
    const store = window.__swanGameStore;
    // Let the flock mature, then take a head off through the REAL shoot path.
    store.getState().tick({ x: 9999, z: 9999 }, 1000);
    const target = store.getState().enemies.find((e) => e.state === 'alive' && e.parts);
    const head = target.parts.find((p) => p.tag === 'head').hitShape.c;
    const before = store.getState().points;
    // Shoot until it dies. One head shot severs only if the pool is already low enough — the
    // roster-v2 threshold is a FRACTION of max hp, so a 3-hp face needs more than one bullet and
    // the first draft of this test asserted income from a single tap on an enemy that survived it.
    const rs = target.renderScale ?? 1;
    let hits = 0;
    while (hits < 12 && store.getState().enemies.find((e) => e.id === target.id)?.state === 'alive') {
      const live = store.getState().enemies.find((e) => e.id === target.id);
      store.getState().shoot({ x: live.x + head[0] * rs, y: 10, z: live.z + head[2] * rs }, { x: 0, y: -1, z: 0 });
      hits += 1;
    }
    return { before, after: store.getState().points, hits };
  });
  expect(result.after, 'a severing kill paid').toBeGreaterThan(result.before);
  await expect(page.getByTestId('hud-points')).not.toContainText('Points: 0');
});

test('S5: you START with the pistol, Q swaps to the other gun, and the HUD shows both', async ({ page }) => {
  await boot(page);
  await expect(page.getByTestId('hud-ammo')).toContainText('Sidearm 9');

  // Dev key 2 puts the rifle in the empty hand (wall-buys arrive in S7).
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })));
  await expect(page.getByTestId('hud-ammo')).toContainText('Fry Rifle', { timeout: 3_000 });

  // Q swaps back to the pistol, and the stowed gun stays visible.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true })));
  await expect(page.getByTestId('hud-ammo')).toContainText('Sidearm 9', { timeout: 3_000 });
  await expect(page.getByTestId('hud-ammo')).toContainText('[Q]');
});

test('S5: the SEMI fires once per press — a held trigger is one bullet', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__swanShotsFired = 0; window.__swanGameStore.setState({ hp: 99999 }); });
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.waitForTimeout(1200);                    // long enough for ~5 auto shots
  const held = await page.evaluate(() => window.__swanShotsFired);
  await page.mouse.up();
  expect(held, 'holding a semi-auto fires exactly one round').toBe(1);

  // Releasing and pressing again fires the next one.
  await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
  const after = await page.evaluate(() => window.__swanShotsFired);
  expect(after, 'a fresh press fires again').toBe(2);
});

test('S5: sprinting drops ADS and costs a beat before the gun answers', async ({ page }) => {
  await boot(page);
  await page.locator('canvas').dispatchEvent('mousedown', { button: 2 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__swanGun.ads), 'aiming').toBe(true);

  // Break into a sprint while aimed: the sights drop and a sprint-out timer is armed.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true })));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })));
  await page.waitForFunction(() => window.__swanGun.ads === false, null, { timeout: 3_000 });
  const armed = await page.evaluate(() => window.__swanGun.sprintOutUntil > 0);
  expect(armed, 'the sprint-out beat is armed').toBe(true);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
  });
});

test('S5.5: the money is FELT — a paying shot floats a +N off the crosshair', async ({ page }) => {
  await boot(page);
  await equipAuto(page);
  await expect(page.getByTestId('points-float')).toHaveCount(0);

  await page.evaluate(async () => {
    const store = window.__swanGameStore;
    store.getState().tick({ x: 9999, z: 9999 }, 1000);          // mature the flock
    const t = store.getState().enemies.find((e) => e.state === 'alive' && e.parts);
    const head = t.parts.find((p) => p.tag === 'head').hitShape.c;
    const rs = t.renderScale ?? 1;
    for (let i = 0; i < 12; i++) {
      const live = store.getState().enemies.find((e) => e.id === t.id);
      if (live?.state !== 'alive') break;
      store.getState().shoot({ x: live.x + head[0] * rs, y: 10, z: live.z + head[2] * rs }, { x: 0, y: -1, z: 0 });
    }
  });
  const float = page.getByTestId('points-float');
  await expect(float).toBeVisible({ timeout: 3_000 });
  await expect(float).toContainText('+');
});

test('S5.5: a fever DIMS the screen, not just the word — and it clears itself', async ({ page }) => {
  await boot(page);
  await expect(page.getByTestId('fever-vignette')).toHaveCount(0);
  await page.evaluate(() => window.__swanGameStore.setState({ feverUntil: 9_999_999 }));
  await expect(page.getByTestId('fever-vignette')).toBeVisible({ timeout: 3_000 });
  await expect(page.getByTestId('hud-fever')).toBeVisible();

  await page.evaluate(() => {
    const store = window.__swanGameStore;
    const p = window.__swanPlayerPos;
    store.setState({ feverUntil: 1, enemies: [] });
    store.getState().tick({ x: p.x, z: p.z }, 600);
  });
  await expect(page.getByTestId('fever-vignette')).toHaveCount(0, { timeout: 3_000 });
});

test('S5.5: audio starts only AFTER a gesture — the autoplay law, not a hope', async ({ page }) => {
  // Deliberately no boot(): boot() clicks, and the whole claim is about what happens before one.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  const before = await page.evaluate(async () => (await import('/src/audio/synth.js')).audioReady());
  expect(before, 'no AudioContext before the first gesture').toBe(false);

  await page.locator('canvas').click();
  const after = await page.evaluate(async () => (await import('/src/audio/synth.js')).audioReady());
  expect(after, 'the first click unlocks sound').toBe(true);
});

test('S5.5: the Regulars are not one clone — the crowd wears more than one palette', async ({ page }) => {
  await boot(page);
  const palettes = await page.evaluate(async () => {
    const store = window.__swanGameStore;
    const mod = await import('/src/systems/waves.js');
    // A crowd of Regulars, so the variant hash has something to spread across.
    store.setState({ hp: 99999, enemies: mod.spawnRing(9, 12, 1, { x: 0, z: 0 }, 0).filter((e) => e.type === 'regular') });
    await new Promise((r) => setTimeout(r, 2000)); // models + the colour effect
    const seen = new Set();
    window.__swanScene.traverse((o) => { if (o.isSkinnedMesh && o.material?.color) seen.add(o.material.color.getHexString()); });
    return [...seen];
  });
  expect(palettes.length, `distinct Regular colours on screen: ${palettes.join(', ')}`).toBeGreaterThan(1);
});
