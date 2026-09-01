import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, unlockedTypes, typeForSlot } from '../src/enemies/roster.js';
import { SPEED } from '../src/player/movement.js';

/**
 * The roster is data, so its tests are SCHEMA tests: every row complete, every number inside the
 * design's hard constraints. A missing stat here is a monster that half-works at runtime with no
 * error anywhere.
 */

test('every monster declares the full row — hp, speed, aimRadius, measured bounds, both tints, ember', () => {
  for (const [type, spec] of Object.entries(ROSTER)) {
    assert.ok(spec.hp >= 1, `${type}.hp`);
    assert.ok(spec.speed > 0, `${type}.speed`);
    assert.ok(spec.aimRadius > 0, `${type}.aimRadius`);
    for (const k of ['minX', 'maxX', 'minZ', 'maxZ', 'height']) {
      assert.equal(typeof spec.model[k], 'number', `${type}.model.${k}`);
    }
    assert.ok(spec.model.height > 0, `${type} height positive`);
    assert.ok(spec.model.maxX > spec.model.minX, `${type} has width`);
    assert.equal(spec.tint.length, 2, `${type} healthy + damaged tints`);
    assert.ok(spec.ember, `${type}.ember — a threat must never fade into darkness`);
  }
});

test('THE ratio law: every monster is slower than the player, or there is no game', () => {
  for (const [type, spec] of Object.entries(ROSTER)) {
    assert.ok(spec.speed < SPEED, `${type} speed ${spec.speed} must stay below player ${SPEED}`);
  }
});

test('wave 1 is frylings only — one new face per wave, learnable then relentless', () => {
  assert.deepEqual(unlockedTypes(1), ['fryling']);
  for (let i = 0; i < 5; i++) assert.equal(typeForSlot(1, i), 'fryling');
});

test('by wave 4 every monster is in the mix, and the cycle is deterministic', () => {
  assert.equal(unlockedTypes(4).length, 4);
  const seen = new Set();
  for (let i = 0; i < 8; i++) seen.add(typeForSlot(4, i));
  assert.equal(seen.size, 4, 'eight slots at wave 4 contain all four types');
  assert.equal(typeForSlot(4, 0), typeForSlot(4, 4), 'a cycle, not a dice roll');
});

test('wave 99 does not walk off the unlock list', () => {
  assert.equal(unlockedTypes(99).length, 4);
  assert.ok(ROSTER[typeForSlot(99, 7)], 'every slot resolves to a real monster');
});

test('the aim sphere must cover most of the body it stands in for — no invisible misses', () => {
  // A single sphere for a long body is an approximation; below ~80% of the longest normalized
  // half-extent, shots visibly through the rendered body miss with no feedback (GLM-Flash, F4).
  for (const [type, spec] of Object.entries(ROSTER)) {
    const scale = 1 / spec.model.height;
    const halfX = ((spec.model.maxX - spec.model.minX) / 2) * scale;
    const halfZ = ((spec.model.maxZ - spec.model.minZ) / 2) * scale;
    const longestHalf = Math.max(halfX, halfZ);
    assert.ok(
      spec.aimRadius >= 0.8 * longestHalf,
      `${type}: aimRadius ${spec.aimRadius} covers under 80% of its ${longestHalf.toFixed(2)} half-extent`,
    );
  }
});
