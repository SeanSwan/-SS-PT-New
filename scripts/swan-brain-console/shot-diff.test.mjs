/**
 * shot-diff.test — the pure half of the baseline comparator.
 * @module scripts/swan-brain-console/shot-diff.test
 *
 * WHY THIS SUITE EXISTS
 * `shot-diff.mjs` is the only guard in this workstream that compares today's render against
 * a stored reference, and its whole value rests on one distinction: a variant with NO
 * baseline must never be reported as matching one. If `no_baseline` ever collapses into
 * `pass`, the guard becomes a script that prints green for a fleet it has never seen — which
 * is the same defect as a gate that treats "not run" as "pass".
 *
 * The pixel measurement itself runs in the browser and is exercised by the workflow. What is
 * tested here is the DECISION, which is pure and therefore cheap to pin exhaustively.
 *
 * Run: node --test scripts/swan-brain-console/shot-diff.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  classifyComparison, summarize, parseArgs, BASELINE_DIR,
} from './shot-diff.mjs';
// The artifact builder and its failure count live in their own module — the interface to a
// different consumer is a different subject from driving a browser.
import {
  buildRenderResult, countFailures, DEFAULT_MAX_DIFF_PIXEL_RATIO,
} from './renderResult.mjs';
// The READER. Imported here on purpose: this suite is the only place where the producer and
// the consumer of `docs/qa/gate-results/three-worlds-render.json` are in the same room, and
// round 6's defect existed precisely because they had each been tested alone.
import { readGateHealth, GATES } from './gateHealth.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** A fixed clock, so "fresh" is a property of the fixture and not of when the suite ran. */
const NOW = new Date('2026-09-19T06:00:00Z');
/** The gate row the console declares for the artifact this script writes. */
const RENDER_GATE = GATES.find((g) => g.id === 'three-worlds-render');

/**
 * Write a document at the DECLARED path and ask the console's reader what it makes of it.
 * This is the interface, exercised end to end: no shared helper, no restatement of the
 * reader's rules — the reader is handed the file it would find on disk.
 */
