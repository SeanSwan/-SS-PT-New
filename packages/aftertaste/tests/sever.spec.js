import { test, expect } from '@playwright/test';

/**
 * D3 acceptance: the head actually comes OFF. Unit tests prove the locational maths and the sever
 * rules; this proves the whole chain reaches the screen — the ray picks the head, the corpse
 * loses its head MESH, the debris pops, and the floor cleans itself up.
 */
test('a headshot decapitates: one shot kills, the head mesh vanishes, debris pops and fades', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => window.__swanScene && window.__swanEnemyPos?.some((e) => e.state === 'alive' && e.type === 'fryling'),
    null, { timeout: 20_000 },
  );

  // A stationary tester in a ROOM (S6a) gets reached and killed, and `over` short-circuits tick()
  // — which is what ages corpses off the board and drains debris. Death is not under test here.
  await page.evaluate(() => window.__swanGameStore.setState({ hp: 99999 }));

  const result = await page.evaluate(() => {
    const store = window.__swanGameStore;
    const target = store.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
    const head = target.parts.find((p) => p.tag === 'head').hitShape.c;
    // A vertical ray at the head sphere's own x/z — enters the head before the body (proven in unit).
    const ok = store.getState().shoot(
      { x: target.x + head[0], y: 10, z: target.z + head[2] },
      { x: 0, y: -1, z: 0 },
    );
    const after = store.getState().enemies.find((e) => e.id === target.id);
    return {
      ok,
      hpBefore: target.hp,
      state: after?.state,
      severed: after?.severed ?? [],
      kills: store.getState().kills,
      debris: store.getState().debris.length,
    };
  });
  expect(result.ok, 'the headshot connected').toBe(true);
  expect(result.hpBefore, 'precondition: full-hp fryling').toBe(2);
  expect(result.state, 'one headshot = dead (x2 damage on 2 hp, onSever kill)').toBe('dying');
  expect(result.severed).toContain('head');
  expect(result.kills).toBe(1);
  expect(result.debris, 'the severed head became debris').toBeGreaterThanOrEqual(1);

  // The HEAD MESH is gone from that monster while its body still topples — and the debris
  // renders as scene objects.
  await page.waitForFunction(() => {
    let hiddenHeads = 0; let gibs = 0;
    window.__swanScene.traverse((o) => {
      if (o.name === 'part:head' && o.visible === false) hiddenHeads += 1;
      if (o.parent?.parent?.name === 'debris' && o.isMesh) gibs += 1;
    });
    return hiddenHeads >= 1 && gibs >= 1;
  }, null, { timeout: 5_000 });

  // The floor cleans itself: debris drains after its TTL. DRIVEN, not raced — waiting in wall time
  // for a game-clock TTL fails whenever the machine is busy, and a working drain then reads as a
  // leak. The store takes the time as an argument; the test can simply say it is later.
  await page.evaluate(async () => {
    const { DEBRIS_TTL } = await import('/src/state/store.js');
    const store = window.__swanGameStore;
    const p = window.__swanPlayerPos;
    store.getState().tick({ x: p.x, z: p.z }, 10_000);
    store.getState().tick({ x: p.x, z: p.z }, 10_000 + DEBRIS_TTL + 1);
  });
  await page.waitForFunction(() => (window.__swanDebris ?? []).length === 0, null, { timeout: 16_000 });

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
