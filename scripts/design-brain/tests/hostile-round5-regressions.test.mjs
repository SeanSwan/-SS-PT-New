/**
 * hostile-round5-regressions.test.mjs — regressions for the ROUND-5 hostile review (2026-09-18).
 * ==============================================================================================
 *   R5-1  Round 3 introduced `grown-unmatched` to stop receipts being orphaned invisibly. It fired on
 *         ANY grown claim that matched no accepted claim — including a claim with NO ledger record at
 *         all: one Sean has never adjudicated that merely gained a second receipt. That is not an
 *         orphan. The claim is PENDING, `synthesize` has already regenerated it carrying the new
 *         receipt, and the packet presents it for decision — so the FYI said "nothing absorbed these
 *         receipts" about a claim whose own row carried them, and printed its status as "unknown".
 *
 * The generalisable lesson, and the reason this is its own file: a fix that adds a REPORT can be wrong
 * in a way a fix that adds a WRITE cannot — a spurious write corrupts data you can inspect, a spurious
 * report corrupts the operator's attention and leaves no trace. Round 3 tested that the FYI fires when
 * it should. Nothing tested that it stays quiet when it shouldn't, which is how it shipped firing on
 * every pending claim that gained a receipt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { corroborateBatch } from '../src/corroborate.mjs';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const P1 = 'log sets inline without leaving the active workout screen';

const TUNING = {
  auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 },
  mergeBand: { low: 0.55 },
  weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 },
  stopwords: new Set(),
};

const tempRoot = () => mkdtempSync(join(tmpdir(), 'db-r5-'));

const claim = (over = {}) => ({
  claimId: 'CLM-aaaaaaaaaa', domainId: 'D01', principle: P1,
  workflowPhase: 'Logger', userRole: 'client', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  exceptions: [], contradictions: [], swanTranslation: {},
  confidence: { level: 'low', basis: 'single source — capped LOW until corroborated' },
  singleSource: true, status: 'proposed', createdUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

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

// ─────────────────────────────────────────────────────────────────────────────
// R5-1 — a PENDING claim is not a stranded claim. Its evidence is carried by its own row.
// ─────────────────────────────────────────────────────────────────────────────
test('R5-1a: a grown claim with NO ledger record emits nothing (it is pending, not orphaned)', () => {
  const grew = claim({
    claimId: 'CLM-pppppppppp', status: 'proposed',
    products: ['Hevy', 'Strong'], receiptRefs: ['RCP-9001', 'RCP-9002'],
  });
  const res = corroborateBatch(batch({ grownProposed: [grew], accepted: [], decidedById: new Map() }));
  assert.equal(res.claimAppends.length, 0, 'must not write to the asset');
  assert.equal(res.events.filter((e) => e.kind === 'grown-unmatched').length, 0,
    `a never-adjudicated claim must not be reported as stranded: ${JSON.stringify(res.events)}`);
  assert.equal(res.events.filter((e) => e.kind === 'fresh').length, 0, 'and must not re-emit fresh (F2b)');
  assert.equal(res.events.length, 0, 'a pending claim gaining a receipt needs no event at all');
});

test('R5-1b: a pending claim below the auto-gate is also not reported as stranded', () => {
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-9001', 'RCP-9002'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  const grew = claim({
    claimId: 'CLM-pppppppppp',
    principle: 'the logger should probably keep the set entry row on screen',
    products: ['Fitbod'], receiptRefs: ['RCP-9003'],
  });
  const res = corroborateBatch(batch({ grownProposed: [grew], accepted: [accepted], decidedById: new Map() }));
  assert.equal(res.claimAppends.length, 0);
  assert.equal(res.events.filter((e) => e.kind === 'grown-unmatched').length, 0,
    'a pending claim awaiting decision must not be called stranded');
});

test('R5-1c: END TO END — a pending claim gaining a receipt produces no grown-unmatched FYI', () => {
  const root = tempRoot();
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    assert.equal(run(root, 'corroborate.mjs').status, 0);
    // NOT adjudicated — the claim is still pending
    assert.equal(existsSync(join(root, 'claims.jsonl')), false);

    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    const corr = run(root, 'corroborate.mjs');
    assert.equal(corr.status, 0, corr.stderr);

    const unmatched = jsonl(root, 'events.jsonl').filter((e) => e.kind === 'grown-unmatched');
    assert.equal(unmatched.length, 0,
      `the probe that found this reported one: ${JSON.stringify(unmatched)}`);
    // and the pending claim still carries both products, so its evidence is represented
    const pending = jsonl(root, 'claims-proposed.jsonl');
    assert.equal(pending.length, 1);
    assert.deepEqual([...pending[0].products].sort(), ['Hevy', 'Strong'],
      'the pending row must already carry the new receipt — that is why no FYI is owed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
