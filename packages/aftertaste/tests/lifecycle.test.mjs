import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPAWN_SECONDS, ATTACK_SECONDS, ATTACK_WINDUP, DEATH_SECONDS,
  CAPABILITIES, can, holdsWave, hurtsNow, stepLifecycle,
} from '../src/systems/lifecycle.js';

/**
 * The lifecycle is a STATE MACHINE and these tests are its contract: which states exist, what each
 * state is allowed to do, and exactly when it becomes another state. Every downstream system
 * (steering, combat, waves, the store) asks this table instead of inventing its own opinion —
 * which is the entire point: one place to be wrong.
 */

const at = (state, since = 0, extra = {}) => ({ id: 'e1', x: 0, z: 0, hp: 2, state, stateSince: since, ...extra });

// --- the capabilities table -------------------------------------------------------------------

test('every state declares all four capabilities — no downstream guessing', () => {
  for (const [state, caps] of Object.entries(CAPABILITIES)) {
    for (const key of ['canMove', 'canHurt', 'canBeShot', 'holdsWave']) {
      assert.equal(typeof caps[key], 'boolean', `${state}.${key} must be declared`);
    }
  }
});

test('only alive moves; only attacking hurts; dying is untargetable and does not hold the wave', () => {
  assert.equal(can(at('alive'), 'canMove'), true);
  assert.equal(can(at('spawning'), 'canMove'), false);
  assert.equal(can(at('attacking'), 'canMove'), false);
  assert.equal(can(at('dying'), 'canMove'), false);
  assert.equal(can(at('attacking'), 'canHurt'), true);
  assert.equal(can(at('alive'), 'canHurt'), false);
  assert.equal(can(at('dying'), 'canBeShot'), false);
  assert.equal(can(at('spawning'), 'canBeShot'), false);
  assert.equal(holdsWave(at('dying')), false);
  assert.equal(holdsWave(at('alive')), true);
  assert.equal(holdsWave(at('spawning')), true);
});

test('an enemy with NO state field behaves as alive — lifecycle is opt-in per enemy', () => {
  const legacy = { id: 'x', x: 0, z: 0, hp: 2 };
  assert.equal(can(legacy, 'canMove'), true);
  assert.equal(holdsWave(legacy), true);
});

// --- transitions ------------------------------------------------------------------------------

// Boundary tests probe "just after", not the exact instant: 10 + 0.6 - 10 is 0.5999999999999996
// in floating point, and a game tick never lands on an exact boundary anyway. The contract under
// test is the ORDERING (before < boundary < after), not IEEE-754 equality.
test('spawning becomes alive after SPAWN_SECONDS, not a frame before', () => {
  const e = at('spawning', 10);
  assert.equal(stepLifecycle(e, 10 + SPAWN_SECONDS - 0.01, false), e, 'same object = no transition');
  const grown = stepLifecycle(e, 10 + SPAWN_SECONDS + 1e-6, false);
  assert.equal(grown.state, 'alive');
  assert.equal(grown.stateSince, 10 + SPAWN_SECONDS + 1e-6);
});

test('alive starts attacking on touch, and NOT merely from time passing', () => {
  const e = at('alive', 0);
  assert.equal(stepLifecycle(e, 999, false), e);
  const attacking = stepLifecycle(e, 5, true);
  assert.equal(attacking.state, 'attacking');
  assert.equal(attacking.stateSince, 5);
});

test('an attack lasts exactly ATTACK_SECONDS then returns to alive (which may re-attack next tick)', () => {
  const e = at('attacking', 5);
  assert.equal(stepLifecycle(e, 5 + ATTACK_SECONDS - 0.01, true), e, 'still mid-attack');
  const done = stepLifecycle(e, 5 + ATTACK_SECONDS + 1e-6, true);
  assert.equal(done.state, 'alive');
});

test('dying is removed after DEATH_SECONDS — null means "take it off the board"', () => {
  const e = at('dying', 2);
  assert.equal(stepLifecycle(e, 2 + DEATH_SECONDS - 0.01, false), e, 'corpse still animating');
  assert.equal(stepLifecycle(e, 2 + DEATH_SECONDS + 1e-6, false), null);
});

test('no transition returns the SAME object — identity is the cheap change detector', () => {
  const e = at('alive', 0);
  assert.equal(stepLifecycle(e, 1, false), e);
});

// --- the strike window ------------------------------------------------------------------------

test('hurtsNow: only an attack past its wind-up hurts — the wind-up IS the dodge window', () => {
  assert.equal(hurtsNow(at('attacking', 10), 10 + ATTACK_WINDUP - 0.01), false);
  assert.equal(hurtsNow(at('attacking', 10), 10 + ATTACK_WINDUP), true);
  assert.equal(hurtsNow(at('alive', 10), 999), false);
  assert.equal(hurtsNow(at('dying', 10), 999), false);
});

test('the wind-up is shorter than the attack — otherwise the strike moment never happens', () => {
  assert.ok(ATTACK_WINDUP < ATTACK_SECONDS);
});
