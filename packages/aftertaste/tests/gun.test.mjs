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

// ---- AMMO + RELOAD (Beyond-Zombies S1) -------------------------------------------------------
// The magazine is the rhythm of a horde game: fire, count, and the reload is the moment the
// window you ignored becomes the window that kills you.
const { ammoAfterShot, canFire, startReload, finishReload, needsReload } = await import('../src/combat/gunState.js');

test('every weapon declares its ammo row: fireMode, mag, reserve, reload time', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.ok(['auto', 'semi'].includes(w.fireMode), `${id}.fireMode`);
    assert.ok(Number.isInteger(w.mag) && w.mag > 0, `${id}.mag`);
    assert.ok(Number.isInteger(w.reserve) && w.reserve >= w.mag, `${id} carries at least one spare mag`);
    assert.ok(w.reloadSeconds > 0, `${id}.reloadSeconds`);
  }
});

test('firing drains the mag by one and stops at zero — no negative bullets', () => {
  let g = G({ mag: 2, reserveAmmo: 10 });
  g = { ...g, ...ammoAfterShot(g) };
  assert.equal(g.mag, 1);
  g = { ...g, ...ammoAfterShot(g) };
  assert.equal(g.mag, 0);
  assert.equal(canFire(g, 100), false, 'an empty mag cannot fire');
  assert.deepEqual(ammoAfterShot(g), { mag: 0 }, 'firing on empty changes nothing');
});

test('reload is a STATE with a duration, and the maths moves rounds mag<-reserve exactly', () => {
  let g = G({ mag: 3, reserveAmmo: 100, reloadingUntil: 0 });
  g = { ...g, ...startReload(g, 10) };
  assert.equal(g.reloadingUntil, 10 + WEAPONS[DEFAULT_WEAPON].reloadSeconds);
  assert.equal(canFire(g, 10.5), false, 'cannot fire mid-reload');
  assert.equal(g.mag, 3, 'rounds arrive at the END of the reload, not the start');
  g = { ...g, ...finishReload(g) };
  assert.equal(g.mag, WEAPONS[DEFAULT_WEAPON].mag);
  assert.equal(g.reserveAmmo, 100 - (WEAPONS[DEFAULT_WEAPON].mag - 3), 'reserve paid only the topped-up rounds');
});

test('reload floors at the reserve: 5 rounds left fills 5, an empty reserve reloads nothing', () => {
  let g = G({ mag: 0, reserveAmmo: 5, reloadingUntil: 0 });
  g = { ...g, ...startReload(g, 1), };
  g = { ...g, ...finishReload(g) };
  assert.equal(g.mag, 5);
  assert.equal(g.reserveAmmo, 0);
  const empty = G({ mag: 0, reserveAmmo: 0, reloadingUntil: 0 });
  assert.deepEqual(startReload(empty, 1), {}, 'no reserve = no reload state entered');
});

test('a full mag refuses to reload — R with 24/120 must not waste the press', () => {
  const g = G({ mag: WEAPONS[DEFAULT_WEAPON].mag, reserveAmmo: 120, reloadingUntil: 0 });
  assert.deepEqual(startReload(g, 1), {});
  assert.equal(needsReload(g), false);
  assert.equal(needsReload(G({ mag: 0, reserveAmmo: 10 })), true);
});

test('recovery can NEVER start between the shots of a held burst — delay exceeds the fire cycle', async () => {
  const { recoverDelay } = await import('../src/combat/gunState.js');
  for (const id of Object.keys(WEAPONS)) {
    const g = G({ weaponId: id });
    assert.ok(recoverDelay(g) > WEAPONS[id].fireInterval,
      `${id}: recoverDelay ${recoverDelay(g)} must exceed fireInterval ${WEAPONS[id].fireInterval}`);
  }
});

// ---- S4.5 F7: the pattern CYCLES past its end instead of sliding forever ------------------------
test('F7: a long burst repeats the declared loop segment — it never freezes on one kick', () => {
  const w = WEAPONS[DEFAULT_WEAPON];
  const [from, to] = w.recoilLoop;
  const span = (to - from) + 1;
  const at = (i) => recoilKick(G({ lastShotAt: 10, burstIndex: i }), 10.05);
  // Shot n and shot n+span land on the same kick once the pattern has run out.
  const a = at(w.recoilPattern.length + 1);
  const b = at(w.recoilPattern.length + 1 + span);
  assert.deepEqual([a.pitch, a.yaw], [b.pitch, b.yaw], 'the tail is a cycle, not a clamp');
  // And the cycle actually MOVES: a clamped tail would make every late shot identical.
  const distinct = new Set(Array.from({ length: span }, (_, k) =>
    JSON.stringify(at(w.recoilPattern.length + k)))).size;
  assert.ok(distinct > 1, `a burst tail must vary; saw ${distinct} distinct kicks`);
});

test('F6: holster puts everything back — cone, burst, sights, magazine', async () => {
  const { holster } = await import('../src/combat/gunState.js');
  const g = holster({ weaponId: DEFAULT_WEAPON, spread: 0.035, burstIndex: 7, ads: true, mag: 0, reserveAmmo: 3, reloadingUntil: 99, lastShotAt: 5 });
  const w = WEAPONS[DEFAULT_WEAPON];
  assert.deepEqual(
    { spread: g.spread, burstIndex: g.burstIndex, ads: g.ads, mag: g.mag, reserveAmmo: g.reserveAmmo, reloadingUntil: g.reloadingUntil },
    { spread: w.spread.base, burstIndex: 0, ads: false, mag: w.mag, reserveAmmo: w.reserve, reloadingUntil: 0 },
  );
});
