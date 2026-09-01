/**
 * Slice 4 — combat, as pure functions.
 *
 * No physics engine. A bullet hitting a box is a distance check, and knowing you do NOT need
 * rapier here is the point of this slice. See CONCEPTS/collision-without-physics.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { hits, damage, isDead, fireAt, ENEMY_HP, HIT_RADIUS } from '../src/combat/combat.js';

const at = (x, z) => ({ x, z });

test('a shot inside the radius hits', () => {
  assert.equal(hits(at(0, 0), at(0.5, 0)), true);
});

test('a shot outside the radius misses', () => {
  assert.equal(hits(at(0, 0), at(HIT_RADIUS + 1, 0)), false);
});

test('the boundary is inclusive, and stated rather than accidental', () => {
  assert.equal(hits(at(0, 0), at(HIT_RADIUS, 0)), true);
});

test('damage reduces hp and never mutates the enemy passed in', () => {
  const enemy = { hp: ENEMY_HP, x: 0, z: 0 };
  const hurt = damage(enemy, 1);
  assert.equal(hurt.hp, ENEMY_HP - 1);
  assert.equal(enemy.hp, ENEMY_HP, 'the original must be untouched');
});

test('hp floors at zero — negative hp breaks every UI that renders a bar', () => {
  const enemy = { hp: 1, x: 0, z: 0 };
  assert.equal(damage(enemy, 999).hp, 0);
});

test('dead means hp <= 0', () => {
  assert.equal(isDead({ hp: 0 }), true);
  assert.equal(isDead({ hp: 1 }), false);
});

test('an enemy takes ENEMY_HP shots to kill, not one', () => {
  let e = { hp: ENEMY_HP, x: 0, z: 0 };
  for (let i = 0; i < ENEMY_HP - 1; i++) {
    e = damage(e, 1);
    assert.equal(isDead(e), false, `died early after ${i + 1} shots`);
  }
  assert.equal(isDead(damage(e, 1)), true);
});

test('fireAt damages every enemy in range and leaves the rest alone', () => {
  const enemies = [
    { id: 'a', hp: ENEMY_HP, x: 0, z: 0 },
    { id: 'b', hp: ENEMY_HP, x: 50, z: 50 },
  ];
  const { enemies: next, killed } = fireAt(enemies, at(0, 0));
  assert.equal(next[0].hp, ENEMY_HP - 1, 'in range should be damaged');
  assert.equal(next[1].hp, ENEMY_HP, 'out of range must be untouched');
  assert.equal(killed, 0);
});

test('fireAt reports kills, and dead enemies are removed', () => {
  const enemies = [{ id: 'a', hp: 1, x: 0, z: 0 }];
  const { enemies: next, killed } = fireAt(enemies, at(0, 0));
  assert.equal(killed, 1);
  assert.equal(next.length, 0, 'a dead enemy must not linger');
});

test('fireAt on an empty world is a no-op, not a crash', () => {
  const { enemies, killed } = fireAt([], at(0, 0));
  assert.deepEqual(enemies, []);
  assert.equal(killed, 0);
});

test('a miss changes nothing at all', () => {
  const enemies = [{ id: 'a', hp: ENEMY_HP, x: 99, z: 99 }];
  const { enemies: next, killed } = fireAt(enemies, at(0, 0));
  assert.equal(next[0].hp, ENEMY_HP);
  assert.equal(killed, 0);
});
