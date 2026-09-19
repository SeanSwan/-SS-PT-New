/**
 * hostile-round3-regressions.test.mjs — regressions for the ROUND-3 hostile review (2026-09-18).
 * ==============================================================================================
 * Round 3 reviewed ROUND 2'S FIXES. It found that one of them was worse than the bug it fixed:
 *
 *   R3-1  The R2-1 guard read `decided.status !== 'accepted'`, which swept in `trial`. `trial` is NOT
 *         a decision against — it means on-probation — so a trial claim restating an ACCEPTED
 *         neighbour had its evidence BLOCKED from that neighbour. Executed proof of the regression:
 *         the accepted claim stayed at 2 products / medium where the pre-round-2 code absorbed 2 more
 *         products and reached 4 / high. Round 2 replaced a silent orphan with a silent loss.
 *   R3-2  `DECIDE: m` with no target threw out of `parseDecisions` — an uncaught stack trace and
 *         exit 1, while `unparsedDecideLines` (the function whose entire job is naming unreadable
 *         DECIDE lines) reported nothing for it.
 *   R3-3  Pre-existing, exposed by R2-1's own reasoning: a ledgered claim that gained receipts and
 *         matched no accepted claim had those receipts orphaned with NO surface anywhere naming them.
 *         R2-1 fixed this for rejected/merged; trial and below-gate restatements were still invisible.
 *
 * Discipline: R3-1 is asserted as a POSITIVE — the evidence must reach the accepted neighbour — so a
 * future over-broad guard fails this test instead of passing it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { corroborateBatch } from '../src/corroborate.mjs';
import { unparsedDecideLines, parseDecisions } from '../src/adjudicate.mjs';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const P1 = 'log sets inline without leaving the active workout screen';
const P2 = 'log sets inline without ever leaving the active workout screen';

const TUNING = {
  auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 },
  mergeBand: { low: 0.55 },
  weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 },
  stopwords: new Set(),
};

const tempRoot = () => mkdtempSync(join(tmpdir(), 'db-r3-'));

const claim = (over = {}) => ({
  claimId: 'CLM-aaaaaaaaaa', domainId: 'D01', principle: P1,
  workflowPhase: 'Logger', userRole: 'client', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  exceptions: [], contradictions: [], swanTranslation: {},
  confidence: { level: 'low', basis: 'single source — capped LOW until corroborated' },
  singleSource: true, status: 'proposed', createdUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

const grown = (over = {}) => claim({ status: 'proposed', ...over });

const batch = (extra = {}) => ({
  proposed: [], grownProposed: [], accepted: [], pendingProposed: [], receiptsById: new Map(),
  tuning: TUNING, negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
  decidedById: new Map(), ...extra,
});

function run(root, script, ...args) {
  return spawnSync(NODE, [join(SRC, 'src', script), '--root', root, ...args], { encoding: 'utf8' });
}

function logReceipt(root, { id, product, principle }) {
  const r = spawnSync(NODE, [join(SRC, 'src', 'log-receipt.mjs'), '--root', root], {
    input: JSON.stringify({
      receiptId: id, domainId: 'D01', product, refType: 'screen', surface: 'Logger',
      platform: 'ios', stepCount: 4,
      hierarchyNotes: 'Primary action is thumb-reachable and the logger never unmounts mid-set.',
      principleCandidates: [principle],
      inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
    }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `log-receipt failed: ${r.stderr}`);
}

function jsonl(root, name) {
  const p = join(root, name);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function folded(root) {
  const m = new Map();
  for (const c of jsonl(root, 'claims.jsonl')) {
    const prev = m.get(c.claimId);
    if (!prev || (c.rev ?? 1) >= (prev.rev ?? 1)) m.set(c.claimId, c);
  }
  return [...m.values()];
}

function runPacket(root) {
  const r = run(root, 'packet.mjs');
  assert.equal(r.status, 0, `packet failed: ${r.stderr}`);
  const m = r.stdout.match(/packet -> (.+?)\s*$/m);
  assert.ok(m, `could not read the packet path from stdout: ${r.stdout}`);
  const file = m[1].trim();
  return { file, md: readFileSync(file, 'utf8') };
}

// ─────────────────────────────────────────────────────────────────────────────
// R3-1 — `trial` is not a decision against. A trial claim restating an ACCEPTED claim must still be
// able to strengthen it. Asserted POSITIVELY so an over-broad guard fails here.
// ─────────────────────────────────────────────────────────────────────────────
test('R3-1a: a TRIAL claim restating an accepted neighbour is still absorbed into that neighbour', () => {
  const trial = claim({ claimId: 'CLM-tttttttttt', status: 'trial', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-9001', 'RCP-9002'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  const grew = grown({
    claimId: 'CLM-tttttttttt', products: ['Hevy', 'Fitbod', 'Jefit'],
    receiptRefs: ['RCP-9001', 'RCP-9003', 'RCP-9004'],
  });
  const res = corroborateBatch(batch({
    grownProposed: [grew], accepted: [accepted],
    decidedById: new Map([[trial.claimId, trial]]),
  }));
  assert.equal(res.events.filter((e) => e.kind === 'stale-decision-evidence').length, 0,
    'trial is on-probation, not decided-against — it must not be reported as a standing decision');
  assert.equal(res.claimAppends.length, 1, `the accepted neighbour must absorb the evidence, got ${JSON.stringify(res.events)}`);
  assert.equal(res.claimAppends[0].claimId, 'CLM-aaaaaaaaaa', 'the evidence lands on the ACCEPTED claim');
  assert.deepEqual([...res.claimAppends[0].products].sort(), ['Fitbod', 'Hevy', 'Jefit', 'Strong']);
  assert.equal(res.claimAppends[0].confidence.level, 'high', '4 independent products => high');
});

test('R3-1b: a REJECTED claim is still blocked (the round-2 fix must survive round 3)', () => {
  const rejected = claim({ claimId: 'CLM-rrrrrrrrrr', status: 'rejected', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-9001', 'RCP-9002'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  const grew = grown({ claimId: 'CLM-rrrrrrrrrr', products: ['Hevy', 'Fitbod'], receiptRefs: ['RCP-9001', 'RCP-9003'] });
  const res = corroborateBatch(batch({
    grownProposed: [grew], accepted: [accepted], decidedById: new Map([[rejected.claimId, rejected]]),
  }));
  assert.equal(res.claimAppends.length, 0, 'a rejection must never be auto-corroborated');
  assert.equal(res.events.filter((e) => e.kind === 'stale-decision-evidence').length, 1);
});

test('R3-1c: a MERGED claim is a tombstone — blocked, and reported rather than silent', () => {
  const merged = claim({
    claimId: 'CLM-mmmmmmmmmm', status: 'merged', mergedInto: 'CLM-aaaaaaaaaa',
    products: ['Hevy'], receiptRefs: ['RCP-9001'],
  });
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-9001', 'RCP-9002'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  const grew = grown({ claimId: 'CLM-mmmmmmmmmm', products: ['Hevy', 'Fitbod'], receiptRefs: ['RCP-9001', 'RCP-9003'] });
  const res = corroborateBatch(batch({
    grownProposed: [grew], accepted: [accepted], decidedById: new Map([[merged.claimId, merged]]),
  }));
  assert.equal(res.claimAppends.length, 0);
  const stale = res.events.filter((e) => e.kind === 'stale-decision-evidence');
  assert.equal(stale.length, 1, 'a tombstoned claim gaining evidence must be visible');
  assert.equal(stale[0].decidedStatus, 'merged');
});

// ─────────────────────────────────────────────────────────────────────────────
// R3-3 — receipts restating a ledgered claim that nothing absorbed must be NAMED, not orphaned.
// ─────────────────────────────────────────────────────────────────────────────
test('R3-3a: a grown claim matching no accepted claim emits grown-unmatched, writes nothing', () => {
  const trial = claim({ claimId: 'CLM-tttttttttt', status: 'trial', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const grew = grown({
    claimId: 'CLM-tttttttttt', principle: 'a principle no accepted claim carries at all',
    products: ['Hevy', 'Fitbod'], receiptRefs: ['RCP-9001', 'RCP-9003'],
  });
  const res = corroborateBatch(batch({ grownProposed: [grew], accepted: [], decidedById: new Map([[trial.claimId, trial]]) }));
  assert.equal(res.claimAppends.length, 0, 'must not write to the asset');
  assert.equal(res.events.filter((e) => e.kind === 'fresh').length, 0, 'must never re-emit fresh (F2b)');
  const un = res.events.filter((e) => e.kind === 'grown-unmatched');
  assert.equal(un.length, 1, `expected grown-unmatched, got ${JSON.stringify(res.events.map((e) => e.kind))}`);
  assert.equal(un[0].reason, 'no-accepted-match');
  assert.deepEqual([...un[0].receiptRefs].sort(), ['RCP-9001', 'RCP-9003'], 'the unabsorbed receipts must be named');
});

test('R3-3b: a restatement scoring BELOW the auto-gate names the merge candidate instead of vanishing', () => {
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-9001', 'RCP-9002'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  // lexically adjacent to P1 but well under the auto-gate: this is the documented merge-band residual.
  // R5-1 note: this claim must carry a LEDGER disposition (trial) or the FYI is not owed — a claim with
  // no ledger record is merely pending, and its own row already carries the receipt.
  const near = 'the logger should probably keep the set entry row on screen';
  const trial = claim({ claimId: 'CLM-nnnnnnnnnn', status: 'trial', products: ['Fitbod'], receiptRefs: ['RCP-9003'] });
  const grew = grown({ claimId: 'CLM-nnnnnnnnnn', principle: near, products: ['Fitbod'], receiptRefs: ['RCP-9003'] });
  const res = corroborateBatch(batch({
    grownProposed: [grew], accepted: [accepted], decidedById: new Map([[trial.claimId, trial]]),
  }));
  assert.equal(res.claimAppends.length, 0, 'below the gate, nothing may be auto-absorbed');
  const un = res.events.filter((e) => e.kind === 'grown-unmatched');
  assert.equal(un.length, 1, `expected grown-unmatched, got ${JSON.stringify(res.events.map((e) => e.kind))}`);
  assert.equal(un[0].reason, 'below-auto-gate');
  assert.equal(un[0].candidateClaimId, 'CLM-aaaaaaaaaa', 'the remedy (m CLM-xxx) must name a real candidate');
});

test('R3-3c: END TO END — a trial claim gaining receipts reaches the packet FYI, not the void', () => {
  const root = tempRoot();
  try {
    // a lone claim, trialled, then restated by a new product
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    run(root, 'synthesize.mjs');
    run(root, 'corroborate.mjs');
    const c1 = runPacket(root);
    writeFileSync(c1.file, readFileSync(c1.file, 'utf8').replace(/^DECIDE: _/gm, 'DECIDE: t'));
    assert.equal(run(root, 'adjudicate.mjs', '--batch', c1.file).status, 0);
    assert.equal(folded(root)[0].status, 'trial');

    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });
    run(root, 'synthesize.mjs');
    const corr = run(root, 'corroborate.mjs');
    assert.equal(corr.status, 0, corr.stderr);
    assert.match(corr.stdout, /grown-unmatched/, `the CLI tally must show the FYI: ${corr.stdout}`);

    const p2 = runPacket(root);
    assert.match(p2.md, /RESTATED BUT NOT CORROBORATED/);
    assert.match(p2.md, /receipt\(s\) unabsorbed/);
    // and nothing was written to the asset — a trial claim is not silently promoted
    assert.equal(folded(root)[0].status, 'trial', 'the trial status must stand');
    assert.equal(jsonl(root, 'claims.jsonl').length, 1, 'no append for an unmatched restatement');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R3-2 — a bare `DECIDE: m` must be a named refusal, not a stack trace.
// ─────────────────────────────────────────────────────────────────────────────
test('R3-2a: unparsedDecideLines names a bare merge as unreadable', () => {
  const txt = '### CLM-aaaaaaaaaa\nDECIDE: m\n';
  const un = unparsedDecideLines(txt);
  assert.equal(un.length, 1, `a bare m must be reported: ${JSON.stringify(un)}`);
  assert.equal(un[0].claimId, 'CLM-aaaaaaaaaa');
  assert.match(un[0].text, /merge needs a target/);
  // the parser still refuses it — the two functions agree
  assert.throws(() => parseDecisions(txt), /merge needs a target/);
  // a well-formed merge is untouched
  assert.equal(unparsedDecideLines('### CLM-aaaaaaaaaa\nDECIDE: m CLM-bbbbbbbbbb\n').length, 0);
});

test('R3-2b: the CLI exits 5 with a named message for a bare merge (no uncaught stack trace)', () => {
  const root = tempRoot();
  try {
    writeFileSync(join(root, 'claims-proposed.jsonl'), JSON.stringify(claim({ claimId: 'CLM-aaaaaaaaaa' })) + '\n');
    const b = join(root, 'BATCH-bad.md');
    writeFileSync(b, '### CLM-aaaaaaaaaa\nDECIDE: m\n');
    const r = run(root, 'adjudicate.mjs', '--batch', b);
    assert.equal(r.status, 5, `expected exit 5, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /the batch could not be read/);
    assert.match(r.stderr, /merge needs a target/);
    assert.match(r.stderr, /nothing was applied/);
    assert.doesNotMatch(r.stderr, /at Object\./, 'must not be a raw stack trace');
    assert.equal(existsSync(join(root, 'claims.jsonl')), false, 'nothing may be imported');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
