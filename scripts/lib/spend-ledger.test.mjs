/**
 * spend-ledger.test.mjs — proves the CAP, not the pipe.
 *
 * GLM 5.3 F5 (2026-08-24): the ledger writer was "proven" by writing one row and
 * reading it back — that proves the write pipe, not the regression. Nothing showed
 * (a) the guard's topic key and the writer's topic key agreeing on real filenames,
 * or (b) spend accumulating to a cap and the check refusing. This file does both,
 * with injected entries so no real ledger is touched.
 *
 * Three seats also caught `usd: cost ?? 0` recording a confident zero for unpriced
 * calls — fail-open in the expensive direction. Null is now the recorded value and
 * readers count it as the per-call cap; that policy is pinned here.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAPS, topicFromPath, spentOnTopic, spentToday, isPriced } from './spend-ledger.mjs';

// --- isPriced: the silent-zero trap, closed twice -------------------------------
// `Number('')` is 0 and `Number(true)` is 1. The first null-usd fix used
// `Number.isFinite(Number(usd))`, which would have recorded an EMPTY cost field as a
// confident $0.00 — the exact class it was written to close. Found by the author
// attacking their own review-packet prompts (2026-08-25), before any seat did.

test('isPriced: real numbers and numeric strings are priced', () => {
  for (const v of [0, 0.25, 1, '0', '0.0068', ' 0.5 ']) assert.equal(isPriced(v), true, String(v));
});

test('isPriced: blank, boolean, null, undefined, NaN, Infinity, objects are NOT priced', () => {
  for (const v of ['', '   ', true, false, null, undefined, NaN, Infinity, -Infinity, {}, [], 'abc', '1x', -0.01, '-1']) {
    assert.equal(isPriced(v), false, `isPriced(${JSON.stringify(v)}) must be false`);
  }
});

// --- topicFromPath: one key for one document, on the filenames that diverged ---

test('topicFromPath: the filenames that split guard-key from writer-key now agree', () => {
  // GLM's concrete counter-examples from the review, plus the shapes seen on disk.
  const cases = [
    ['docs/x/brainstorm.org',            'brainstorm.org'],   // unlisted ext is KEPT (guard rule)
    ['C:\\tmp\\Spec — final.md',         'Specfinal'],        // charset filter, not passthrough
    ['a/b/three-fixes-review-packet.md', 'three-fixes-review-packet'],
    ['qa-oracle-design-brief.json',      'qa-oracle-design-brief'],
    ['x'.repeat(80) + '.md',             'x'.repeat(60)],     // hard 60 cap
    ['',                                 'untitled'],
    [undefined,                          'untitled'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(topicFromPath(input), expected, `topicFromPath(${JSON.stringify(input)})`);
  }
});

test('topicFromPath is idempotent — a key run through it again is unchanged', () => {
  for (const k of ['three-fixes-review-packet', 'brainstorm.org', 'x'.repeat(60), 'untitled']) {
    assert.equal(topicFromPath(k), k);
  }
});

// --- null usd = worst case, never zero -------------------------------------

test('an unpriced row (usd null) counts as the per-call cap, not $0', () => {
  const topic = 'unpriced-probe';
  const entries = [{ ts: '2026-01-01T00:00:00Z', model: 'm', topic, usd: null }];
  assert.equal(spentOnTopic(topic, entries), CAPS.perCall);
  const undef = [{ ts: '2026-01-01T00:00:00Z', model: 'm', topic }];
  assert.equal(spentOnTopic(topic, undef), CAPS.perCall, 'missing usd is the same as null');
});

test('priced rows still sum exactly, and a bare 0 stays 0', () => {
  const topic = 'priced';
  const entries = [
    { ts: '2026-01-01T00:00:00Z', model: 'm', topic, usd: 0.25 },
    { ts: '2026-01-01T00:00:00Z', model: 'm', topic, usd: 0.5 },
    { ts: '2026-01-01T00:00:00Z', model: 'free', topic, usd: 0 },
  ];
  assert.equal(spentOnTopic(topic, entries), 0.75);
});

// --- accumulation to a cap: the regression the writer exists to fix ----------

test('spend ACCUMULATES on a topic to the cap — what a dead writer could never do', () => {
  const topic = topicFromPath('some/dir/big-debate-packet.md');
  const perRow = 0.37;                              // ~one panel round
  const rows = Math.ceil(CAPS.perTopic / perRow);   // enough rounds to breach
  const entries = Array.from({ length: rows }, () => ({
    ts: '2026-01-01T00:00:00Z', model: 'x-ai/grok-4.6', topic, usd: perRow,
  }));
  const spent = spentOnTopic(topic, entries);
  assert.ok(spent >= CAPS.perTopic,
    `${rows} rows × $${perRow} = $${spent.toFixed(2)} must reach the $${CAPS.perTopic} topic cap`);
  // The guard's own breach arithmetic: topic + next call > cap → refuse.
  assert.ok(spent + 0.01 > CAPS.perTopic, 'the very next call must breach');
});

test('topic accumulation is keyed by the SAME function on both sides', () => {
  // A writer that keyed differently (the pre-fix state) would land rows the guard
  // never sees. Simulate: rows written under the writer's OLD scheme vs the guard's.
  const doc = 'notes/Spec — final.md';
  const guardKey = topicFromPath(doc);
  const oldWriterKey = 'Spec — final';            // old: strip ext, filter nothing
  const rows = [{ ts: '2026-01-01T00:00:00Z', model: 'm', topic: oldWriterKey, usd: 2.99 }];
  assert.equal(spentOnTopic(guardKey, rows), 0, 'old-scheme rows are INVISIBLE to the guard — the bug');
  const fixed = [{ ...rows[0], topic: topicFromPath(doc) }];
  assert.equal(spentOnTopic(guardKey, fixed), 2.99, 'same-function rows are counted — the fix');
});

test('spentToday only counts today and treats null as worst case there too', () => {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { ts: `${today}T01:00:00Z`, model: 'm', topic: 'a', usd: 0.1 },
    { ts: `${today}T02:00:00Z`, model: 'm', topic: 'b', usd: null },
    { ts: '2020-01-01T00:00:00Z', model: 'm', topic: 'c', usd: 99 },
  ];
  assert.equal(spentToday(entries), 0.1 + CAPS.perCall);
});
