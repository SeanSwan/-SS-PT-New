import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLook, aimDirection, PITCH_LIMIT, SENSITIVITY } from '../src/player/aim.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('mouse right turns right: positive dx lowers yaw, and aimDirection swings toward +x', () => {
  const a = applyLook({ yaw: 0, pitch: 0 }, 100, 0);
  assert.ok(a.yaw < 0);
  const dir = aimDirection(a.yaw, 0);
  assert.ok(dir.x > 0, 'looking rightward of -z means +x');
});

test('mouse up looks up: negative dy raises pitch, and the direction gains +y', () => {
  const a = applyLook({ yaw: 0, pitch: 0 }, 0, -100);
  assert.ok(a.pitch > 0);
  assert.ok(aimDirection(0, a.pitch).y > 0);
});

test('pitch clamps at ±PITCH_LIMIT — you cannot look past straight up', () => {
  const up = applyLook({ yaw: 0, pitch: 0 }, 0, -1e9);
  close(up.pitch, PITCH_LIMIT);
  const down = applyLook({ yaw: 0, pitch: 0 }, 0, 1e9);
  close(down.pitch, -PITCH_LIMIT);
});

test('yaw does NOT clamp — spinning in circles is allowed', () => {
  const a = applyLook({ yaw: 0, pitch: 0 }, 1e7, 0);
  assert.ok(Math.abs(a.yaw) > Math.PI * 2);
});

test('aimDirection at rest is three.js forward (0,0,-1), and is always unit length', () => {
  const d0 = aimDirection(0, 0);
  close(d0.x, 0); close(d0.y, 0); close(d0.z, -1);
  for (const [yaw, pitch] of [[0.3, 0.2], [-2.1, -1.0], [Math.PI, PITCH_LIMIT]]) {
    const d = aimDirection(yaw, pitch);
    close(Math.hypot(d.x, d.y, d.z), 1);
  }
});

test('a quarter turn right faces +x exactly', () => {
  const d = aimDirection(-Math.PI / 2, 0);
  close(d.x, 1); close(d.z, 0, 1e-9);
});

test('applyLook is pure — the input object is not mutated', () => {
  const input = { yaw: 1, pitch: 0.5 };
  applyLook(input, 50, 50);
  assert.deepEqual(input, { yaw: 1, pitch: 0.5 });
});

test('sensitivity scales turn linearly', () => {
  const one = applyLook({ yaw: 0, pitch: 0 }, 10, 0, SENSITIVITY);
  const twice = applyLook({ yaw: 0, pitch: 0 }, 10, 0, SENSITIVITY * 2);
  close(twice.yaw, one.yaw * 2);
});
