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
    // ASSERTION UPDATED 2026-09-03 (MUSE-5): still refused, but the gate now resolves
    // the path before matching, so it reports the RESOLVED target rather than
    // complaining about the "..". Asserting the resolved name is the stronger
    // property — it proves canonicalisation actually ran, which the old message did not.
    assert.throws(
      () => armTrainingTierEgress(['docs/pub/../../backend/models/User.mjs']),
      /REFUSED.*backend\/models\/User\.mjs/s,
    );
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

test('a malformed body is not turned into a crash when nothing is suspicious', () => {
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, 'not json'));
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, JSON.stringify({ messages: [] })));
  // ASSERTION REMOVED 2026-09-03 (MUSE-4b): this test used to also assert
  // `assertTrainingTierArmed('not a url', CONTRIB)` does NOT throw. That assertion
  // encoded the fail-open bug — an unparseable URL skipped the entire check on a
  // training-tier body. The correct behaviour is now asserted in MUSE-4b.
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

/* ---------------------------------------------------------------------------
 * Defects found 2026-09-03 by Muse Spark 1.3 reviewing this gate (SWA-236).
 * Each was real and reachable in the shipped code. Kept as named regressions so
 * a future edit cannot quietly reopen them.
 * ------------------------------------------------------------------------- */

test('MUSE-3a: a VARIANT suffix cannot smuggle the training tier past the check', () => {
  // OpenRouter appends ":free" / ":online" / ":extended" after a model id, and the
  // request still routes to the same contributor weights.
  assert.equal(isTrainingTierModel('meta/muse-spark-1.3-contributor:free'), true);
  assert.equal(isTrainingTierModel('META/MUSE-SPARK-1.3-CONTRIBUTOR:NITRO'), true);
  assert.throws(
    () => assertTrainingTierArmed(OR, JSON.stringify({ model: 'meta/muse-spark-1.3-contributor:free' })),
    /REFUSED/,
  );
  // The variant strip must not turn an unrelated model into a false positive.
  assert.equal(isTrainingTierModel('meta/muse-spark-1.3:free'), false);
});

test('MUSE-3b: the training tier hidden in the `models` FALLBACK array is caught', () => {
  // A safe primary with the training tier in the fallback list is a request that
  // may well be served by the training tier.
  const body = JSON.stringify({
    model: 'meta/muse-spark-1.3',
    models: ['meta/muse-spark-1.3-contributor'],
  });
  assert.throws(() => assertTrainingTierArmed(OR, body), /REFUSED/);
  // A fallback list with no training tier in it stays allowed.
  assert.doesNotThrow(() => assertTrainingTierArmed(
    OR,
    JSON.stringify({ model: 'meta/muse-spark-1.3', models: ['moonshotai/kimi-k3'] }),
  ));
});

test('MUSE-4: an UNPARSEABLE body fails CLOSED when it smells of the training tier', () => {
  // The old `catch { return }` allowed anything it could not parse — the single
  // fail-open branch in a gate whose whole premise is that this tier has no undo.
  assert.throws(
    () => assertTrainingTierArmed(OR, 'not-json but model=meta/muse-spark-1.3-contributor here'),
    /REFUSED/,
  );
  // An unparseable body with no such marker is still allowed: the gate guards one
  // specific tier, it is not a general-purpose egress veto.
  assert.doesNotThrow(() => assertTrainingTierArmed(OR, 'not-json and nothing suspicious'));
});

test('MUSE-4b: an unparseable URL is no longer a reason to allow', () => {
  // The host only ever appeared in the error text, yet a URL that failed to parse
  // used to skip the entire check.
  assert.throws(() => assertTrainingTierArmed('api/v1/chat/completions', CONTRIB), /REFUSED/);
  assert.throws(() => assertTrainingTierArmed(undefined, CONTRIB), /REFUSED/);
});

test('MUSE-5: the GATE canonicalises paths itself, not the caller', () => {
  withAllowlist('docs/pub', () => {
    // An absolute path pointing outside the repo must be rejected by the gate even
    // though the caller passed no repo-relative string at all.
    assert.throws(
      () => armTrainingTierEgress([process.platform === 'win32' ? 'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts']),
      /outside the repo|not cleared|contains "\.\."/,
    );
  });
});

test('MUSE-5b: an explicit root makes the gate\'s own resolution observable', () => {
  withAllowlist('pub', () => {
    // Resolution happens against `root`, so the same string clears here and not there.
    assert.doesNotThrow(() => armTrainingTierEgress(['pub/notes.md'], { root: process.cwd() }));
    assert.throws(() => armTrainingTierEgress(['elsewhere/notes.md'], { root: process.cwd() }), /not cleared/);
  });
});

test('the allowlist parser normalises separators and ignores empties', () => {
  withAllowlist('docs\\pub , ./docs/other,,', () => {
    assert.deepEqual(trainingTierAllowlist(), ['docs/pub', 'docs/other']);
  });
});
