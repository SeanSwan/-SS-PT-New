/** Positive controls for the A5 kill-order log schema — the gate must refuse malformed sessions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../log-atelier-session.mjs';

const base = () => ({
  ts: '2026-08-18T23:00:00Z',
  brief_id: 'b1',
  archetype_ids: ['fitness-coaching-website'],
  plate_pack_id: 'pack-1',
  variants: [
    { id: 'A', skeleton_id: 'S1', outcome: 'winner' },
    { id: 'B', skeleton_id: 'S2', outcome: 'killed', kill_rank: 1, reason_code: 'structure' },
  ],
  null_winner: false,
  rounds: 1,
  wave2_used: false,
  cost_usd: null,
  wall_s: 42,
});

test('valid session passes', () => assert.deepEqual(validate(base()), []));

test('POSITIVE CONTROL — killed without reason_code refused', () => {
  const s = base(); delete s.variants[1].reason_code;
  assert.ok(validate(s).some(d => d.includes('reason_code')));
});

test('POSITIVE CONTROL — two winners refused', () => {
  const s = base(); s.variants[1] = { id: 'B', skeleton_id: 'S2', outcome: 'winner' };
  assert.ok(validate(s).some(d => d.includes('exactly one winner')));
});

test('POSITIVE CONTROL — null_winner demands axes_to_flip (learning, not a vibe)', () => {
  const s = base();
  s.variants[0].outcome = 'killed'; s.variants[0].kill_rank = 2; s.variants[0].reason_code = 'idea';
  s.null_winner = true;
  assert.ok(validate(s).some(d => d.includes('axes_to_flip')));
  s.axes_to_flip = ['drop editorial density', 'try proof-first'];
  assert.deepEqual(validate(s), []);
});

test('POSITIVE CONTROL — rounds cap: 4 refused (hard cap 3)', () => {
  const s = base(); s.rounds = 4;
  assert.ok(validate(s).some(d => d.includes('rounds')));
});

test('pending session: no winner required, no null_winner allowed', () => {
  const s = base();
  s.variants[0].outcome = 'survived'; s.pending = true;
  delete s.variants[1].kill_rank; delete s.variants[1].reason_code;
  s.variants[1].outcome = 'survived';
  assert.deepEqual(validate(s), []);
  s.null_winner = true; s.axes_to_flip = ['x'];
  assert.ok(validate(s).some(d => d.includes('pending')));
});

test('POSITIVE CONTROL — cost adjectives impossible: cost_usd key mandatory', () => {
  const s = base(); delete s.cost_usd;
  assert.ok(validate(s).some(d => d.includes('cost_usd')));
});
