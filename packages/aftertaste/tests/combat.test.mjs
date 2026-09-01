/**
 * Combat, as pure functions — rewritten for the FPS slice.
 *
 * TEST-DELTA DISCLOSURE: the Slice-4 tests for `hits`/`fireAt` (point-and-radius, click-to-shoot)
 * were REMOVED together with that mechanic when Sean redirected shooting to the Overwatch/BF6
 * model — hitscan from the eye. The damage/isDead tests survive unchanged; the ray tests below
 * are the new mechanic's contract. See CONCEPTS/fps-camera-and-hitscan.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hitscan, damage, isDead, ENEMY_HP, AIM_RADIUS, TARGET_HEIGHT, MAX_RANGE,
} from '../src/combat/combat.js';

const eye = { x: 0, y: 1.6, z: 0 };
/** A level ray needs a level target: fire from waist height so geometry is 2D-simple. */
const waist = { x: 0, y: TARGET_HEIGHT, z: 0 };
const FWD = { x: 0, y: 0, z: -1 };

test('a straight-ahead shot hits the enemy in front of you', () => {
  const hit = hitscan(waist, FWD, [{ id: 'a', x: 0, z: -10 }]);
  assert.equal(hit?.target.id, 'a');
  assert.ok(Math.abs(hit.t - 10) < 1e-9, 'distance along the ray is reported');
});

test('an enemy BEHIND you is never hit — guns do not shoot backwards', () => {
  assert.equal(hitscan(waist, FWD, [{ id: 'a', x: 0, z: +10 }]), null);
});

test('of two enemies on the same line, the NEARER one takes the shot', () => {
  const hit = hitscan(waist, FWD, [
    { id: 'far', x: 0, z: -20 },
    { id: 'near', x: 0, z: -5 },
  ]);
  assert.equal(hit.target.id, 'near');
});

test('a shot passing within AIM_RADIUS counts; outside it misses', () => {
  assert.ok(hitscan(waist, FWD, [{ id: 'graze', x: AIM_RADIUS - 0.01, z: -10 }]));
  assert.equal(hitscan(waist, FWD, [{ id: 'wide', x: AIM_RADIUS + 0.01, z: -10 }]), null);
});

test('beyond MAX_RANGE the shot hits nothing', () => {
  assert.equal(hitscan(waist, FWD, [{ id: 'a', x: 0, z: -(MAX_RANGE + 1) }]), null);
});

test('shooting from eye height at the floor-standing enemy works when the ray tilts down', () => {
  // Enemy centre is at TARGET_HEIGHT; from a 1.6-high eye a LEVEL ray passes 1.1 above it — too
  // far. Aim down at it and it hits. This is why aim has pitch.
  const ez = -10;
  assert.equal(hitscan(eye, FWD, [{ id: 'a', x: 0, z: ez }]), null, 'level ray sails over');
  const dy = TARGET_HEIGHT - eye.y;
  const len = Math.hypot(ez, dy);
  const down = { x: 0, y: dy / len, z: ez / len };
  assert.equal(hitscan(eye, down, [{ id: 'a', x: 0, z: ez }])?.target.id, 'a');
});

test('an empty world is a miss, not a crash', () => {
  assert.equal(hitscan(waist, FWD, []), null);
});

test('damage reduces hp and never mutates the enemy passed in', () => {
  const enemy = { hp: ENEMY_HP, x: 0, z: 0 };
  const hurt = damage(enemy, 1);
  assert.equal(hurt.hp, ENEMY_HP - 1);
  assert.equal(enemy.hp, ENEMY_HP, 'the original must be untouched');
});

test('hp floors at zero — negative hp breaks every UI that renders a bar', () => {
  assert.equal(damage({ hp: 1, x: 0, z: 0 }, 999).hp, 0);
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
