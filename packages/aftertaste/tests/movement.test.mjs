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
import { step, stepV, SPEED, SPRINT_MULT } from '../src/player/movement.js';

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

// --- FEEL PACK (playtest 2): velocity, sprint, jump — red-first against the old teleport-feel --

test('velocity ramps: one frame of W does not reach full speed instantly', () => {
  const s0 = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  const s1 = stepV(s0, { forward: true, back: false, left: false, right: false, sprint: false, jump: false }, 1 / 60, 0);
  const speed1 = Math.hypot(s1.vx, s1.vz);
  assert.ok(speed1 > 0, 'moving');
  assert.ok(speed1 < SPEED * 0.75, `first frame at ${speed1} — instant full speed is the old teleport-feel`);
});

test('held W converges to full speed within ~0.2s, and stopping decays fast', () => {
  let s = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  const held = { forward: true, back: false, left: false, right: false, sprint: false, jump: false };
  for (let i = 0; i < 12; i++) s = stepV(s, held, 1 / 60, 0);
  assert.ok(Math.hypot(s.vx, s.vz) > SPEED * 0.95, 'converged to run speed');
  const released = { ...held, forward: false };
  for (let i = 0; i < 8; i++) s = stepV(s, released, 1 / 60, 0);
  assert.ok(Math.hypot(s.vx, s.vz) < SPEED * 0.2, 'stops quickly — sliding is not weight, it is soap');
});

test('sprint multiplies the target speed', () => {
  let walk = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  let run = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  const base = { forward: true, back: false, left: false, right: false, jump: false };
  for (let i = 0; i < 30; i++) {
    walk = stepV(walk, { ...base, sprint: false }, 1 / 60, 0);
    run = stepV(run, { ...base, sprint: true }, 1 / 60, 0);
  }
  const ratio = Math.hypot(run.vx, run.vz) / Math.hypot(walk.vx, walk.vz);
  assert.ok(Math.abs(ratio - SPRINT_MULT) < 0.05, `sprint ratio ${ratio.toFixed(2)} vs ${SPRINT_MULT}`);
});

test('jump: grounded jump rises, arcs, and lands back at y=0; airborne jumps are refused', () => {
  let s = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  const idle = { forward: false, back: false, left: false, right: false, sprint: false };
  s = stepV(s, { ...idle, jump: true }, 1 / 60, 0);
  assert.ok(s.vy > 0, 'left the ground');
  const vyAfterFirst = s.vy;
  s = stepV(s, { ...idle, jump: true }, 1 / 60, 0); // mashing jump mid-air
  assert.ok(s.vy < vyAfterFirst, 'no double jump — gravity is winning');
  let peak = 0; let frames = 0;
  while ((s.y > 0 || s.vy > 0) && frames < 300) { s = stepV(s, { ...idle, jump: false }, 1 / 60, 0); peak = Math.max(peak, s.y); frames += 1; }
  assert.ok(peak > 0.35 && peak < 1.2, `jump peak ${peak.toFixed(2)} — clears a crumb, not a building`);
  assert.equal(s.y, 0, 'landed');
  assert.equal(s.vy, 0, 'at rest');
});

test('air control exists but is reduced — you steer a jump, you do not teleport it', () => {
  let grounded = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0 };
  let airborne = { x: 0, z: 0, vx: 0, vz: 0, y: 0.5, vy: 1 };
  const w = { forward: true, back: false, left: false, right: false, sprint: false, jump: false };
  grounded = stepV(grounded, w, 1 / 60, 0);
  airborne = stepV(airborne, w, 1 / 60, 0);
  const g = Math.hypot(grounded.vx, grounded.vz);
  const a = Math.hypot(airborne.vx, airborne.vz);
  assert.ok(a > 0 && a < g, `air accel ${a} < ground accel ${g}`);
});
