/**
 * judge-export-contract — Judge Mode's evidence artifact.
 * @module scripts/swan-brain-console/app/judge-export.test
 *
 * THE PROPERTY THAT MATTERS MOST
 * The exported file is what a reviewer reads to decide whether a variant earned its
 * place. So the tests here are less about "does it produce output" and more about
 * "can the output be trusted": is it complete or does it merely look complete, and can
 * one pair be counted twice?
 *
 * `INCOMPLETE` is asserted explicitly. An export that reads as final when the operator
 * judged four of ten pairs is worse than no export, because it carries the authority of
 * a finished review while containing a quarter of one.
 *
 * Run: node --test scripts/swan-brain-console/app/judge-export.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'judge-export.mjs');
const mod = await import(pathToFileURL(SRC).href);

/** Twenty fake rows, shaped like the fleet rows the console renders. */
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `v${String(i + 1).padStart(2, '0')}` }));
const { pairs } = mod.pairsFrom(ROWS);

/** Judge the first `n` pairs, alternating kinds so the summary has something to count. */
function judged(n, at = '2026-09-19T12:00:00.000Z') {
  let state = mod.emptyState(pairs);
  const kinds = ['left', 'right', 'tie', 'neither'];
  for (let i = 0; i < n; i += 1) state = mod.applyVerdict(state, i, kinds[i % kinds.length], at);
  return state;
}

/* ── C1 — purity ────────────────────────────────────────────────────────────── */

describe('C1 — the exporter is pure', () => {
  test('it runs in bare Node with no DOM present', () => {
    // The strongest available evidence: this file was imported and every function below
    // is exercised with no browser, no jsdom and no stub globals installed.
    assert.equal(typeof globalThis.document, 'undefined');
    assert.equal(typeof globalThis.window, 'undefined');
    assert.equal(typeof mod.buildExport, 'function');
  });

  /**
   * A SECONDARY ratchet, and its limits stated rather than implied.
   *
   * This is a source scan, so it can be fooled by indirection — a helper that receives
   * `document` as a parameter would pass while still touching the DOM. It is here to
   * catch the ordinary regression (someone reaching for `localStorage` or `fetch` in the
   * pure layer), and the test above is the one that actually proves the property. A
   * regex ratchet is a smoke alarm, not a fire door.
   */
  test('the source reaches for no DOM, network or filesystem global', () => {
    const src = readFileSync(SRC, 'utf8');
    const banned = ['document.', 'window.', 'localStorage', 'sessionStorage', 'fetch(', 'require(', "from 'node:fs'"];
    for (const token of banned) {
      assert.ok(!src.includes(token), `judge-export.mjs references ${token} — it is not pure`);
    }
  });

  test('the clock is an argument, not a call', () => {
    const src = readFileSync(SRC, 'utf8');
    assert.ok(!src.includes('new Date('), 'the exporter must not read the clock itself');
    assert.ok(!src.includes('Date.now('), 'the exporter must not read the clock itself');
  });
});

/* ── C2 — ten pairs, each judged at most once ───────────────────────────────── */

