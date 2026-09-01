/**
 * Slice 2 — the movement rule, tested as a pure function.
 *
 * WHY A PURE FUNCTION: the game loop calls this every frame. If movement lived inside the React
 * component you could only test it by driving a browser. As a plain function of
 * (position, keys, delta) -> position, it is testable in milliseconds and, more importantly, it is
 * READABLE — you can see the whole rule at once.
 *
 * Run: node --test tests/     (Node's built-in runner, no dependency)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { step, SPEED } from '../src/player/movement.js';

const at = (x = 0, z = 0) => ({ x, z });
const none = { forward: false, back: false, left: false, right: false };

test('W moves forward (negative z, the direction the camera looks)', () => {
  const next = step(at(), { ...none, forward: true }, 1);
  assert.equal(next.z, -SPEED);
  assert.equal(next.x, 0);
});

test('S moves back, the exact opposite of W', () => {
  const f = step(at(), { ...none, forward: true }, 1);
  const b = step(at(), { ...none, back: true }, 1);
  assert.equal(b.z, -f.z);
});

test('A and D move along x', () => {
  assert.equal(step(at(), { ...none, left: true }, 1).x, -SPEED);
  assert.equal(step(at(), { ...none, right: true }, 1).x, SPEED);
});

test('movement scales with delta, so speed does not depend on frame rate', () => {
  const slow = step(at(), { ...none, forward: true }, 1);
  const fast = step(at(), { ...none, forward: true }, 0.5);
  assert.equal(fast.z, slow.z / 2);
});

test('diagonal is not faster than straight (the classic bug)', () => {
  const straight = step(at(), { ...none, forward: true }, 1);
  const diagonal = step(at(), { ...none, forward: true, right: true }, 1);
  const lenStraight = Math.hypot(straight.x, straight.z);
  const lenDiagonal = Math.hypot(diagonal.x, diagonal.z);
  assert.ok(
    Math.abs(lenDiagonal - lenStraight) < 1e-9,
    `diagonal ${lenDiagonal} should equal straight ${lenStraight} — normalise the direction`,
  );
});

test('no keys means no movement, and the same object shape comes back', () => {
  const next = step(at(3, 4), none, 1);
  assert.deepEqual(next, { x: 3, z: 4 });
});

test('opposite keys cancel instead of jittering', () => {
  const next = step(at(), { ...none, forward: true, back: true }, 1);
  assert.deepEqual(next, { x: 0, z: 0 });
});

// --- FPS: movement is view-relative (the Overwatch/BF6 change) --------------------------------

test('yaw rotates intent: facing +x (a quarter-turn right), W walks along +x', () => {
  const next = step({ x: 0, z: 0 }, { forward: true, back: false, left: false, right: false }, 1, -Math.PI / 2);
  assert.ok(Math.abs(next.x - SPEED) < 1e-9, `walked +x, got ${next.x}`);
  assert.ok(Math.abs(next.z) < 1e-9, `no z drift, got ${next.z}`);
});

test('yaw defaults to 0, so every pre-FPS movement behaviour is unchanged', () => {
  const a = step({ x: 1, z: 2 }, { forward: true, back: false, left: false, right: false }, 0.5);
  const b = step({ x: 1, z: 2 }, { forward: true, back: false, left: false, right: false }, 0.5, 0);
  assert.deepEqual(a, b);
});

test('strafing right while facing +x walks +z (your right hand points south now)', () => {
  const next = step({ x: 0, z: 0 }, { forward: false, back: false, left: false, right: true }, 1, -Math.PI / 2);
  assert.ok(Math.abs(next.z - SPEED) < 1e-9, `walked +z, got ${next.z}`);
  assert.ok(Math.abs(next.x) < 1e-9);
});
