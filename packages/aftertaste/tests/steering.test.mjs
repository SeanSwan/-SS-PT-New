/**
 * Slice 3 — steering, tested as pure functions.
 *
 * Steering is "cheap rules that look smart". Each enemy asks one question per frame — "which way
 * is the player, and who am I standing on?" — and the answer is a direction. No map, no route, no
 * search. That is what makes 40 of them affordable; see CONCEPTS/steering-vs-pathfinding.md.
 *
 * Run: node --test tests/steering.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { seek, separate, stepEnemy, ENEMY_SPEED, SEPARATION_RADIUS } from '../src/enemies/steering.js';

const at = (x, z) => ({ x, z });
const len = (v) => Math.hypot(v.x, v.z);

test('seek points from the enemy toward the player', () => {
  const dir = seek(at(0, 0), at(10, 0));
  assert.ok(dir.x > 0 && Math.abs(dir.z) < 1e-9, `expected +x, got ${JSON.stringify(dir)}`);
});

test('seek returns a unit direction, so speed is decided by SPEED alone', () => {
  const near = seek(at(0, 0), at(1, 0));
  const far = seek(at(0, 0), at(500, 0));
  assert.ok(Math.abs(len(near) - 1) < 1e-9, `near length ${len(near)}`);
  assert.ok(Math.abs(len(far) - 1) < 1e-9, `far length ${len(far)}`);
});

test('seek on top of the player returns zero, not NaN (the divide-by-zero trap)', () => {
  const dir = seek(at(3, 3), at(3, 3));
  assert.equal(dir.x, 0);
  assert.equal(dir.z, 0);
  assert.ok(!Number.isNaN(dir.x) && !Number.isNaN(dir.z));
});

test('separation pushes away from a neighbour that is too close', () => {
  const push = separate(at(0, 0), [at(0.5, 0)]);
  assert.ok(push.x < 0, `expected to be pushed -x, got ${JSON.stringify(push)}`);
});

test('separation ignores neighbours beyond the radius', () => {
  const push = separate(at(0, 0), [at(SEPARATION_RADIUS + 5, 0)]);
  assert.deepEqual(push, { x: 0, z: 0 });
});

test('separation ignores the enemy itself at distance zero (no NaN from self-comparison)', () => {
  const push = separate(at(2, 2), [at(2, 2)]);
  assert.ok(!Number.isNaN(push.x) && !Number.isNaN(push.z), JSON.stringify(push));
});

test('an enemy moves toward the player, at ENEMY_SPEED, scaled by delta', () => {
  const next = stepEnemy(at(0, 0), at(10, 0), [], 1);
  assert.ok(Math.abs(next.x - ENEMY_SPEED) < 1e-9, `moved to ${next.x}, expected ${ENEMY_SPEED}`);
});

test('enemies are slower than the player, or the game is unplayable', async () => {
  const { SPEED: PLAYER_SPEED } = await import('../src/player/movement.js');
  assert.ok(ENEMY_SPEED < PLAYER_SPEED, `enemy ${ENEMY_SPEED} must be < player ${PLAYER_SPEED}`);
});

test('two enemies at the same spot do not stay stacked', () => {
  const a = at(0, 0), b = at(0.01, 0);
  const nextA = stepEnemy(a, at(0, -50), [b], 1);
  const nextB = stepEnemy(b, at(0, -50), [a], 1);
  const before = Math.hypot(a.x - b.x, a.z - b.z);
  const after = Math.hypot(nextA.x - nextB.x, nextA.z - nextB.z);
  assert.ok(after > before, `they should spread: ${before} -> ${after}`);
});

test('an enemy already touching the player does not jitter or NaN', () => {
  const next = stepEnemy(at(5, 5), at(5, 5), [], 1);
  assert.ok(!Number.isNaN(next.x) && !Number.isNaN(next.z));
  assert.deepEqual(next, { x: 5, z: 5 });
});