describe('C2 — 10 pairs from 20 variants, each judged at most once', () => {
  test('twenty variants produce exactly ten pairs', () => {
    assert.equal(pairs.length, 10);
  });

  test('every variant appears exactly once across the pairs', () => {
    const seen = pairs.flatMap((p) => [p.left.id, p.right.id]);
    assert.equal(seen.length, 20);
    assert.equal(new Set(seen).size, 20, 'a variant was paired twice');
    assert.deepEqual(seen, ROWS.map((r) => r.id));
  });

  test('an odd row out is REPORTED, not silently dropped', () => {
    const out = mod.pairsFrom(ROWS.slice(0, 19));
    assert.equal(out.pairs.length, 9);
    assert.equal(out.unpaired.id, 'v19', 'the unpaired variant must be named');
  });

  test('RE-JUDGING a pair replaces its verdict instead of adding one', () => {
    let state = mod.applyVerdict(mod.emptyState(pairs), 3, 'left', 'T1');
    state = mod.applyVerdict(state, 3, 'right', 'T2');
    assert.equal(mod.summarize(state).judged, 1, 'a second keypress counted as a second pair');
    assert.equal(state.verdicts[3].kind, 'right', 'the later verdict must win');
    assert.equal(state.verdicts[3].at, 'T2');
  });

  test('a verdict is immutable — the previous state object is untouched', () => {
    const before = mod.emptyState(pairs);
    const after = mod.applyVerdict(before, 0, 'left', 'T');
    assert.deepEqual(before.verdicts, {}, 'applyVerdict mutated its input');
    assert.equal(Object.keys(after.verdicts).length, 1);
  });

  test('clearing a pair is not the same as judging it', () => {
    // judged(3) records left/right/tie on pairs 0/1/2. Clearing pair 1 must remove the
    // RIGHT verdict specifically — asserting only that the total fell would pass even if
    // clearing had removed the wrong pair.
    let state = judged(3);
    state = mod.clearVerdict(state, 1);
    const s = mod.summarize(state);
    assert.equal(s.judged, 2);
    assert.equal(s.unjudged, 8);
    assert.equal(s.byKind.right, 0, 'the cleared pair is still counted');
    assert.equal(s.byKind.left, 1, 'clearing removed the wrong pair');
    assert.equal(s.byKind.tie, 1);
  });

  /**
   * THE OUT-OF-RANGE REGRESSION. This test failed on first run and the CODE was wrong,
   * not the expectation: `applyVerdict` bounded only the lower index, so index 999 was
   * accepted. `verdictRows` filters by the real pair list and would have hidden it, but
   * `summarize` counts the verdict map — so `judged` could equal `total` while a genuine
   * pair sat unjudged, and a partial session would export as `complete: true`.
   */
  test('an out-of-range pair index or an unknown kind is ignored, not recorded', () => {
    let state = mod.emptyState(pairs);
    state = mod.applyVerdict(state, -1, 'left', 'T');
    state = mod.applyVerdict(state, 999, 'left', 'T');
    state = mod.applyVerdict(state, 10, 'left', 'T'); // pairCount is 10 → 0..9
    state = mod.applyVerdict(state, 0, 'maybe', 'T');
    assert.equal(mod.summarize(state).judged, 0);
  });

  test('the invariant judged ≤ total holds against a hostile index', () => {
    let state = mod.emptyState(pairs);
    // Judge nine real pairs, then try to fake a tenth with a bogus index.
    for (let i = 0; i < 9; i += 1) state = mod.applyVerdict(state, i, 'left', 'T');
    state = mod.applyVerdict(state, 999, 'left', 'T');
    const s = mod.summarize(state);
    assert.ok(s.judged <= s.total, `judged (${s.judged}) exceeded total (${s.total})`);
    assert.equal(s.complete, false, 'a bogus index made a partial session look complete');
    assert.equal(s.unjudged, 1);
  });
});

/* ── C3 — the four verdict kinds ────────────────────────────────────────────── */

describe('C3 — 1/2/E/N produce the four verdict kinds', () => {
  test('each key maps to its kind', () => {
    assert.equal(mod.verdictForKey('1'), 'left');
    assert.equal(mod.verdictForKey('2'), 'right');
    assert.equal(mod.verdictForKey('e'), 'tie');
    assert.equal(mod.verdictForKey('n'), 'neither');
  });

  test('the map is case-insensitive, because a shifted key is still that key', () => {
    assert.equal(mod.verdictForKey('E'), 'tie');
    assert.equal(mod.verdictForKey('N'), 'neither');
  });

  test('an unmapped key resolves to null rather than guessing', () => {
    for (const key of ['3', 'q', 'Enter', ' ', '', null, undefined, 1]) {
      assert.equal(mod.verdictForKey(key), null, `key ${JSON.stringify(key)} was mapped`);
    }
  });

  test('all four kinds appear in a fully judged session', () => {
    const s = mod.summarize(judged(10));
    assert.deepEqual(s.byKind, { left: 3, right: 3, tie: 2, neither: 2 });
    assert.equal(s.judged, 10);
    assert.equal(s.complete, true);
  });
});

