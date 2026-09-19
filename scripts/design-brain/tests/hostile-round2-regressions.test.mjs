/**
 * hostile-round2-regressions.test.mjs — regressions for the ROUND-2 hostile review (2026-09-18).
 * ==============================================================================================
 * Round 1 reviewed the engine. Round 2 reviewed ROUND 1'S FIXES — the same posture, aimed one level
 * in. Four findings survived:
 *
 *   R2-1  A claim Sean had REJECTED that later gained new evidence produced zero events and zero
 *         appends: the evidence vanished from every surface, so "rejected" silently became
 *         "rejected, and nobody will ever know this was restated five more times".
 *   R2-3  A DECIDE line that is not one of the four letters (`DECIDE: accept`, `DECIDE: yes`) was
 *         dropped with NO warning — a human could believe they had decided.
 *   R2-4  `emit-vault --build` threw an uncaught execFileSync error AFTER a successful emit, so a
 *         written collection reported itself as a total failure.
 *   R2-5  `additionalProperties:false` was enforced at the top level only; the schema also closes
 *         `confidence` / `swanTranslation`, and nothing checked them.
 *
 * Plus R2-2, which is not a test but a posture: the round-1 fixes had to be proven WIRED, not merely
 * present. That is why every round-2 assertion below either drives a CLI process or asserts on an
 * artifact, never on a function's willingness to return the right shape when handed the right input.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateClaim, validateReceipt } from '../src/validate.mjs';
import { corroborateBatch } from '../src/corroborate.mjs';
import { unparsedDecideLines, parseDecisions } from '../src/adjudicate.mjs';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const P1 = 'log sets inline without leaving the active workout screen';

const TUNING = {
  auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 },
  mergeBand: { low: 0.55 },
  weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 },
  stopwords: new Set(),
};

const tempRoot = () => mkdtempSync(join(tmpdir(), 'db-r2-'));

const claim = (over = {}) => ({
  claimId: 'CLM-aaaaaaaaaa', domainId: 'D01',
  principle: P1,
  workflowPhase: 'Logger', userRole: 'client', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  exceptions: [], contradictions: [], swanTranslation: {},
  confidence: { level: 'low', basis: 'single source — capped LOW until corroborated' },
  singleSource: true, status: 'proposed', createdUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

const receipt = (over = {}) => ({
  receiptId: 'RCP-9001', domainId: 'D01', product: 'Hevy', refType: 'screen',
  surface: 'Logger', platform: 'ios', stepCount: 4,
  hierarchyNotes: 'A long enough note that it comfortably clears the forty character floor.',
  principleCandidates: [P1],
  inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

function run(root, script, ...args) {
  return spawnSync(NODE, [join(SRC, 'src', script), '--root', root, ...args], { encoding: 'utf8' });
}

function logReceipt(root, { id, product, principle, domain = 'D01' }) {
  const r = spawnSync(NODE, [join(SRC, 'src', 'log-receipt.mjs'), '--root', root], {
    input: JSON.stringify({
      receiptId: id, domainId: domain, product, refType: 'screen', surface: 'Logger',
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
// R2-1 — a decided-against claim that gains evidence must be VISIBLE, and must not be changed.
// Pre-fix: zero events, zero appends, no surface anywhere mentioned the new evidence.
// ─────────────────────────────────────────────────────────────────────────────
test('R2-1: new evidence on a REJECTED claim is surfaced as an FYI and changes nothing', () => {
  const decided = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'rejected', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  });
  const grown = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'proposed',
    products: ['Hevy', 'Fitbod', 'Jefit'], receiptRefs: ['RCP-9001', 'RCP-9002', 'RCP-9003'],
  });
  const res = corroborateBatch({
    proposed: [], grownProposed: [grown], accepted: [], pendingProposed: [], receiptsById: new Map(),
    tuning: TUNING, negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
    decidedById: new Map([[decided.claimId, decided]]),
  });
  assert.equal(res.claimAppends.length, 0, 'a rejected decision must never be auto-corroborated');
  const stale = res.events.filter((e) => e.kind === 'stale-decision-evidence');
  assert.equal(stale.length, 1, `expected one stale-decision-evidence event, got ${JSON.stringify(res.events)}`);
  assert.equal(stale[0].decidedStatus, 'rejected');
  assert.deepEqual([...stale[0].addedProducts].sort(), ['Fitbod', 'Jefit']);
  assert.deepEqual([...stale[0].receiptRefs].sort(), ['RCP-9002', 'RCP-9003']);
});

test('R2-1b: a rejected claim with NO new evidence stays silent (no noise events)', () => {
  const decided = claim({ claimId: 'CLM-aaaaaaaaaa', status: 'rejected', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const same = claim({ claimId: 'CLM-aaaaaaaaaa', status: 'proposed', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const res = corroborateBatch({
    proposed: [], grownProposed: [same], accepted: [], pendingProposed: [], receiptsById: new Map(),
    tuning: TUNING, negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
    decidedById: new Map([[decided.claimId, decided]]),
  });
  assert.equal(res.events.filter((e) => e.kind === 'stale-decision-evidence').length, 0);
  assert.equal(res.claimAppends.length, 0);
});

test('R2-1c: the R2-1 branch does not swallow ACCEPTED claims (positive control)', () => {
  const accepted = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  });
  const grown = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'proposed',
    products: ['Hevy', 'Fitbod'], receiptRefs: ['RCP-9001', 'RCP-9002'],
  });
  const res = corroborateBatch({
    proposed: [], grownProposed: [grown], accepted: [accepted], pendingProposed: [], receiptsById: new Map(),
    tuning: TUNING, negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
    decidedById: new Map([[accepted.claimId, accepted]]),
  });
  assert.equal(res.claimAppends.length, 1, 'an accepted claim must still corroborate normally');
  assert.equal(res.events.filter((e) => e.kind === 'stale-decision-evidence').length, 0);
  assert.deepEqual([...res.claimAppends[0].products].sort(), ['Fitbod', 'Hevy']);
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-1 WIRING — the branch is worthless if runCorroborate never builds decidedById.
// ─────────────────────────────────────────────────────────────────────────────
test('R2-1d: the CLI builds decidedById itself — a rejected claim gaining evidence reaches events.jsonl', () => {
  const root = tempRoot();
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });
    run(root, 'synthesize.mjs');
    run(root, 'corroborate.mjs');
    const c1 = runPacket(root);
    writeFileSync(c1.file, readFileSync(c1.file, 'utf8').replace(/^DECIDE: _/gm, 'DECIDE: r'));
    const adj = run(root, 'adjudicate.mjs', '--batch', c1.file);
    assert.equal(adj.status, 0, adj.stderr);
    assert.equal(folded(root)[0].status, 'rejected');

    // five NEW products restate the rejected principle
    for (const [i, p] of ['Fitbod', 'Jefit', 'Liftin', 'Gymshark', 'RP'].entries()) {
      logReceipt(root, { id: `RCP-100${i + 1}`, product: p, principle: P1 });
    }
    run(root, 'synthesize.mjs');
    const corr = run(root, 'corroborate.mjs');
    assert.equal(corr.status, 0, corr.stderr);

    const stale = jsonl(root, 'events.jsonl').filter((e) => e.kind === 'stale-decision-evidence');
    assert.equal(stale.length, 1, `expected the FYI event, got ${JSON.stringify(jsonl(root, 'events.jsonl').map((e) => e.kind))}`);
    assert.equal(stale[0].decidedStatus, 'rejected');
    assert.equal(stale[0].addedProducts.length, 5);

    // the decision stands: still rejected, still one ledger row, no rev+1
    assert.equal(folded(root)[0].status, 'rejected', 'the human decision must survive the new evidence');
    assert.equal(jsonl(root, 'claims.jsonl').length, 1, 'no append may be written for a rejected claim');

    // and the packet says so out loud
    const p2 = runPacket(root);
    assert.match(p2.md, /NEW EVIDENCE ON DECIDED CLAIMS/);
    assert.match(p2.md, /NEW EVIDENCE ON DECIDED CLAIMS \(no action taken — your decision stands\): 1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-3 — an unreadable DECIDE line must be reported, not swallowed.
// ─────────────────────────────────────────────────────────────────────────────
test('R2-3: unparsedDecideLines reports non-letter decisions and leaves legal lines alone', () => {
  const text = [
    '### CLM-aaaaaaaaaa', 'DECIDE: a',
    '### CLM-bbbbbbbbbb', 'DECIDE: accept',
    '### CLM-cccccccccc', 'DECIDE: _',
    '### CLM-dddddddddd', 'DECIDE: yes',
    '### CLM-eeeeeeeeee', 'DECIDE:',
    '### CLM-ffffffffff', 'DECIDE: m CLM-aaaaaaaaaa',
    '### CLM-9999999999', 'DECIDE: t   (trial, pending QA)',
  ].join('\n');
  const un = unparsedDecideLines(text);
  assert.deepEqual(un.map((u) => u.claimId), ['CLM-bbbbbbbbbb', 'CLM-dddddddddd'],
    `reported: ${JSON.stringify(un)}`);
  assert.match(un[0].text, /^accept/);
  // and the parser agrees these are unreadable — the two functions must not disagree
  const parsed = parseDecisions(text);
  assert.equal(parsed.has('CLM-bbbbbbbbbb'), false);
  assert.equal(parsed.has('CLM-dddddddddd'), false);
  assert.equal(parsed.get('CLM-9999999999').letter, 't');
});

test('R2-3b: the CLI exits 5 and leaves the claim proposed when a DECIDE line cannot be read', () => {
  const root = tempRoot();
  try {
    const c = claim({ claimId: 'CLM-aaaaaaaaaa' });
    writeFileSync(join(root, 'claims-proposed.jsonl'), JSON.stringify(c) + '\n');
    const batch = join(root, 'BATCH-test.md');
    writeFileSync(batch, '### CLM-aaaaaaaaaa\nDECIDE: accept\n');
    const r = run(root, 'adjudicate.mjs', '--batch', batch);
    assert.equal(r.status, 5, `expected exit 5, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /could not be read/);
    assert.match(r.stderr, /use a=accept r=reject t=trial m CLM-xxx=merge/);
    // the claim is untouched — an unreadable instruction is not an instruction
    const still = readFileSync(join(root, 'claims-proposed.jsonl'), 'utf8');
    assert.match(still, /CLM-aaaaaaaaaa/, 'the claim must still be pending');
    assert.equal(existsSync(join(root, 'claims.jsonl')), false, 'nothing may be imported');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-4 — a successful emit must not report itself as a failure because the optional build failed.
// ─────────────────────────────────────────────────────────────────────────────
test('R2-4: emit-vault --build with a missing vault tool exits 0 and still writes the collection', () => {
  const root = tempRoot();
  const vault = tempRoot();
  try {
    const accepted = claim({
      claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
      receiptRefs: ['RCP-9001', 'RCP-9002'],
      confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
      humanDecision: { actor: 'sean', utc: '2026-09-18T00:00:00Z', batchId: 'B.md' },
    });
    writeFileSync(join(root, 'claims.jsonl'), JSON.stringify(accepted) + '\n');
    mkdirSync(join(vault, 'collections'), { recursive: true }); // no tools/ → the build tool is absent

    const r = spawnSync(NODE, [join(SRC, 'src', 'emit-vault.mjs'), '--root', root, '--vault', vault, '--build'],
      { encoding: 'utf8' });
    assert.equal(r.status, 0, `a written collection must not be reported as a failure: ${r.stderr}`);
    assert.match(r.stdout, /emitted 1 accepted claim/);
    assert.match(r.stderr, /vault build tool was not found/);
    assert.equal(existsSync(join(vault, 'collections', 'design-claims')), true, 'the collection must be on disk');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(vault, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R2-5 — the schema closes nested objects too; the validator must enforce it at that depth.
// ─────────────────────────────────────────────────────────────────────────────
test('R2-5: unknown keys inside confidence / swanTranslation / autoUpdate / humanDecision are refused', () => {
  assert.equal(validateClaim(claim({ confidence: { level: 'low', basis: 'x', sneaky: 1 } })).ok, false);
  assert.ok(validateClaim(claim({ confidence: { level: 'low', basis: 'x', sneaky: 1 } })).errors
    .some((e) => /unknown field: confidence\.sneaky/.test(e)));
  assert.equal(validateClaim(claim({ swanTranslation: { cPatterns: [], tokens: '', qaRisks: '', nope: 1 } })).ok, false);
  assert.equal(validateClaim(claim({ autoUpdate: { kind: 'corroborate', oops: 1 } })).ok, false);
  assert.equal(validateClaim(claim({ humanDecision: { actor: 'sean', utc: 'x', batchId: 'b', extra: 1 } })).ok, false);
  // the receipt schema closes nothing nested, but the receipt path must still run the check
  assert.equal(validateReceipt(receipt({ confidence: { level: 'low', basis: 'x', sneaky: 1 } })).ok, false);
});

test('R2-5b: legitimate nested keys still validate (positive control)', () => {
  assert.equal(validateClaim(claim({ swanTranslation: { cPatterns: ['a'], tokens: 't', qaRisks: 'q' } })).ok, true);
  assert.equal(validateClaim(claim({
    autoUpdate: {
      kind: 'corroborate', actor: 'system', utc: 'x', runId: 'r', receiptRefs: [],
      addedProducts: [], prevConfidence: 'low', nextConfidence: 'high',
    },
  })).ok, true);
  assert.equal(validateClaim(claim({ humanDecision: { actor: 'sean', utc: 'x', batchId: 'b', note: 'n' } })).ok, true);
});
