import test from 'node:test';
import assert from 'node:assert/strict';
import { AWARD, awardForShot, awardForRound, expectedRoundIncome } from '../src/systems/economy.js';
import { ROSTER, unlockedTypes } from '../src/enemies/roster.js';
import { PARTS } from '../src/enemies/partsData.js';

/** The economy's laws, as tests. Numbers get tuned; these relationships do not. */

test('a body hit pays NOTHING — the rule the whole economy is built on', () => {
  assert.equal(awardForShot({ severed: 0, killed: false }), 0);
  assert.equal(awardForShot({}), 0);
});

test('results pay: a sever, a kill, and a headshot kill is both', () => {
  assert.equal(awardForShot({ severed: 1 }), AWARD.sever);
  assert.equal(awardForShot({ killed: true }), AWARD.kill);
  assert.equal(awardForShot({ severed: 1, killed: true }), AWARD.sever + AWARD.kill,
    'the best outcome in the game pays the most');
  assert.ok(AWARD.kill > AWARD.sever, 'a kill outranks a limb');
});

test('a multi-sever shot (a shotgun, later) pays per part', () => {
  assert.equal(awardForShot({ severed: 3 }), 3 * AWARD.sever);
});

test('round bonuses scale with the round — pushing deeper is worth the risk', () => {
  assert.ok(awardForRound(5) > awardForRound(1));
  assert.equal(awardForRound(1) * 5, awardForRound(5), 'linear, not exponential: no runaway');
});

test('THE AFFORDABILITY GATE: a round-5 player affords the first door OR the first gun, not both', () => {
  // The blueprint's design gate as arithmetic (GLM 5.3 #13) rather than a hope. Sum a clean run
  // through round 5 using the real wave composition and the real cast.
  const roster = Object.fromEntries(Object.entries(ROSTER).map(([k, v]) => [k, { ...v, parts: PARTS[k] }]));
  let total = 0;
  for (let wave = 1; wave <= 5; wave++) {
    const types = unlockedTypes(wave);
    const size = Math.min(40, 1 + wave * 2);
    // Repeat the unlock cycle across the wave's slots, exactly as typeForSlot does.
    const slots = Array.from({ length: size }, (_, i) => types[i % types.length]);
    total += expectedRoundIncome(slots, roster, wave);
  }
  const DOOR = 1250; const WALL_BUY_SMG = 750;
  assert.ok(total >= WALL_BUY_SMG, `round-5 income ${total} must at least afford the first gun`);
  assert.ok(total < DOOR + WALL_BUY_SMG,
    `round-5 income ${total} must NOT afford door + gun together — the choice is the game`);
});