/* ── C4 — persistence: MOVED to `judge-persistence.test.mjs` (round 11) ─────── */
/*
 * The stored session — its round-trip, its completeness, and the identity check that stops a
 * reordered fleet inheriting old judgements — is now covered by `judge-persistence.test.mjs`.
 * Two subjects, two suites: this file is pairing, the verdict reducer and the two artifacts.
 * The split is what brought this file back inside Rule 4's budget, and the Judge Mode Rule 4
 * guard is what caught the breach — on its first run, which is the guard working.
 */

/* ── C5 — both artifacts ────────────────────────────────────────────────────── */

describe('C5 — the export produces both a .json and a .md', () => {
  const state = judged(10);
  const out = mod.buildExport(state, pairs, { generatedAt: '2026-09-19T12:00:00.000Z' });

  test('both artifacts are present and non-empty', () => {
    assert.ok(out.json.length > 50);
    assert.ok(out.markdown.length > 50);
  });

  test('the JSON parses and carries the summary, not just the rows', () => {
    const parsed = JSON.parse(out.json);
    assert.equal(parsed.pairCount, 10);
    assert.equal(parsed.judged, 10);
    assert.equal(parsed.complete, true);
    assert.equal(parsed.verdicts.length, 10);
    assert.equal(parsed.generatedAt, '2026-09-19T12:00:00.000Z');
  });

  test('every markdown row names both variants and the verdict', () => {
    for (const r of mod.verdictRows(state, pairs)) {
      assert.ok(out.markdown.includes(`| ${r.pair} | ${r.left} | ${r.right} |`));
      assert.ok(out.markdown.includes(r.label));
    }
  });

  test('the filename is safe on every filesystem', () => {
    assert.match(out.filenameBase, /^swan-judge-[A-Za-z0-9-]+$/);
    assert.ok(!out.filenameBase.includes(':'), 'colons are illegal in Windows filenames');
  });

  test('it states that nothing was promoted by exporting', () => {
    assert.match(out.markdown, /reviewed commit/i);
  });
});

/* ── The incomplete-export guard ────────────────────────────────────────────── */

describe('an incomplete session cannot masquerade as a finished one', () => {
  test('a partial export says INCOMPLETE and reports the shortfall', () => {
    const out = mod.buildExport(judged(4), pairs, { generatedAt: 'T' });
    const parsed = JSON.parse(out.json);
    assert.equal(parsed.complete, false);
    assert.equal(parsed.judged, 4);
    assert.equal(parsed.unjudged, 6);
    assert.match(out.markdown, /INCOMPLETE/);
  });

  test('an untouched session exports a table rather than an empty file', () => {
    const out = mod.buildExport(mod.emptyState(pairs), pairs, { generatedAt: 'T' });
    assert.equal(JSON.parse(out.json).judged, 0);
    assert.match(out.markdown, /nothing judged yet/);
  });

  test('determinism — the same input produces byte-identical output', () => {
    const meta = { generatedAt: '2026-09-19T12:00:00.000Z' };
    assert.equal(
      mod.buildExport(judged(7), pairs, meta).json,
      mod.buildExport(judged(7), pairs, meta).json,
    );
  });
});

/* ── Rule 4 ─────────────────────────────────────────────────────────────────── */

describe('Rule 4 — the Judge Mode modules stay within budget', () => {
  /*
   * `app-judge.js` JOINED THIS LIST IN ROUND 10 (2026-09-20) at exactly 300 lines.
   *
   * It was in no Rule 4 guard before — none of the three in this directory named it — and
   * round 10 walked straight into that gap: adding a doc comment and one label element took
   * it to 307 and NOTHING FAILED. That is the blind spot demonstrated rather than argued.
   * It is a Judge Mode module, so it belongs to this guard by subject, not by accident.
   */
  test('the Judge Mode modules and their suites are ≤300 lines', () => {
    for (const f of ['app-judge.js', 'judge-export.mjs', 'judge-export.test.mjs', 'judge-persistence.test.mjs']) {
      const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines, over the 300-line budget`);
    }
  });
});
