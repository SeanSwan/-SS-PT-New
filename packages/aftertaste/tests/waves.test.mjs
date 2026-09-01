/**
 * Slice 5 — waves and the round, as pure functions.
 *
 * This is the slice the whole grey-box exists for. If the loop is not fun HERE, with boxes, more
 * art will not save it. See CONCEPTS/game-feel.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { waveSize, spawnRing, tickRound, PLAYER_HP, TOUCH_RADIUS } from '../src/systems/waves.js';

const at = (x, z) => ({ x, z });

test('waves get bigger', () => {
  assert.ok(waveSize(2) > waveSize(1));
  assert.ok(waveSize(5) > waveSize(2));
});

test('wave 1 is small enough to learn on', () => {
  assert.ok(waveSize(1) <= 4, `wave 1 was ${waveSize(1)} — too many to learn the controls`);
});

test('wave size is bounded, so wave 50 cannot melt the machine', () => {
  assert.ok(waveSize(50) <= 40, `wave 50 was ${waveSize(50)}`);
});

test('spawnRing places every enemy the requested distance away, all around', () => {
  const spawns = spawnRing(8, 20);
  assert.equal(spawns.length, 8);
  for (const s of spawns) {
    const d = Math.hypot(s.x, s.z);
    assert.ok(Math.abs(d - 20) < 1e-6, `spawned at distance ${d}, expected 20`);
  }
  // Spread, not stacked: they must not all share one angle.
  const uniqueX = new Set(spawns.map((s) => s.x.toFixed(3)));
  assert.ok(uniqueX.size > 1, 'spawns are stacked on one point');
});

test('spawns carry hp and a unique id', () => {
  const spawns = spawnRing(5, 10);
  assert.equal(new Set(spawns.map((s) => s.id)).size, 5, 'ids must be unique');
  assert.ok(spawns.every((s) => s.hp > 0));
});

test('an enemy touching the player costs a life', () => {
  const r = tickRound({ hp: PLAYER_HP, wave: 1 }, at(0, 0), [at(0, 0)]);
  assert.equal(r.hp, PLAYER_HP - 1);
});

test('an enemy at arm\'s length does NOT cost a life', () => {
  const r = tickRound({ hp: PLAYER_HP, wave: 1 }, at(0, 0), [at(TOUCH_RADIUS + 1, 0)]);
  assert.equal(r.hp, PLAYER_HP);
});

test('several enemies touching at once cost ONE life, not one each', () => {
  const r = tickRound({ hp: PLAYER_HP, wave: 1 }, at(0, 0), [at(0, 0), at(0.1, 0), at(0, 0.1)]);
  assert.equal(r.hp, PLAYER_HP - 1, 'a crowd must not delete the whole health bar in one frame');
});

test('hp reaching zero ends the round', () => {
  const r = tickRound({ hp: 1, wave: 3 }, at(0, 0), [at(0, 0)]);
  assert.equal(r.hp, 0);
  assert.equal(r.over, true);
});

test('surviving with enemies left does not end the round', () => {
  const r = tickRound({ hp: PLAYER_HP, wave: 1 }, at(0, 0), [at(30, 30)]);
  assert.equal(r.over, false);
});

test('clearing a wave advances to the next one', () => {
  const r = tickRound({ hp: PLAYER_HP, wave: 1 }, at(0, 0), []);
  assert.equal(r.wave, 2);
  assert.equal(r.cleared, true);
});

test('hp never goes negative, however hard you are hit', () => {
  const r = tickRound({ hp: 1, wave: 1 }, at(0, 0), [at(0, 0), at(0, 0)]);
  assert.ok(r.hp >= 0, `hp was ${r.hp}`);
});

test('spawnRing centres on the player, not the origin — the world is infinite now', () => {
  const ring = spawnRing(4, 10, 1, { x: 100, z: -50 });
  for (const e of ring) {
    const d = Math.hypot(e.x - 100, e.z - -50);
    assert.ok(Math.abs(d - 10) < 1e-9, `enemy at radius ${d} from the given centre`);
  }
});
