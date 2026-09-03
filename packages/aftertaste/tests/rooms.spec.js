import { test, expect } from '@playwright/test';

/** S6a in the browser: the walls the player can see are the walls the player cannot cross. */

const boot = async (page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanScene && window.__swanPlayerPos, null, { timeout: 20_000 });
  await page.locator('canvas').click();
};

test('the room is DRAWN — walls, cover and window frames are in the scene', async ({ page }) => {
  await boot(page);
  const drawn = await page.evaluate(() => {
    let meshes = 0;
    window.__swanScene.traverse((o) => {
      let p = o.parent; let inRoom = false;
      while (p) { if (p.name === 'room') { inRoom = true; break; } p = p.parent; }
      if (inRoom && o.isMesh) meshes += 1;
    });
    return meshes;
  });
  // Four sides (two of them split by a window) + a counter + two window frames.
  expect(drawn, 'the room renders real geometry').toBeGreaterThanOrEqual(7);
});

test('you cannot walk out of the room, however long you hold the key', async ({ page }) => {
  await boot(page);
  const escaped = await page.evaluate(async () => {
    const { ROOMS, inRoom } = await import('/src/world/rooms.js');
    const room = ROOMS['dining-hall'];
    const walk = async (code, seconds) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      const until = performance.now() + seconds * 1000;
      let worst = null;
      while (performance.now() < until) {
        const p = window.__swanPlayerPos;
        if (!inRoom(room, p.x, p.z)) worst = { ...p };
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return worst;
    };
    // START each attempt next to the wall being tested, then walk into it. The first version of
    // this test walked from the middle for 2.2s — about 11 units at walking speed — and never
    // REACHED the east/west walls 12 units away. It passed with the x-axis wall resolution
    // deliberately deleted, which is a test proving nothing. Sabotage caught it; the fix is to
    // start in contact, not to walk longer.
    window.__swanAim.yaw = 0; window.__swanAim.pitch = 0;
    const near = {
      KeyW: { x: 0, z: room.bounds.minZ + 1.5 },   // yaw 0 walks -z
      KeyS: { x: 0, z: room.bounds.maxZ - 1.5 },
      KeyA: { x: room.bounds.minX + 1.5, z: 0 },
      KeyD: { x: room.bounds.maxX - 1.5, z: 0 },
    };
    for (const code of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
      window.__swanTeleport?.(near[code]);
      await new Promise((r) => setTimeout(r, 120));
      const out = await walk(code, 1.6);
      if (out) return { code, ...out };
    }
    return null;
  });
  expect(escaped, `the player left the room: ${JSON.stringify(escaped)}`).toBeNull();
});

test('wave 1 arrives INSIDE the room — nobody spawns behind a wall', async ({ page }) => {
  await boot(page);
  const outside = await page.evaluate(async () => {
    const { ROOMS, inRoom } = await import('/src/world/rooms.js');
    const room = ROOMS['dining-hall'];
    return (window.__swanEnemyPos ?? []).filter((e) => !inRoom(room, e.x, e.z));
  });
  expect(outside, `enemies outside the walls: ${JSON.stringify(outside)}`).toHaveLength(0);
});
