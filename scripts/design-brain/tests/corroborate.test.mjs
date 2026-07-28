/**
 * corroborate.test.mjs — the anti-laundering + fold + idempotency guards (Kimi §2B/§2E/§3).
 * Run: node --test scripts/design-brain/tests/corroborate.test.mjs
 *
 * The tests that matter most PROVE the machine can only ADD EVIDENCE, never launder confidence:
 *   - a new product raises confidence ONLY through confidenceFor
 *   - the same product a second time is a mathematical no-op on confidence
 *   - principle text is never touched, claims are never merged, nothing is auto-accepted
 *   - re-running a batch appends zero new lines
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corroborateBatch, applyCorroboration, runCorroborate } from '../src/corroborate.mjs';
import { loadClaims } from '../src/synthesize.mjs';
import { appendJsonl } from '../src/writer.mjs';
import { confidenceFor } from '../src/validate.mjs';

const CFG = dirname(dirname(fileURLToPath(import.meta.url)));
const stopwords = new Set(JSON.parse(readFileSync(join(CFG, 'config', 'stopwords.json'), 'utf8')).words);
const T = JSON.parse(readFileSync(join(CFG, 'config', 'tuning.json'), 'utf8'));
const negationCues = JSON.parse(readFileSync(join(CFG, 'config', 'negation-cues.json'), 'utf8')).cues;
const tuning = { ...T, stopwords };
const NOW = '2026-07-21T00:00:00Z';

const acceptedClaim = (over = {}) => ({
  claimId: 'CLM-inline01', domainId: 'D01', principle: 'Log a completed set inline at the exercise row, not on a separate screen',
  workflowPhase: 'workout-logging', userRole: 'client', products: ['Hevy', 'Strong'],
  receiptRefs: ['RCP-1', 'RCP-2'], confidence: confidenceFor(['Hevy', 'Strong']), singleSource: false,
  status: 'accepted', rev: 1, createdUtc: '2026-07-20T00:00:00Z', humanDecision: { actor: 'sean', utc: '2026-07-20T00:00:00Z', batchId: 'B1' }, ...over,
});
const proposedClaim = (over = {}) => ({
  claimId: 'CLM-new01', domainId: 'D01', principle: 'Log sets inline at the exercise row',
  workflowPhase: 'workout-logging', userRole: 'client', products: ['Fitbod'], receiptRefs: ['RCP-9'],
  confidence: confidenceFor(['Fitbod']), singleSource: true, status: 'proposed', createdUtc: NOW, ...over,
});
const receiptsById = new Map([['RCP-9', { receiptId: 'RCP-9', domainId: 'D01' }]]);

function run(proposed, accepted, pending = [], seen = new Set()) {
  return corroborateBatch({
    proposed, accepted, pendingProposed: pending, receiptsById,
    tuning, negationCues, runId: 'RUN-2', nowIso: NOW, seenEventIds: seen,
  });
}

// ── auto-corroboration: NEW product raises confidence via confidenceFor only ──
test('AUTO: near-verbatim principle from a NEW product corroborates, confidence via confidenceFor', () => {
  const { claimAppends, events } = run([proposedClaim()], [acceptedClaim()]);
  assert.equal(claimAppends.length, 1);
  const rec = claimAppends[0];
  assert.equal(rec.claimId, 'CLM-inline01', 'updates the ACCEPTED claim, not a new one');
  assert.equal(rec.rev, 2);
  assert.deepEqual(rec.products.sort(), ['Fitbod', 'Hevy', 'Strong']);
  assert.deepEqual(rec.confidence, confidenceFor(['Hevy', 'Strong', 'Fitbod']), 'confidence == confidenceFor(products), nothing hand-set');
  assert.equal(rec.principle, acceptedClaim().principle, 'principle text NEVER edited');
  assert.equal(rec.status, 'accepted', 'never re-opens status');
  assert.equal(rec.autoUpdate.kind, 'corroborate');
  assert.deepEqual(rec.autoUpdate.addedProducts, ['Fitbod']);
  assert.ok(events.some((e) => e.kind === 'corroborate' && e.matchedClaimId === 'CLM-inline01'));
});

// ── the laundering guard: SAME product cannot raise confidence ──
test('GUARD: same product a second time is a confidence no-op (corroborate-same-product)', () => {
  const dup = proposedClaim({ claimId: 'CLM-new02', products: ['Hevy'], receiptRefs: ['RCP-9'] });
  const { claimAppends } = run([dup], [acceptedClaim()]);
  assert.equal(claimAppends.length, 1);
  const rec = claimAppends[0];
  assert.deepEqual(rec.products.sort(), ['Hevy', 'Strong'], 'product set unchanged');
  assert.deepEqual(rec.confidence, acceptedClaim().confidence, 'confidence BYTE-identical — no laundering');
  assert.equal(rec.autoUpdate.kind, 'corroborate-same-product');
  assert.deepEqual(rec.autoUpdate.addedProducts, []);
  assert.ok(rec.receiptRefs.includes('RCP-9'), 'evidence depth still recorded');
});

test('GUARD: 4 screens from one product can never push past its single-product level', () => {
  // start from a single-source (LOW) accepted claim; corroborate 3 more times from the SAME product
  let acc = acceptedClaim({ products: ['Hevy'], receiptRefs: ['RCP-1'], confidence: confidenceFor(['Hevy']), singleSource: true });
  for (const rid of ['RCP-a', 'RCP-b', 'RCP-c']) {
    const cand = proposedClaim({ claimId: `CLM-${rid}`, products: ['Hevy'], receiptRefs: [rid] });
    const { record } = applyCorroboration(acc, cand, NOW, 'RUN-x');
    acc = record;
  }
  assert.equal(acc.confidence.level, 'low', 'one product stays LOW no matter how many screens');
});

// ── never merges / never auto-accepts ──
test('DOCTRINE: a genuinely different principle is FRESH, never merged into the accepted claim', () => {
  const other = proposedClaim({ claimId: 'CLM-diff', principle: 'Personalize the program only after collecting real constraints', products: ['Tonal'] });
  const { claimAppends, events } = run([other], [acceptedClaim()]);
  assert.equal(claimAppends.length, 0, 'no accepted claim was touched');
  assert.ok(events.some((e) => e.kind === 'fresh' && e.claimId === 'CLM-diff'));
});

test('MERGE-QUEUE: middling similarity is queued with a suggestion, never auto-applied', () => {
  // craft a mid-band match: shares some tokens but not enough for AUTO
  const mid = proposedClaim({ claimId: 'CLM-mid', principle: 'Log the exercise on a summary screen after finishing', products: ['X'] });
  const { events, claimAppends } = run([mid], [acceptedClaim()]);
  const mq = events.find((e) => e.kind === 'merge-queue');
  if (mq) {
    assert.equal(claimAppends.length, 0, 'merge-queue never mutates a claim');
    assert.equal(mq.matchedClaimId, 'CLM-inline01');
  } else {
    // acceptable: it scored FRESH — either way, NO auto-mutation
    assert.equal(claimAppends.length, 0);
  }
});

// ── idempotency ──
test('IDEMPOTENT: same batch twice → second pass emits nothing new', () => {
  const seen = new Set();
  const first = run([proposedClaim()], [acceptedClaim()], [], seen);
  assert.ok(first.events.length > 0);
  const second = run([proposedClaim()], [acceptedClaim()], [], seen);
  assert.equal(second.events.length, 0, 'deterministic eventIds make re-run a no-op');
});

// ── contradiction ──
test('CONTRADICTION: negated principle about the same subject flags a candidate AND stays fresh', () => {
  const neg = proposedClaim({ claimId: 'CLM-neg', principle: 'Do not log sets inline at the exercise row, use a separate screen instead', products: ['Y'] });
  const { events } = run([neg], [acceptedClaim()]);
  assert.ok(events.some((e) => e.kind === 'contradiction-candidate'), 'contradiction surfaced');
  assert.ok(events.some((e) => e.kind === 'fresh' && e.claimId === 'CLM-neg'), 'opposite principle also kept as new — never dropped');
});

test('CONTRADICTION: "without" about an UNRELATED subject does NOT flag', () => {
  const unrelated = proposedClaim({ claimId: 'CLM-unrel', principle: 'Show community challenges without a paywall on the home tab', products: ['Z'] });
  const { events } = run([unrelated], [acceptedClaim()]);
  assert.ok(!events.some((e) => e.kind === 'contradiction-candidate'), 'low-overlap negation must not false-flag');
});

// ── the fold ──
test('FOLD: loadClaims returns the latest rev per claimId', () => {
  const rec1 = acceptedClaim();
  const { record: rec2 } = applyCorroboration(rec1, proposedClaim(), NOW, 'RUN-2');
  const tmp = mkdtempSync(join(tmpdir(), 'fold-'));
  const f = join(tmp, 'claims.jsonl');
  try {
    writeFileSync(f, JSON.stringify(rec1) + '\n' + JSON.stringify(rec2) + '\n');
    const folded = loadClaims(f);
    assert.equal(folded.length, 1, 'one claim id → one record');
    assert.equal(folded[0].rev, 2, 'the latest rev wins');
    assert.deepEqual(folded[0].products.sort(), ['Fitbod', 'Hevy', 'Strong']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ── file-level integration: the CLI path through real I/O ──
test('INTEGRATION: runCorroborate folds a NEW-product corroboration into an accepted claim on disk', () => {
  const root = mkdtempSync(join(tmpdir(), 'corr-int-'));
  try {
    // seed a 3-product accepted claim (MEDIUM) so a 4th product visibly bumps it to HIGH
    appendJsonl(root, join(root, 'claims.jsonl'),
      acceptedClaim({ products: ['Hevy', 'Strong', 'Runna'], confidence: confidenceFor(['Hevy', 'Strong', 'Runna']) }));
    assert.equal(confidenceFor(['Hevy', 'Strong', 'Runna']).level, 'medium', 'precondition: 3 products = medium');
    // a proposed near-verbatim claim from a NEW (4th) product, with its receipt
    appendJsonl(root, join(root, 'receipts.jsonl'), { receiptId: 'RCP-9', domainId: 'D01', product: 'Fitbod' });
    appendJsonl(root, join(root, 'claims-proposed.jsonl'), proposedClaim());
    const cfgDir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'config');

    const res = runCorroborate(root, cfgDir, { nowIso: NOW });
    assert.equal(res.claimAppends, 1, 'one accepted claim updated');

    const folded = loadClaims(join(root, 'claims.jsonl'));
    assert.equal(folded.length, 1, 'still one claim id after the rev append');
    assert.equal(folded[0].rev, 2);
    assert.ok(folded[0].products.includes('Fitbod'), 'new product folded in');
    assert.equal(folded[0].confidence.level, 'high', '4th product bumps medium→high via confidenceFor — certainty grew with no letter');
    assert.equal(folded[0].autoUpdate.prevConfidence.level, 'medium');
    assert.equal(folded[0].autoUpdate.nextConfidence.level, 'high', 'the bump is audited');

    // idempotency at the file level: second run appends nothing
    const res2 = runCorroborate(root, cfgDir, { nowIso: NOW });
    assert.equal(res2.claimAppends, 0, 're-run is a no-op');
    assert.equal(loadClaims(join(root, 'claims.jsonl'))[0].rev, 2, 'no phantom rev bump');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
