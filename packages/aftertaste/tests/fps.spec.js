import { test, expect } from '@playwright/test';
import { admitted, admittedType, immortal } from './helpers.js';

/**
 * The FPS slice, end to end in a real browser (Sean's call: shoot like Overwatch/BF6).
 *
 * TEST-DELTA DISCLOSURE: this file replaces shooting.spec.js — its click-the-ground raycast
 * mechanic left the game with the top-down camera. What is provable here and what is not:
 * pointer lock is refused in headless browsers and synthetic MouseEvents cannot carry movementX,
 * so LOOKING is driven through the __swanLook seam (the same applyLook the real handler calls);
 * the trigger, the camera ray, view-relative movement, the HUD crosshair, and the hitmarker are
 * all exercised for real.
 */

const boot = async (page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => window.__swanLook && window.__swanCamera && window.__swanEnemyPos?.length > 0,
    null, { timeout: 20_000 },
  );
};

test('the camera sits at eye height and the look seam steers it', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));
  await boot(page);

  const cam = await page.evaluate(() => {
    const c = window.__swanCamera;
    return { y: c.position.y, fov: c.fov };
  });
  expect(cam.y, 'first-person eye height, not the old top-down y=13').toBeCloseTo(1.6, 1);
  expect(cam.fov, 'FPS field of view').toBeGreaterThanOrEqual(70);

  // A quarter-turn right through the seam must reach the rendered camera within a frame.
  const yaw = await page.evaluate(async () => {
    window.__swanLook(Math.PI / 2 / 0.0025, 0); // dx sized so yaw moves by -π/2 at SENSITIVITY
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return window.__swanCamera.rotation.y;
  });
  expect(yaw).toBeCloseTo(-Math.PI / 2, 2);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});

test('movement is view-relative: facing +x, W walks along +x', async ({ page }) => {
  await boot(page);
  await page.locator('canvas').click(); // focus so key events land

  await page.evaluate(() => {
    window.__swanAim.yaw = -Math.PI / 2; // face +x exactly
    window.__swanAim.pitch = 0;
  });
  const before = await page.evaluate(() => ({ ...window.__swanPlayerPos }));
  await page.keyboard.down('w');
  await page.waitForTimeout(600);
  await page.keyboard.up('w');
  const after = await page.evaluate(() => ({ ...window.__swanPlayerPos }));

  expect(after.x - before.x, 'walked along +x').toBeGreaterThan(1.5);
  expect(Math.abs(after.z - before.z), 'no sideways drift').toBeLessThan(0.5);
});


/**
 * TEST-DELTA (S5): the starter became a SEMI-AUTO pistol, so "hold the trigger and count a stream"
 * stopped being true of the default gun. These tests are about AUTOMATIC fire, so they take the
 * rifle out first. What they assert did not change; which gun demonstrates it did.
 */
const equipAuto = async (page) => {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })));
  await page.waitForFunction(() => window.__swanGun.slots.includes('fry-rifle'), null, { timeout: 5_000 });
  if (await page.evaluate(() => window.__swanGun.weaponId !== 'fry-rifle')) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true })));
  }
  await page.waitForFunction(() => window.__swanGun.weaponId === 'fry-rifle' && window.__swanGun.swapUntil === 0, null, { timeout: 5_000 });
};

test('holding the trigger fires repeatedly, and an aimed burst scores a kill with a hitmarker', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));
  await boot(page);
  await equipAuto(page);
  await expect(page.getByTestId('crosshair')).toBeVisible();

  // Aim at the nearest enemy through the seam (exact yaw/pitch from eye to its waist), then hold
  // the REAL trigger — mousedown on the canvas — re-aiming each frame while the burst runs.
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.waitForFunction(() => {
    const p = window.__swanPlayerPos;
    const enemies = window.__swanEnemyPos;
    if (!enemies.length) return (window.__swanKills ?? 0) > 0;
    let best = enemies[0]; let bd = Infinity;
    for (const e of enemies) {
      const d = (e.x - p.x) ** 2 + (e.z - p.z) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    const dx = best.x - p.x;
    // 0.3, not 0.5: the parted crumb-roach is 0.45 tall — its hit shapes top out BELOW 0.5, so
    // aiming at the old waist height whiffed it forever whenever it was the nearest enemy (S2).
    const dyy = 0.3 - 1.6;
    const dz = best.z - p.z;
    window.__swanAim.yaw = Math.atan2(-dx, -dz);
    window.__swanAim.pitch = Math.asin(dyy / Math.hypot(dx, dyy, dz));
    return (window.__swanKills ?? 0) > 0;
  }, null, { timeout: 15_000, polling: 50 });

  // TEST-DELTA (S3/S5): the wait above ends the moment something DIES, and the cast now includes
  // one-hp faces that a headshot kills on the first bullet — so "shots > 1" was being read after a
  // single lethal shot and failing on a gun that is working perfectly. Automatic fire is a claim
  // about a HELD trigger, so hold it past the kill and measure there.
  // ...and survive long enough to observe it. In a ROOM (S6a) the swarm reaches a stationary
  // player in a couple of seconds, `over` holsters the gun, and the shot count freezes at whatever
  // it was — which reads exactly like a broken automatic weapon. Death is not what is under test.
  const afterKill = await page.evaluate(() => {
    window.__swanGameStore.setState({ hp: 99999, over: false });
    return window.__swanShotsFired ?? 0;
  });
  await page.waitForTimeout(700);
  const stats = await page.evaluate(() => ({ shots: window.__swanShotsFired ?? 0, kills: window.__swanKills ?? 0 }));
  await page.mouse.up(); // released AFTER the measurement — the earlier version released first and
                         // then asked a released trigger to keep firing.
  expect(stats.kills, 'the burst killed something').toBeGreaterThan(0);
  expect(stats.shots, `held trigger keeps firing (was ${afterKill} at the kill)`).toBeGreaterThan(afterKill);

  // The kill leaves a hitmarker on screen (it fades by CSS, but the element persists until over).
  await expect(page.getByTestId('hitmarker')).toHaveCount(1);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});

test('releasing the trigger STOPS the fire, and the rate is bounded by FIRE_INTERVAL', async ({ page }) => {
  // GLM-5.3 blind-spot finding: a trigger that never stops after mouseup — or fires every frame —
  // passed the whole suite. This is the test that makes both failures red.
  await boot(page);
  await equipAuto(page);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const atRelease = await page.evaluate(() => window.__swanShotsFired ?? 0);
  expect(atRelease, 'held trigger fired').toBeGreaterThan(1);
  expect(atRelease, 'rate bounded: ~650ms at 0.15s/shot is at most 6 shots').toBeLessThanOrEqual(6);
  await page.waitForTimeout(500);
  const afterRelease = await page.evaluate(() => window.__swanShotsFired ?? 0);
  expect(afterRelease, 'firing CEASED on release').toBe(atRelease);
});
