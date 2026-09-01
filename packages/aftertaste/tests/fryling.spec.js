import { test, expect } from '@playwright/test';

/**
 * Slice 6b acceptance: the rigged Fryling is actually IN the game — not merely written, not merely
 * imported, but rendered as a skinned mesh whose animation is advancing.
 *
 * Why these assertions and not "the import succeeded":
 *   - "Exists" is not "renders". A GLB can load, a component can mount, and the scene can still
 *     contain nothing (wrong path, Vite refusing to serve a file outside its root, a Suspense that
 *     never resolves). So we ask the SCENE what it contains, through the __swanScene seam.
 *   - A SkinnedMesh in the scene is still not proof the mixer runs. A model whose clips never play
 *     stands in a T-pose forever and every assertion about "the monster is animated" is a lie. So
 *     we sample a bone's rotation twice and require it to have CHANGED.
 *   - Forty enemies sharing ONE skeleton is the classic three.js crowd bug: ordinary .clone() keeps
 *     pointing at the original bones, all copies animate as one, and nothing errors. So we require
 *     every skinned enemy to have a DISTINCT root bone. This is the regression test for the
 *     SkeletonUtils.clone decision in Fryling.jsx.
 */
test('the Fryling renders as a skinned mesh, animates, and each enemy owns its skeleton', async ({ page }) => {
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e)));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  // Wait for the scene seam AND for at least one skinned mesh to be in it. The GLB loads over the
  // dev server, so give it real time — but this is a wait for a CONDITION, not a sleep.
  await page.waitForFunction(() => {
    const scene = window.__swanScene;
    if (!scene) return false;
    let skinned = 0;
    scene.traverse((o) => { if (o.isSkinnedMesh) skinned += 1; });
    return skinned > 0;
  }, undefined, { timeout: 30_000 });

  // Every enemy on the board should be a skinned Fryling — no leftover boxes once loading settles.
  const counts = await page.evaluate(() => {
    const seen = [];
    window.__swanScene.traverse((o) => {
      if (o.isSkinnedMesh) seen.push(o.skeleton.bones[0].uuid);
    });
    return { skinned: seen.length, distinctRootBones: new Set(seen).size, enemies: window.__swanEnemyPos.length };
  });
  expect(counts.skinned, 'one skinned mesh per enemy').toBe(counts.enemies);
  // The crowd-bug assertion: shared skeletons would collapse this set.
  expect(counts.distinctRootBones, 'every enemy owns its OWN skeleton').toBe(counts.skinned);

  // The mixer is advancing: a mid-chain bone's local rotation must differ across ~400ms. The move
  // clip is rotation-keyed, so a frozen quaternion means no mixer is updating this instance.
  const sampleBone = () => page.evaluate(() => {
    let bone = null;
    window.__swanScene.traverse((o) => {
      if (!bone && o.isSkinnedMesh && o.skeleton.bones.length > 1) bone = o.skeleton.bones[1];
    });
    if (!bone) return null;
    const q = bone.quaternion;
    return [q.x, q.y, q.z, q.w];
  });
  const before = await sampleBone();
  expect(before, 'found a bone to sample').not.toBeNull();
  await page.waitForTimeout(400);
  const after = await sampleBone();
  const moved = before.some((v, i) => Math.abs(v - after[i]) > 1e-6);
  expect(moved, `bone rotation advanced (before=${before} after=${after})`).toBe(true);

  // Damage feedback reaches the REAL model: fire at an enemy through the store (the same path a
  // click takes after the raycast) and require exactly one monster to darken to the low-hp tint.
  // This is the hp-prop seam between the store and Fryling.jsx — the two units are each tested,
  // and Slice 5 taught us the seam is where the bugs live.
  const darkened = await page.evaluate(() => {
    const target = window.__swanEnemyPos[0];
    window.__swanGameStore.getState().fire({ x: target.x, z: target.z });
    return new Promise((resolve) => setTimeout(() => {
      let dark = 0;
      window.__swanScene.traverse((o) => {
        if (o.isSkinnedMesh && o.material.color.getHexString() === '7a2418') dark += 1;
      });
      resolve(dark);
    }, 200));
  });
  expect(darkened, 'exactly the hit monster darkened').toBe(1);

  expect(thrown, `page threw: ${thrown.join(' | ')}`).toHaveLength(0);
});
