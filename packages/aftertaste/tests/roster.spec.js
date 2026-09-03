import { test, expect } from '@playwright/test';

/**
 * The roster, end to end: wave 2 introduces a second FACE, it loads a different GLB, and every
 * enemy still renders exactly one skinned mesh with its own skeleton. Unit tests prove the mix is
 * deterministic; this proves the second model actually reaches the screen.
 */
test('wave 2 mixes in the drip-cyst, and every enemy still owns one skinned mesh', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__swanScene && window.__swanEnemyPos?.length > 0, null, { timeout: 20_000 });

  // Wave 1 is frylings only — the learnable wave.
  // TEST-DELTA (R2): wave 1 mixes two faces now — the first playtest proved the old one-face
  // wave taught nothing before the player died.
  // TEST-DELTA (S2): the Regular leads wave 1 — the horde's face is a person (Beyond-Zombies cast).
  const wave1Types = await page.evaluate(() => [...new Set(window.__swanEnemyPos.map((e) => e.type))].sort());
  expect(wave1Types).toEqual(['fryling', 'grease-fly', 'regular']);

  // Clear wave 1 (poll-shooting past fair-spawn) and wait for wave 2's flock to mature.
  await page.waitForFunction(() => {
    const store = window.__swanGameStore;
    for (const e of store.getState().enemies.map((x) => ({ x: x.x, z: x.z }))) {
      store.getState().shoot({ x: e.x, y: 10, z: e.z }, { x: 0, y: -1, z: 0 });
    }
    return store.getState().wave >= 2 && store.getState().enemies.some((e) => e.state === 'alive');
  }, null, { timeout: 20_000, polling: 100 });

  // WAIT for the composition, do not sleep and sample it. The poll-shooter above keeps firing
  // while wave 2 materialises, so a single sample can land on a board where the one-hp faces have
  // already been shot and only the tanky one is left — the wave was correct and the snapshot was
  // early. (Same lesson as the debris and corpse tests: assert a condition, never a moment.)
  const wave2 = await page.waitForFunction(() => {
    const st = window.__swanGameStore.getState();
    const types = [...new Set(st.enemies.map((e) => e.type))];
    return types.includes('crumb-roach') ? { types, wave: st.wave } : false;
  }, null, { timeout: 20_000 }).then((h) => h.jsonValue());
  expect(wave2.types, 'wave 2 brings the crumb-roach (S2 unlock table)').toContain('crumb-roach');

  // Both models render as skinned meshes — the PARTED fryling carries two meshes on one skeleton
  // (TEST-DELTA, D3), every other type one. The crowd-bug assertion: distinct skeletons == enemies.
  await page.waitForFunction(() => {
    let skinned = 0;
    window.__swanScene.traverse((o) => { if (o.isSkinnedMesh) skinned += 1; });
    const want = window.__swanGameStore.getState().enemies
      .reduce((n, e) => n + (window.__swanPartMeshCount?.[e.type] ?? 1), 0);
    return skinned === want && skinned > 0;
  }, null, { timeout: 20_000 });
  const bones = await page.evaluate(() => {
    const roots = [];
    window.__swanScene.traverse((o) => { if (o.isSkinnedMesh) roots.push(o.skeleton.bones[0].uuid); });
    return { enemies: window.__swanGameStore.getState().enemies.length, distinct: new Set(roots).size };
  });
  expect(bones.distinct, 'every enemy owns its OWN skeleton, across model types').toBe(bones.enemies);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
