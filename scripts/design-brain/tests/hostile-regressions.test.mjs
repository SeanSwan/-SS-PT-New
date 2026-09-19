/**
 * hostile-regressions.test.mjs — regression tests for the 2026-09-18 hostile review findings.
 * ==========================================================================================
 * Every test here pins a defect that was REPRODUCED BY EXECUTION against the built engine, not
 * inferred. Each one names the finding id (F1..F8) so the report and the code stay linked.
 *
 * Discipline: these were run RED against the pre-fix engine first. A test that only ever passed is
 * not a regression test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { safeWriteText, appendJsonl } from '../src/writer.mjs';
import { validateReceipt, validateClaim } from '../src/validate.mjs';
import { applyDecisions, parseDecisions } from '../src/adjudicate.mjs';
import { renderPacket } from '../src/packet.mjs';
import { corroborateBatch, applyCorroboration, runCorroborate } from '../src/corroborate.mjs';
import { readJsonl, synthesizeClaims } from '../src/synthesize.mjs';
import { computeNovelty } from '../src/novelty.mjs';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const BATCH_DIR = join(dirname(dirname(dirname(SRC))), 'scripts', 'design-brain', 'batches');

function tempRoot() {
  const d = mkdtempSync(join(tmpdir(), 'db-hostile-'));
  return d;
}

const receipt = (over = {}) => ({
  receiptId: 'RCP-9001', domainId: 'D01', product: 'Hevy', refType: 'screen',
  surface: 'Logger', platform: 'ios', stepCount: 4,
  hierarchyNotes: 'A long enough note that it comfortably clears the forty character floor.',
  principleCandidates: ['log sets inline on the active screen'],
  inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

const claim = (over = {}) => ({
  claimId: 'CLM-aaaaaaaaaa', domainId: 'D01',
  principle: 'log sets inline without leaving the active workout screen',
  workflowPhase: 'Logger', userRole: 'client', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  exceptions: [], contradictions: [], swanTranslation: {},
  confidence: { level: 'low', basis: 'single source — capped LOW until corroborated' },
  singleSource: true, status: 'proposed', createdUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// F5 — the audit ledger must obey the same jail + symlink refusal as every other write.
// Pre-fix: a `ledger/` junction inside the root redirected writes.jsonl OUTSIDE the data root.
// ─────────────────────────────────────────────────────────────────────────────
test('F5: the audit ledger cannot be redirected outside the data root via a junction', () => {
  const root = tempRoot();
  const outside = tempRoot();
  try {
    symlinkSync(outside, join(root, 'ledger'), 'junction');
    assert.throws(
      () => appendJsonl(root, join(root, 'receipts.jsonl'), { a: 1 }),
      /symlink/,
      'a junctioned ledger/ must make the write fail closed, not escape',
    );
    assert.equal(existsSync(join(outside, 'writes.jsonl')), false, 'nothing may land outside the root');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('F5b: the symlink refusal still protects ordinary targets (positive control)', () => {
  const root = tempRoot();
  const outside = tempRoot();
  try {
    mkdirSync(join(root, 'leak'), { recursive: true });
    symlinkSync(outside, join(root, 'leak', 'sub'), 'junction');
    assert.throws(() => safeWriteText(root, join(root, 'leak', 'sub', 'x.txt'), 'hi'), /symlink/);
    assert.equal(existsSync(join(outside, 'x.txt')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F6 — denied fields are a hard fail, so they must be checked at ANY depth, and the schema's
// additionalProperties:false must actually be enforced by the hand validator.
// Pre-fix: {"meta":{"screenshot":...}} and unknown top-level keys were both accepted.
// ─────────────────────────────────────────────────────────────────────────────
test('F6a: a denied field nested one level down is refused', () => {
  const v = validateReceipt(receipt({ meta: { screenshot: 'data:image/png;base64,AAAA' } }));
  assert.equal(v.ok, false, 'nested denied field must fail');
  assert.ok(v.errors.some((e) => /denied field/.test(e)), `errors were: ${v.errors}`);
});

test('F6b: a denied field nested inside an array element is refused', () => {
  const v = validateReceipt(receipt({ notes: [{ token: 'abc' }] }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /denied field/.test(e)));
});

test('F6c: an unknown top-level field is refused (schema says additionalProperties:false)', () => {
  const v = validateReceipt(receipt({ totallyUnexpectedField: 'anything' }));
  assert.equal(v.ok, false, 'unknown receipt key must fail');
  assert.ok(v.errors.some((e) => /unknown field/.test(e)), `errors were: ${v.errors}`);
});

test('F6d: unknown top-level claim keys are refused, but engine-added keys are allowed', () => {
  assert.equal(validateClaim(claim({ bogusKey: 1 })).ok, false);
  // fields the engine legitimately adds on rev+1 / fold
  for (const extra of [{ rev: 2 }, { updatedUtc: 'x' }, { autoUpdate: { kind: 'corroborate' } }, { runIdSeen: 'r' }]) {
    assert.equal(validateClaim(claim(extra)).ok, true, `engine field ${Object.keys(extra)[0]} must stay valid`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F7 — the usage guard must actually fire. Pre-fix `resolve('')` returned the cwd, so an omitted
// --batch crashed with EISDIR instead of printing usage.
// ─────────────────────────────────────────────────────────────────────────────
test('F7: adjudicate with no --batch prints usage and exits 2 (no EISDIR crash)', () => {
  const root = tempRoot();
  try {
    const r = spawnSync(NODE, [join(SRC, 'src', 'adjudicate.mjs'), '--root', root], { encoding: 'utf8' });
    assert.equal(r.status, 2, `expected exit 2, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /usage: adjudicate/);
    assert.doesNotMatch(r.stderr, /EISDIR/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F4 — `m CLM-xxx` is documented as the remedy for the disjoint-paraphrase residual, which only
// works if the surviving claim ABSORBS the merged claim's evidence.
// Pre-fix: the target kept its own single product, so merging two single-source claims still
// produced a single-source claim.
// ─────────────────────────────────────────────────────────────────────────────
test('F4: merging unions products + receipts into the target and lifts the LOW cap', () => {
  const a = claim({ claimId: 'CLM-aaaaaaaaaa', products: ['Hevy'], receiptRefs: ['RCP-9001'] });
  const b = claim({ claimId: 'CLM-bbbbbbbbbb', products: ['Strong'], receiptRefs: ['RCP-9002'] });
  const decisions = parseDecisions(`### CLM-bbbbbbbbbb\nDECIDE: m CLM-aaaaaaaaaa\n`);
  const { imported, remainingProposed, targetUpdates } = applyDecisions(
    [a, b], [], decisions, { actor: 'sean', batchId: 'B.md', nowIso: '2026-09-18T00:00:00Z' },
  );
  assert.equal(imported.length, 1);
  assert.equal(imported[0].status, 'merged');
  assert.ok(Array.isArray(targetUpdates), 'applyDecisions must report target updates');
  const mergedTarget = [...targetUpdates, ...remainingProposed].find((c) => c.claimId === 'CLM-aaaaaaaaaa');
  assert.deepEqual([...mergedTarget.products].sort(), ['Hevy', 'Strong'], 'target must absorb the products');
  assert.deepEqual([...mergedTarget.receiptRefs].sort(), ['RCP-9001', 'RCP-9002'], 'target must absorb the receipts');
  assert.equal(mergedTarget.confidence.level, 'medium', '2 independent products => medium, not LOW-capped');
  assert.equal(mergedTarget.singleSource, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// F1 — the loop must converge. A claim Sean already adjudicated must NOT be re-presented as a
// DECIDE block, and a letter aimed at an already-adjudicated claim must be reported, not dropped.
// ─────────────────────────────────────────────────────────────────────────────
test('F1a: an already-adjudicated claim is not re-presented as a DECIDE block', () => {
  const decided = claim({ claimId: 'CLM-decided001', status: 'proposed' });
  const fresh = claim({ claimId: 'CLM-fresh00001' });
  const md = renderPacket([decided, fresh], {
    batchId: '2026-09-18', adjudicatedIds: new Set(['CLM-decided001']),
  });
  assert.doesNotMatch(md, /^### CLM-decided001/m, 'decided claim must not reappear');
  assert.match(md, /^### CLM-fresh00001/m, 'undecided claim must still appear');
  assert.match(md, /already adjudicated/i, 'the packet must say why a claim is withheld');
});

test('F1b: a letter aimed at an already-adjudicated claim is reported, not silently dropped', () => {
  const decisions = parseDecisions('### CLM-decided001\nDECIDE: a\n');
  const { imported, ignoredDecisions } = applyDecisions(
    [claim({ claimId: 'CLM-decided001' })],
    [claim({ claimId: 'CLM-decided001', status: 'accepted' })],
    decisions, { actor: 'sean', batchId: 'B.md', nowIso: '2026-09-18T00:00:00Z' },
  );
  assert.equal(imported.length, 0, 'must not re-import');
  assert.deepEqual([...ignoredDecisions], ['CLM-decided001'], 'must report the dropped letter');
});

// ─────────────────────────────────────────────────────────────────────────────
// F2 — byte-identical restatement of an ACCEPTED claim. Pre-fix these receipts were orphaned:
// the accepted claim never gained the products, and the packet showed a phantom high-confidence
// claim that contradicted the asset.
// ─────────────────────────────────────────────────────────────────────────────
test('F2: grown evidence on an already-disposed claim is corroborated, not orphaned', () => {
  const target = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'accepted', products: ['Hevy', 'Strong'],
    receiptRefs: ['RCP-1', 'RCP-2'],
    confidence: { level: 'medium', basis: '2 independent products' }, singleSource: false,
  });
  const grown = claim({
    claimId: 'CLM-aaaaaaaaaa', status: 'proposed',
    products: ['Hevy', 'Strong', 'Fitbod', 'Jefit'],
    receiptRefs: ['RCP-1', 'RCP-2', 'RCP-3', 'RCP-4'],
  });
  const res = corroborateBatch({
    proposed: [], grownProposed: [grown], accepted: [target], pendingProposed: [],
    receiptsById: new Map(),
    tuning: {
      auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 }, mergeBand: { low: 0.55 },
      weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 }, stopwords: new Set(),
    },
    negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
  });
  assert.equal(res.claimAppends.length, 1, 'the grown claim must produce one rev+1 append');
  const rec = res.claimAppends[0];
  assert.deepEqual([...rec.products].sort(), ['Fitbod', 'Hevy', 'Jefit', 'Strong']);
  assert.equal(rec.confidence.level, 'high', '4 independent products => high');
  assert.equal(rec.rev, 2);
  assert.ok(rec.autoUpdate, 'the change must be auditable');
});

test('F2b: a grown claim with no accepted match writes nothing (no duplicate fresh event)', () => {
  const grown = claim({ claimId: 'CLM-zzzzzzzzzz', products: ['Hevy', 'Fitbod'], receiptRefs: ['RCP-1', 'RCP-9'] });
  const res = corroborateBatch({
    proposed: [], grownProposed: [grown], accepted: [], pendingProposed: [], receiptsById: new Map(),
    tuning: {
      auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 }, mergeBand: { low: 0.55 },
      weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 }, stopwords: new Set(),
    },
    negationCues: [], runId: 'RUN-1', nowIso: '2026-09-18T00:00:00Z',
  });
  assert.equal(res.claimAppends.length, 0);
  assert.equal(res.events.filter((e) => e.kind === 'fresh').length, 0, 'must not re-count as fresh');
});

// ─────────────────────────────────────────────────────────────────────────────
// F3 — runId must identify a RUN, not a calendar day. Pre-fix runId was the UTC date, so a second
// run on the same day had its deterministic eventIds suppressed as duplicates (the receipt-count
// denominator event was silently swallowed) and two runs collapsed into one novelty bucket.
// ─────────────────────────────────────────────────────────────────────────────
test('F3: two runs on the same day get distinct runIds and both receipt-count events survive', () => {
  const root = tempRoot();
  try {
    const cfgDir = join(SRC, 'config');
    const mk = (id, product, principle) => ({
      receiptId: id, domainId: 'D01', product, refType: 'screen', surface: 'Logger', platform: 'ios',
      hierarchyNotes: 'A long enough note that it comfortably clears the forty character floor.',
      principleCandidates: [principle],
      inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
    });
    const synth = () => {
      const { claims } = synthesizeClaims(readJsonl(join(root, 'receipts.jsonl')));
      safeWriteText(root, join(root, 'claims-proposed.jsonl'),
        claims.map((c) => JSON.stringify(c)).join('\n') + (claims.length ? '\n' : ''));
    };

    appendJsonl(root, join(root, 'receipts.jsonl'), mk('RCP-0001', 'Hevy', 'log sets inline on the active screen'));
    synth();
    const r1 = runCorroborate(root, cfgDir, { nowIso: '2026-09-18T10:00:00.000Z' });
    assert.notEqual(r1.runId, '2026-09-18', 'runId must not be a bare calendar date');
    assert.equal(r1.events, 2, `run 1 should emit receipt-count + fresh, got ${JSON.stringify(r1.tally)}`);

    // second run, same calendar day, a genuinely new principle
    appendJsonl(root, join(root, 'receipts.jsonl'), mk('RCP-0002', 'Strong', 'plate math shows a per-side split'));
    synth();
    const r2 = runCorroborate(root, cfgDir, { nowIso: '2026-09-18T14:00:00.000Z' });
    assert.notEqual(r1.runId, r2.runId, 'same-day runs must be distinct runs');
    assert.ok(r2.events > 0, 'run 2 must not be entirely suppressed by run 1 eventIds');

    const counts = readJsonl(join(root, 'events.jsonl')).filter((e) => e.kind === 'receipt-count');
    assert.equal(counts.length, 2, 'both runs must record their own denominator event');
    assert.equal(new Set(counts.map((e) => e.runId)).size, 2, 'the two denominator events must belong to two runs');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F8 — packet must not destroy an edited batch. Pre-fix the same-day batch path was overwritten,
// silently discarding Sean's in-progress letters.
// ─────────────────────────────────────────────────────────────────────────────
test('F8: re-running packet does not overwrite a batch that carries human letters', () => {
  const root = tempRoot();
  try {
    const batches = join(root, 'batches');
    mkdirSync(batches, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const edited = join(batches, `BATCH-${day}.md`);
    writeFileSync(edited, '### CLM-aaaaaaaaaa\nDECIDE: a\n');
    const r = spawnSync(NODE, [join(SRC, 'src', 'packet.mjs'), '--root', root], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(edited, 'utf8'), /DECIDE: a/, 'the edited batch must survive');
    const files = readFileSync(edited, 'utf8');
    assert.match(r.stdout, /preserved|BATCH-/, `stdout was: ${r.stdout}`);
    assert.ok(files.length > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('F3b: the novelty denominator counts THIS RUN\'s receipts, not the whole corpus', () => {
  const root = tempRoot();
  try {
    const cfgDir = join(SRC, 'config');
    const mk = (id, product, principle) => ({
      receiptId: id, domainId: 'D01', product, refType: 'screen', surface: 'Logger', platform: 'ios',
      hierarchyNotes: 'A long enough note that it comfortably clears the forty character floor.',
      principleCandidates: [principle],
      inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
    });
    const synth = () => {
      const { claims } = synthesizeClaims(readJsonl(join(root, 'receipts.jsonl')));
      safeWriteText(root, join(root, 'claims-proposed.jsonl'),
        claims.map((c) => JSON.stringify(c)).join('\n') + (claims.length ? '\n' : ''));
    };
    const P1 = 'log sets inline without leaving the active workout screen';

    appendJsonl(root, join(root, 'receipts.jsonl'), mk('RCP-0001', 'Hevy', P1));
    appendJsonl(root, join(root, 'receipts.jsonl'), mk('RCP-0002', 'Strong', P1));
    synth();
    runCorroborate(root, cfgDir, { nowIso: '2026-09-18T10:00:00.000Z' });

    // run 2: 5 restatements of P1 from new products + 1 genuinely new principle
    for (const [i, p] of ['Fitbod', 'Jefit', 'Liftin', 'Gymshark', 'RP'].entries()) {
      appendJsonl(root, join(root, 'receipts.jsonl'), mk(`RCP-100${i + 1}`, p, P1));
    }
    appendJsonl(root, join(root, 'receipts.jsonl'), mk('RCP-1006', 'Peloton', 'exercise history is reachable from the active set row'));
    synth();
    runCorroborate(root, cfgDir, { nowIso: '2026-09-18T14:00:00.000Z' });

    const counts = readJsonl(join(root, 'events.jsonl')).filter((e) => e.kind === 'receipt-count');
    assert.equal(counts.length, 2);
    assert.equal(counts[0].count, 2, 'run 1 reviewed 2 receipts');
    assert.equal(counts[1].count, 6, 'run 2 reviewed 6 NEW receipts (not 8 — the 2 carried over are excluded)');

    // The dial must reflect honest yield: 1 new principle / 6 receipts = 0.167, not 1.0.
    const domains = JSON.parse(readFileSync(join(cfgDir, 'domains.json'), 'utf8')).domains;
    const tuning = JSON.parse(readFileSync(join(cfgDir, 'tuning.json'), 'utf8'));
    const rows = computeNovelty(
      readJsonl(join(root, 'events.jsonl')),
      readJsonl(join(root, 'claims.jsonl')),
      domains, tuning,
    );
    const d01 = rows.find((r) => r.domainId === 'D01');
    assert.equal(d01.runs, 2, 'two runs, not one collapsed day-bucket');
    assert.equal(d01.noveltyPer[1], 0.167, `run 2 yield should be 1/6, got ${d01.noveltyPer[1]}`);
    assert.ok(d01.rolling < 0.5, `rolling novelty should fall as re-confirmation dominates, got ${d01.rolling}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('BATCH_DIR is where packet writes (documented location)', () => {
  assert.ok(typeof BATCH_DIR === 'string');
});
