/**
 * The training tier is the one egress class with no undo: Meta trains on both
 * halves of a *-contributor call, so a leak there cannot be rotated away. These
 * tests exist to prove the gate actually FIRES — a guard that silently never
 * matches is the failure mode this repo has already hit once (spend-guard-gate's
 * regex, corrupted into a literal backspace, reported "SYNTAX OK" while matching
 * nothing). Every allow-case here is therefore paired with a deny-case.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  armTrainingTierEgress,
  assertTrainingTierArmed,
  isTrainingTierModel,
  trainingTierAllowlist,
  fetchForEgress,
} from './redact-egress.mjs';

const OR = 'https://openrouter.ai/api/v1/chat/completions';
const CONTRIB = JSON.stringify({ model: 'meta/muse-spark-1.3-contributor' });
const STANDARD = JSON.stringify({ model: 'meta/muse-spark-1.3' });

function withAllowlist(value, fn) {
  const prev = process.env.SWAN_TRAINING_TIER_ALLOWLIST;
  if (value === undefined) delete process.env.SWAN_TRAINING_TIER_ALLOWLIST;
  else process.env.SWAN_TRAINING_TIER_ALLOWLIST = value;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env.SWAN_TRAINING_TIER_ALLOWLIST;
    else process.env.SWAN_TRAINING_TIER_ALLOWLIST = prev;
  }
}

test('a contributor model is recognised as a training tier; the standard tier is not', () => {
  assert.equal(isTrainingTierModel('meta/muse-spark-1.3-contributor'), true);
  assert.equal(isTrainingTierModel('META/MUSE-SPARK-1.3-CONTRIBUTOR'), true);
  assert.equal(isTrainingTierModel('meta/muse-spark-1.3'), false);
  assert.equal(isTrainingTierModel('moonshotai/kimi-k3'), false);
  // A model that merely CONTAINS the word must not be swept in.
  assert.equal(isTrainingTierModel('meta/contributor-notes-v1'), false);
});

test('an unarmed contributor call is REFUSED — this is the whole control', () => {
  assert.throws(() => assertTrainingTierArmed(OR, CONTRIB), /REFUSED.*TRAINING tier/s);
});

test('the standard tier passes freely — the gate must not tax normal work', () => {
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, STANDARD));
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, JSON.stringify({ model: 'moonshotai/kimi-k3' })));
});

test('arming is impossible while the allowlist is unset (fail-closed default)', () => {
  withAllowlist(undefined, () => {
    assert.throws(() => armTrainingTierEgress(['docs/anything.md']), /SWAN_TRAINING_TIER_ALLOWLIST is unset/);
  });
  withAllowlist('', () => {
    assert.throws(() => armTrainingTierEgress(['docs/anything.md']), /unset/);
  });
});

test('a path outside the allowlist cannot arm, even with the allowlist set', () => {
  withAllowlist('docs/ai-workflow/brainstorms/public', () => {
    assert.throws(() => armTrainingTierEgress(['backend/routes/adminPackageRoutes.mjs']), /not cleared/);
    // Prefix must be a PATH boundary, not a string prefix: a sibling directory
    // whose name merely starts with the allowed one must be rejected.
    assert.throws(() => armTrainingTierEgress(['docs/ai-workflow/brainstorms/public-private/x.md']), /not cleared/);
  });
});

test('traversal cannot launder a blocked path through an allowed prefix', () => {
  withAllowlist('docs/pub', () => {
    assert.throws(() => armTrainingTierEgress(['docs/pub/../../backend/models/User.mjs']), /contains "\.\."/);
  });
});

test('arming with no document at all is refused', () => {
  withAllowlist('docs/pub', () => {
    assert.throws(() => armTrainingTierEgress([]), /no named source document/);
  });
});

test('a cleared path arms, and the arming then lets exactly ONE call through', () => {
  withAllowlist('docs/pub', () => {
    assert.doesNotThrow(() => armTrainingTierEgress(['docs/pub/notes.md']));
    // First call: allowed.
    assert.doesNotThrow(() => assertTrainingTierArmed(OR, CONTRIB));
    // Second call on the same arming: refused. One arm, one call.
    assert.throws(() => assertTrainingTierArmed(OR, CONTRIB), /REFUSED/);
  });
});

test('an unrelated standard-tier call consumes the arming — no laundering a second doc', () => {
  withAllowlist('docs/pub', () => {
    armTrainingTierEgress(['docs/pub/cleared.md']);
    // A standard-tier call slips in between. It must burn the clearance.
    assert.doesNotThrow(() => assertTrainingTierArmed(OR, STANDARD));
    // The contributor call that follows was never cleared for its own content.
    assert.throws(() => assertTrainingTierArmed(OR, CONTRIB), /REFUSED/);
  });
});

test('an expired arming does not authorise a later call', () => {
  withAllowlist('docs/pub', () => {
    armTrainingTierEgress(['docs/pub/notes.md'], { ttlMs: -1 });
    assert.throws(() => assertTrainingTierArmed(OR, CONTRIB), /REFUSED/);
  });
});

test('a malformed body or url is not turned into a crash', () => {
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, 'not json'));
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, JSON.stringify({ messages: [] })));
  assert.doesNotThrow(() => assertTrainingTierArmed('not a url', CONTRIB));
});

test('the transport itself refuses an unarmed contributor call — not just the helper', async () => {
  let reached = false;
  const spy = async () => { reached = true; return new Response('{}'); };
  await assert.rejects(
    () => fetchForEgress(OR, { method: 'POST', body: CONTRIB }, { quiet: true, fetchImpl: spy }),
    /REFUSED.*TRAINING tier/s,
  );
  assert.equal(reached, false, 'the request must never reach the socket');
});

test('the transport lets an armed, cleared contributor call through', async () => {
  await withAllowlist('docs/pub', async () => {
    armTrainingTierEgress(['docs/pub/notes.md']);
    let reached = false;
    const spy = async () => { reached = true; return new Response('{}'); };
    await fetchForEgress(OR, { method: 'POST', body: CONTRIB }, { quiet: true, fetchImpl: spy });
    assert.equal(reached, true, 'a properly armed call must not be blocked');
  });
});

test('the allowlist parser normalises separators and ignores empties', () => {
  withAllowlist('docs\\pub , ./docs/other,,', () => {
    assert.deepEqual(trainingTierAllowlist(), ['docs/pub', 'docs/other']);
  });
});