function readAsGateHealth(doc) {
  const root = mkdtempSync(join(tmpdir(), 'shot-diff-contract-'));
  const full = join(root, RENDER_GATE.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(doc, null, 2));
  try {
    return readGateHealth(root, { now: NOW.getTime() }).gates.find((g) => g.id === RENDER_GATE.id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** A perfect render run: twenty variants, all matching their committed baselines. */
function perfectRun() {
  return Array.from({ length: 20 }, (_, i) => ({ id: `variant-${i}`, status: 'pass' }));
}

/* ── the invariant ────────────────────────────────────────────────────────── */

test('a missing baseline is NOT a pass', () => {
  const out = classifyComparison({ baselineExists: false, diffRatio: 0 });
  assert.equal(out.status, 'no_baseline');
  assert.notEqual(out.status, 'pass');
});

test('a missing baseline is reported even when a ratio was somehow measured', () => {
  // Belt and braces: if a caller passes a perfect ratio with no baseline, the absence wins.
  const out = classifyComparison({ baselineExists: false, diffRatio: 0 });
  assert.notEqual(out.status, 'pass');
});

test('a ratio of null is unreadable, not a pass', () => {
  const out = classifyComparison({ baselineExists: true, diffRatio: null });
  assert.equal(out.status, 'unreadable');
});

test('a non-finite ratio is unreadable, not a pass', () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(classifyComparison({ baselineExists: true, diffRatio: bad }).status, 'unreadable');
  }
});

/* ── the threshold behaves at the boundary ────────────────────────────────── */

test('passes at exactly the limit, fails just above it', () => {
  const max = 0.002;
  assert.equal(classifyComparison({ baselineExists: true, diffRatio: max, maxDiffPixelRatio: max }).status, 'pass');
  assert.equal(
    classifyComparison({ baselineExists: true, diffRatio: max + 1e-9, maxDiffPixelRatio: max }).status,
    'fail',
  );
});

test('an identical render passes with a zero ratio', () => {
  assert.equal(classifyComparison({ baselineExists: true, diffRatio: 0 }).status, 'pass');
});

test('a wholesale change fails', () => {
  const out = classifyComparison({ baselineExists: true, diffRatio: 0.9 });
  assert.equal(out.status, 'fail');
  assert.match(out.detail, /90\.000%/);
});

test('the default tolerance is used when none is supplied', () => {
  const out = classifyComparison({ baselineExists: true, diffRatio: DEFAULT_MAX_DIFF_PIXEL_RATIO + 0.001 });
  assert.equal(out.status, 'fail');
});

/* ── summarize ────────────────────────────────────────────────────────────── */

test('summarize counts every status, and pass is the only pass', () => {
  const s = summarize([
    { status: 'pass' }, { status: 'pass' }, { status: 'fail' },
    { status: 'no_baseline' }, { status: 'unreadable' },
  ]);
  assert.equal(s.total, 5);
  assert.equal(s.pass, 2);
  assert.equal(s.fail, 1);
  assert.equal(s.no_baseline, 1);
  assert.equal(s.unreadable, 1);
});

test('summarize handles the --update "written" status without calling it a pass', () => {
  const s = summarize([{ status: 'written' }, { status: 'written' }]);
  assert.equal(s.written, 2);
  assert.equal(s.pass, 0);
});

test('summarize of an empty run reports zero rather than throwing', () => {
  assert.deepEqual(summarize([]), {
    total: 0, pass: 0, fail: 0, no_baseline: 0, unreadable: 0,
  });
});

/* ── args ─────────────────────────────────────────────────────────────────── */

test('parseArgs defaults to compare mode with the default tolerance', () => {
  const o = parseArgs([]);
  assert.equal(o.update, false);
  assert.equal(o.maxDiffPixelRatio, DEFAULT_MAX_DIFF_PIXEL_RATIO);
  assert.match(o.url, /5199/);
});

test('parseArgs reads --update and --max-diff', () => {
  const o = parseArgs(['--update', '--max-diff', '0.05']);
  assert.equal(o.update, true);
  assert.equal(o.maxDiffPixelRatio, 0.05);
});

test('parseArgs ignores a non-numeric --max-diff rather than producing NaN', () => {
  assert.equal(parseArgs(['--max-diff', 'lots']).maxDiffPixelRatio, DEFAULT_MAX_DIFF_PIXEL_RATIO);
});

test('the baseline directory is the one the plan names', () => {
  assert.equal(BASELINE_DIR, 'docs/qa/baseline/three-worlds');
});

/* ── the artifact contract: producer and reader, in the same room ───────────
 * RED-first evidence for round 6, finding F2. Before `buildRenderResult` existed the
 * document was built inline and this file wrote `generatedAt` + `{pass, fail, …}`, which the
 * reader could not classify: a perfect twenty-variant render run came back `unreadable`, so
 * the console's own render gate could never be green. These four tests are the interface.
 * ------------------------------------------------------------------------ */

test('the artifact this script writes is readable by the console that declares it', () => {
  const results = perfectRun();
  const doc = buildRenderResult({ results, summary: summarize(results), now: NOW });
  const gate = readAsGateHealth(doc);
  assert.equal(gate.status, 'pass', `a perfect render run was reported as ${gate.status}: ${gate.detail}`);
});

test('the artifact carries the reader vocabulary, not just this script\'s', () => {
  // Naming the keys explicitly, because "it happens to work" is what hid the defect: the
  // reader wants `timestamp` and `summary.passed`/`summary.failed` and nothing else.
  const results = perfectRun();
  const doc = buildRenderResult({ results, summary: summarize(results), now: NOW });
  assert.equal(doc.timestamp, NOW.toISOString());
  assert.equal(doc.summary.passed, 20);
  assert.equal(doc.summary.failed, 0);
  assert.equal(doc.summary.total, 20);
  // The render-specific buckets survive, because they are what explains a failure.
  assert.equal(doc.summary.no_baseline, 0);
});

test('a run with a missing baseline is not a green gate, on either side', () => {
  // The same run, judged by the script's exit code and by the console. If these ever
  // disagree, one of them is lying to somebody.
  const results = [...perfectRun().slice(0, 19), { id: 'variant-19', status: 'no_baseline' }];
  const summary = summarize(results);
  const doc = buildRenderResult({ results, summary, now: NOW });
  assert.equal(countFailures(summary), 1, 'the exit code must see one failure');
  assert.equal(doc.summary.failed, 1, 'the artifact must carry the same failure count');
  const gate = readAsGateHealth(doc);
  assert.equal(gate.status, 'fail', `expected fail, got ${gate.status}: ${gate.detail}`);
});

test('the persisted failure count is the number CI exits on', () => {
  // Pinned as one expression rather than two: `countFailures` is used by both the artifact
  // and `process.exit`, so a console showing green while CI exits 1 is not reachable.
  const results = [
    { id: 'a', status: 'pass' }, { id: 'b', status: 'fail' },
    { id: 'c', status: 'no_baseline' }, { id: 'd', status: 'unreadable' },
  ];
  const summary = summarize(results);
  const doc = buildRenderResult({ results, summary, now: NOW });
  assert.equal(doc.summary.failed, countFailures(summary));
  assert.equal(doc.summary.failed, 3);
  assert.equal(doc.summary.passed, 1);
  assert.equal(doc.summary.passed + doc.summary.failed, doc.summary.total);
});

test('an --update artifact is NEVER a green comparison', () => {
  /*
   * `--update` rewrites the committed baselines and exits 0. Its artifact is fresh, and its
   * counts are all zero because nothing was compared — which is exactly the shape that reads
   * as green if you only look at the numbers. CI refuses to run `--update` for this reason;
   * the reader must refuse it too, in case an artifact is ever left behind by a local run.
   */
  const results = Array.from({ length: 20 }, (_, i) => ({ id: `variant-${i}`, status: 'written' }));
  const summary = summarize(results);
  const doc = buildRenderResult({ results, summary, update: true, now: NOW });
  assert.equal(doc.mode, 'update');
  assert.equal(doc.summary.failed, 0, 'an update run cannot fail — it compared nothing');
  const gate = readAsGateHealth(doc);
  assert.notEqual(gate.status, 'pass', 'an --update artifact was read as a passing comparison');
  assert.equal(gate.status, 'not_evidence');
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: every module in this subsystem stays within 300 lines', () => {
  // Round 11 added `baselineComparison.mjs` and `pixelDiff.mjs`: closing F04 pushed
  // `shot-diff.mjs` to 352 lines, and this guard is what forced the separation.
  for (const f of [
    'shot-diff.mjs', 'shot-diff.test.mjs', 'renderResult.mjs',
    'baselineComparison.mjs', 'pixelDiff.mjs', 'fleetData.mjs', 'fleetMeasure.mjs',
  ]) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
