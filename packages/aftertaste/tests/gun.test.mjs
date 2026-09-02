import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, DEFAULT_WEAPON, RECOIL_RESET } from '../src/combat/weapons.js';
import { recoilKick, spreadAfterShot, spreadAfterRest, currentCone, applySpread, weaponOf } from '../src/combat/gunState.js';

/**
 * The weapon doctrine (playtest 3, Sean): recoil is a learnable PATTERN, spread is a CAPPED cone,
 * ADS tightens everything. Schema tests keep every weapon row complete — a gun with a missing
 * stat half-works at runtime with no error anywhere, exactly like a roster row.
 */

const G = (over = {}) => ({ weaponId: DEFAULT_WEAPON, spread: WEAPONS[DEFAULT_WEAPON].spread.base, burstIndex: 0, lastShotAt: -Infinity, ads: false, ...over });

test('every weapon declares the full row: damage, rate, pattern, spread model, zoom', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.ok(w.damage >= 1, `${id}.damage`);
    assert.ok(w.fireInterval > 0, `${id}.fireInterval`);
    assert.ok(Array.isArray(w.recoilPattern) && w.recoilPattern.length >= 4, `${id} pattern is a learnable sequence, not one kick`);
    for (const k of ['base', 'perShot', 'max', 'recovery', 'adsScale']) assert.equal(typeof w.spread[k], 'number', `${id}.spread.${k}`);
    assert.ok(w.spread.max > w.spread.base, `${id} spread can actually bloom`);
    assert.ok(w.zoomFov < 75, `${id} ADS zooms IN`);
    assert.ok(w.adsSensitivity > 0 && w.adsSensitivity <= 1, `${id} ADS slows the mouse, never speeds it`);
  }
});

test('recoil is DETERMINISTIC: the same burst position kicks the same, every burst', () => {
  const g = G({ lastShotAt: 10, burstIndex: 3 });
  const a = recoilKick(g, 10.1);
  const b = recoilKick(g, 10.1);
  assert.deepEqual(a, b, 'no randomness in the kick');
  assert.deepEqual([a.pitch, a.yaw], WEAPONS[DEFAULT_WEAPON].recoilPattern[3], 'position 3 of the pattern');
});

test('a pause resets the pattern to the first kick; a long burst clamps at the last', () => {
  const paused = recoilKick(G({ lastShotAt: 10, burstIndex: 5 }), 10 + RECOIL_RESET + 0.01);
  assert.deepEqual([paused.pitch, paused.yaw], WEAPONS[DEFAULT_WEAPON].recoilPattern[0]);
  const long = recoilKick(G({ lastShotAt: 10, burstIndex: 99 }), 10.05);
  const last = WEAPONS[DEFAULT_WEAPON].recoilPattern.at(-1);
  assert.deepEqual([long.pitch, long.yaw], last, 'a 99-shot burst holds the final kick, it does not crash');
});

test('spread blooms per shot and is HARD-CAPPED — the limit Sean asked for', () => {
  let g = G();
  for (let i = 0; i < 100; i++) g = { ...g, spread: spreadAfterShot(g) };
  assert.equal(g.spread, WEAPONS[DEFAULT_WEAPON].spread.max, '100 shots cannot exceed the cap');
});

test('spread recovers toward base when you stop firing, and never below it', () => {
  let g = G({ spread: WEAPONS[DEFAULT_WEAPON].spread.max });
  g = { ...g, spread: spreadAfterRest(g, 0.1) };
  assert.ok(g.spread < WEAPONS[DEFAULT_WEAPON].spread.max, 'recovering');
  g = { ...g, spread: spreadAfterRest(g, 100) };
  assert.equal(g.spread, WEAPONS[DEFAULT_WEAPON].spread.base, 'floors at base accuracy');
});

test('ADS tightens the cone', () => {
  const hip = currentCone(G({ spread: 0.02, ads: false }));
  const ads = currentCone(G({ spread: 0.02, ads: true }));
  assert.ok(ads < hip * 0.5, `ADS cone ${ads} vs hip ${hip}`);
});

test('applySpread stays INSIDE the cone and returns unit vectors; zero cone is exact', () => {
  const dir = { x: 0, y: 0, z: -1 };
  assert.deepEqual(applySpread(dir, 0), dir, 'zero spread = laser');
  // Worst-case deviation across a deterministic sweep of the injectable rand.
  let seq = 0;
  const rand = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };
  for (let i = 0; i < 200; i++) {
    const d = applySpread(dir, 0.03, rand);
    assert.ok(Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-9, 'unit length');
    const angle = Math.acos(-d.z); // deviation from straight ahead
    assert.ok(angle <= 0.03 + 1e-6, `deviation ${angle} inside the 0.03 cone`);
  }
});
