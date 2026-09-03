import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COST, costOf, budgetFor, expectedRoundSeconds, pickWindow, stepDirector, roundOver, freshRound,
} from '../src/systems/director.js';
import { QUEUE_CAP, throughputSeconds } from '../src/systems/windows.js';
import { ROSTER } from '../src/enemies/roster.js';

/** S6b — ONE machine decides who arrives. These are the laws that keep it one machine. */

test('cost is per TYPE, so composition can change without touching the size curve', () => {
  assert.ok(costOf('crumb-roach') < costOf('regular'), 'a roach is cheaper pressure than a person');
  assert.ok(costOf('kissing-bug') > costOf('regular'), 'an ambusher is worth more than a body');
  assert.equal(costOf('a-face-nobody-declared'), COST.default, 'an unknown face costs the default');
});

test('the budget grows and CAPS — wave 50 cannot melt the machine', () => {
  assert.ok(budgetFor(5) > budgetFor(1));
  assert.ok(budgetFor(50) <= 40);
  assert.ok(budgetFor(1) <= 6, 'wave 1 is small enough to learn on');
});

test('ROUND LENGTH IS ARITHMETIC, not a hope', () => {
  const two = expectedRoundSeconds(5, 2);
  const four = expectedRoundSeconds(5, 4);
  assert.ok(four < two, 'more windows = a faster round; that IS the door-greed trade');
  assert.equal(two, (budgetFor(5) / 2) * throughputSeconds());
  // The tuning claim the blueprint makes, checked rather than asserted in prose.
  assert.ok(two > 30 && two < 300, `round 5 on two windows lasts ${two.toFixed(0)}s`);
});

test('arrivals go to the least-crowded window, reproducibly', () => {
  assert.equal(pickWindow(['a', 'b'], {}), 'a', 'ties break by declaration order');
  assert.equal(pickWindow(['a', 'b'], { a: ['x'] }), 'b');
  assert.equal(pickWindow(['a', 'b'], { a: ['x'], b: ['y', 'z'] }), 'a');
});

test('QUEUES ARE CAPPED: when every window is full the director WAITS, it does not accumulate', () => {
  const full = { a: Array(QUEUE_CAP).fill('regular'), b: Array(QUEUE_CAP).fill('regular') };
  assert.equal(pickWindow(['a', 'b'], full), null);

  const state = { ...freshRound(3, 0), queues: full };
  const next = stepDirector(state, ['a', 'b'], 100);
  assert.equal(next.spawn, null, 'nobody is released');
  assert.equal(next.budgetLeft, state.budgetLeft, 'and the budget is not spent into the void');
  assert.deepEqual(next.queues, full, 'the arrays do not grow');
});

test('release is PACED — a round does not empty its budget in one frame', () => {
  let s = freshRound(4, 0);
  const first = stepDirector(s, ['a'], 0.1);
  assert.equal(first.spawn, null, 'too soon after the last release');
  s = stepDirector(s, ['a'], 2);
  assert.ok(s.spawn, 'and then one arrives');
  assert.equal(stepDirector(s, ['a'], 2.1).spawn, null, 'one at a time, on the interval');
});

test('a batched face spends its WHOLE batch of budget — a flood is not free', () => {
  // Drive a wave that contains the roach and find the release that sends it.
  let s = freshRound(2, 0);
  let t = 0; let roachSpend = null;
  for (let i = 0; i < 30 && s.budgetLeft > 0; i++) {
    t += 2;
    const next = stepDirector(s, ['a', 'b', 'c'], t);
    if (next.spawn?.type === 'crumb-roach') {
      roachSpend = s.budgetLeft - next.budgetLeft;
      assert.equal(next.spawn.batch, ROSTER['crumb-roach'].batch, 'the spawn carries its batch');
    }
    s = next;
  }
  assert.ok(roachSpend, 'wave 2 contains the roach');
  assert.ok(Math.abs(roachSpend - costOf('crumb-roach') * ROSTER['crumb-roach'].batch) < 1e-9,
    `three roaches cost three roaches (${roachSpend})`);
});

test('the budget always drains — no composition can stall a round forever', () => {
  for (const wave of [1, 3, 7, 20]) {
    let s = freshRound(wave, 0);
    let t = 0; let releases = 0;
    while (s.budgetLeft > 0 && releases < 500) {
      t += 2;
      const next = stepDirector(s, ['a', 'b'], t);
      if (next.spawn) releases += 1;
      // The queues drain as fast as they fill, so the cap never blocks forever.
      next.queues = {};
      s = next;
    }
    assert.ok(s.budgetLeft <= 0, `wave ${wave} never finished releasing (${releases} releases)`);
  }
});

test('a round ends when the budget is spent and nothing holds it open', () => {
  const spent = { ...freshRound(3, 0), budgetLeft: 0 };
  // t=10 is INSIDE the grace window (the first draft used t=100, which is past it — the test was
  // asking whether a straggler holds the round open at a moment when the grace has already
  // forgiven it, and reading the grace working as a broken hold).
  assert.equal(roundOver(spent, 0, 10, 0, 2), true);
  assert.equal(roundOver(spent, 1, 10, 0, 2), false, 'a live mob holds it open');
  assert.equal(roundOver({ ...spent, budgetLeft: 5 }, 0, 10, 0, 2), false, 'budget still owed');
});

test('THE GRACE PATH: one stuck straggler cannot hold the night hostage', () => {
  const spent = { ...freshRound(3, 0), budgetLeft: 0 };
  const grace = expectedRoundSeconds(3, 2) * 1.5 + 20;
  assert.equal(roundOver(spent, 1, grace - 1, 0, 2), false, 'inside the grace, we still wait');
  assert.equal(roundOver(spent, 1, grace + 1, 0, 2), true, 'past it, the straggler is forgiven');
});
