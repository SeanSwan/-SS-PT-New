import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateCandidate } from './element-recommendation.mjs';

const policy = {
  use_now_min: 75,
  trial_min: 55,
  watch_min: 30,
  minimum_use_now_evidence: 2,
  minimum_use_now_confidence: 0.75,
};

const candidate = (overrides = {}) => ({
  id: 'explainable-next-move',
  capability_id: 'post-save-next-move',
  title: 'Explainable next move after workout save',
  evidence_count: 5,
  confidence: 0.9,
  usability: 0.9,
  swan_fit: 0.95,
  taste_fit: 0.9,
  strategic_fit: 1,
  implementation_cost: 0.35,
  risk: 0.1,
  duplicates_existing: false,
  hard_conflicts: [],
  requires_client_green: false,
  requires_browser_proof: false,
  ...overrides,
});

test('marks a strong fragmented capability USE_NOW', () => {
  const result = evaluateCandidate(
    candidate(),
    { id: 'post-save-next-move', status: 'fragmented' },
    policy,
  );

  assert.equal(result.label, 'USE_NOW');
  assert.ok(result.score >= policy.use_now_min);
  assert.deepEqual(result.flags, []);
});

test('caps a mounted duplicate at WATCH', () => {
  const result = evaluateCandidate(
    candidate({ capability_id: 'workout-proof', duplicates_existing: true }),
    { id: 'workout-proof', status: 'mounted' },
    policy,
  );

  assert.equal(result.label, 'WATCH');
  assert.ok(result.flags.includes('DUPLICATE'));
});

test('rejects a candidate with a hard Swan conflict', () => {
  const result = evaluateCandidate(
    candidate({ hard_conflicts: ['fake-progress-data'] }),
    { id: 'post-save-next-move', status: 'missing' },
    policy,
  );

  assert.equal(result.label, 'REJECT');
  assert.ok(result.flags.includes('CANON_CONFLICT'));
});

test('flags green client UI as a token proposal without treating taste as canon', () => {
  const result = evaluateCandidate(
    candidate({
      capability_id: 'green-recovery-accent',
      evidence_count: 2,
      confidence: 0.8,
      requires_client_green: true,
    }),
    { id: 'green-recovery-accent', status: 'missing' },
    policy,
  );

  assert.equal(result.label, 'TRIAL');
  assert.ok(result.flags.includes('TOKEN_PROPOSAL'));
});

test('caps source-only candidates at TRIAL when browser proof is required', () => {
  const result = evaluateCandidate(
    candidate({ requires_browser_proof: true }),
    { id: 'post-save-next-move', status: 'fragmented' },
    policy,
  );

  assert.equal(result.label, 'TRIAL');
  assert.ok(result.flags.includes('NEEDS_BROWSER_PROOF'));
});

test('does not reward an unknown baseline as though the capability were missing', () => {
  const result = evaluateCandidate(
    candidate({ capability_id: 'unknown-capability' }),
    { id: 'unknown-capability', status: 'unknown' },
    policy,
  );

  assert.equal(result.label, 'TRIAL');
  assert.ok(result.score < policy.use_now_min);
  assert.ok(result.flags.includes('NEEDS_BASELINE_PROOF'));
});

test('treats an unmounted existing component as an integration gap, not a new invention', () => {
  const result = evaluateCandidate(
    candidate({
      capability_id: 'post-workout-celebration',
      title: 'Mount the existing post-workout celebration in the verified save path',
      evidence_count: 3,
      confidence: 0.85,
    }),
    { id: 'post-workout-celebration', status: 'unmounted' },
    policy,
  );

  assert.equal(result.label, 'USE_NOW');
  assert.ok(result.reasons.some((reason) => reason.includes('integration')));
});
