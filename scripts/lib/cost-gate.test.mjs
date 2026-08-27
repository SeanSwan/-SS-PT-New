/**
 * Tests for the Cost Gate module.
 * Run: node --test scripts/lib/cost-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceFor,
  resolveBudget,
  DEFAULT_MAX_USD,
  estimateRunCost,
  aggregateCostByModel,
  formatCostSummary,
  formatCostSummaryMarkdown,
  confirmSpend,
  evaluateSpendGate,
  recordRunSpend,
  isOverCap,
} from './cost-gate.mjs';

test('priceFor: known paid, free, and runtime-injected models', () => {
  assert.deepEqual(priceFor('anthropic/claude-sonnet-4.6'), { in: 3.0, out: 15.0 });
  assert.deepEqual(priceFor('nvidia/nemotron-3-nano-30b-a3b:free'), { in: 0, out: 0 });
  assert.deepEqual(priceFor('anthropic/claude-opus-4.8', { 'anthropic/claude-opus-4.8': { in: 5, out: 25 } }), { in: 5, out: 25 });
});

test('resolveBudget reads cap + pre-approval from env', () => {
  assert.deepEqual(resolveBudget({ SWAN_VILLAGE_MAX_USD: '2.50', SWAN_VILLAGE_CONFIRM: 'yes' }), { capUSD: 2.5, preApproved: true });
  assert.deepEqual(resolveBudget({}), { capUSD: DEFAULT_MAX_USD, preApproved: false });
  assert.deepEqual(resolveBudget({ SWAN_VILLAGE_MAX_USD: 'bogus' }), { capUSD: DEFAULT_MAX_USD, preApproved: false });
});

test('estimateRunCost: free tracks cost $0; paid tracks + judge counted', () => {
  const free = estimateRunCost({
    tracks: [{ model: 'nvidia/nemotron-3-nano-30b-a3b:free' }, { model: 'google/gemini-2.5-flash' }],
    inputChars: 40000,
  });
  assert.equal(free.totalUSD, 0);
  assert.equal(free.breakdown.length, 0);

  const paid = estimateRunCost({
    tracks: [{ model: 'anthropic/claude-sonnet-4.6' }, { model: 'nvidia/nemotron-3-nano-30b-a3b:free' }],
    inputChars: 40000, // 10k input tokens
    judge: { model: 'anthropic/claude-opus-4.8' },
    debatesEnabled: false,
    extraPricing: { 'anthropic/claude-opus-4.8': { in: 5, out: 25 } },
  });
  // sonnet track: 10000/1e6*3 + 4096/1e6*15 = 0.03 + 0.06144 = 0.09144
  // judge: in = 2 tracks * 4096 = 8192 -> 8192/1e6*5 + 4096/1e6*25 = 0.04096 + 0.1024 = 0.14336
  assert.ok(Math.abs(paid.totalUSD - (0.09144 + 0.14336)) < 1e-6);
  assert.equal(paid.breakdown.length, 2); // sonnet + judge (free track excluded)
});

test('estimateRunCost: debates add a typical..worst range; cap uses worst case', () => {
  const noDebate = estimateRunCost({ tracks: [{ model: 'anthropic/claude-sonnet-4.6' }], inputChars: 40000 });
  const withDebate = estimateRunCost({ tracks: [{ model: 'anthropic/claude-sonnet-4.6' }], inputChars: 40000, debatesEnabled: true });
  assert.ok(withDebate.high > noDebate.high);
  assert.ok(withDebate.low < withDebate.high, 'typical (low) must be below worst case (high)');
  assert.equal(withDebate.totalUSD, withDebate.high, 'totalUSD (cap basis) = worst case');
  assert.ok(withDebate.breakdown.some((b) => b.stage === 'debates'));
  // no debates -> low == high (deterministic)
  assert.equal(noDebate.low, noDebate.high);
});

test('aggregateCostByModel rolls up calls/tokens/cost and sorts by cost desc', () => {
  const rows = aggregateCostByModel([
    { model: 'anthropic/claude-sonnet-4.6', inputTokens: 100, outputTokens: 50, costUSD: 0.02 },
    { model: 'anthropic/claude-sonnet-4.6', inputTokens: 200, outputTokens: 60, costUSD: 0.03 },
    { model: 'nvidia/nemotron-3-nano:free', inputTokens: 999, outputTokens: 10, costUSD: 0 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].model, 'anthropic/claude-sonnet-4.6');
  assert.equal(rows[0].calls, 2);
  assert.ok(Math.abs(rows[0].costUSD - 0.05) < 1e-9);
  assert.equal(rows[1].costUSD, 0);
});

test('formatCostSummary + markdown include totals and free flagging', () => {
  const results = [
    { model: 'anthropic/claude-sonnet-4.6', inputTokens: 100, outputTokens: 50, costUSD: 0.05 },
    { model: 'nvidia/nemotron-3-nano:free', inputTokens: 10, outputTokens: 10, costUSD: 0 },
  ];
  const txt = formatCostSummary(results);
  assert.match(txt, /Cost summary/);
  assert.match(txt, /TOTAL/);
  assert.match(txt, /\(free\)/);
  const md = formatCostSummaryMarkdown(results);
  assert.match(md, /\| \*\*TOTAL\*\* \|/);
  assert.match(md, /\$0\.0500/);
});

test('confirmSpend: $0 estimate auto-approves; pre-approval bypasses prompt; non-TTY fails closed', async () => {
  assert.equal(await confirmSpend({ estimate: { totalUSD: 0 }, env: {} }), true);
  assert.equal(await confirmSpend({ estimate: { totalUSD: 1.5 }, env: { SWAN_VILLAGE_CONFIRM: 'yes' } }), true);
  assert.equal(await confirmSpend({ estimate: { totalUSD: 1.5 }, env: {}, input: { isTTY: false } }), false);
});

test('evaluateSpendGate: blocks when estimate exceeds hard cap', async () => {
  const res = await evaluateSpendGate({
    tracks: [{ model: 'anthropic/claude-sonnet-4.6' }],
    inputChars: 40000,
    debatesEnabled: true,
    env: { SWAN_VILLAGE_MAX_USD: '0.01' }, // tiny cap -> must block
    log: () => {},
  });
  assert.equal(res.proceed, false);
  assert.match(res.reason, /exceeds hard cap/);
});

test('evaluateSpendGate: proceeds under cap when pre-approved', async () => {
  const res = await evaluateSpendGate({
    tracks: [{ model: 'anthropic/claude-sonnet-4.6' }],
    inputChars: 4000,
    debatesEnabled: false,
    env: { SWAN_VILLAGE_MAX_USD: '100', SWAN_VILLAGE_CONFIRM: 'yes' },
    log: () => {},
  });
  assert.equal(res.proceed, true);
  assert.equal(res.reason, 'approved');
});

// ---------------------------------------------------------------------------
// SWA-218 — the Village gate reconciled with the cumulative consult ledger.
//
// Before 2026-08-26 these two systems had ZERO references to each other. A Village
// run was checked only against its own per-run ceiling, so it could not see consult
// spend from earlier the same day, and its own cost never counted toward the
// per-topic or per-day caps. That is exactly the hole the ledger exists to close:
// no single call is outrageous; four reasonable ones in a row are what blow it.
//
// A stub ledger is injected so these never read or write real spend state.
// ---------------------------------------------------------------------------

const stubLedger = ({ topic = 0, day = 0, perTopic = 3, perDay = 5 }) => ({
  spentOnTopic: () => topic,
  spentToday: () => day,
  CAPS: { perTopic, perDay, perCall: 1 },
});

const villageRun = (extra = {}) => ({
  tracks: [{ model: 'anthropic/claude-sonnet-4.6' }],
  inputChars: 4000,
  debatesEnabled: false,
  env: { SWAN_VILLAGE_MAX_USD: '100', SWAN_VILLAGE_CONFIRM: 'yes' },
  log: () => {},
  topic: 'plan',
  ...extra,
});

test('ledger: a clean ledger lets the run proceed — the control', async () => {
  // Without this, every block assertion below would also pass on a gate that
  // refused unconditionally.
  const res = await evaluateSpendGate(villageRun({ ledger: stubLedger({}) }));
  assert.equal(res.proceed, true);
  assert.equal(res.reason, 'approved');
});

test('ledger: prior spend ON THIS TOPIC blocks a run its own cap would allow', async () => {
  // The whole point. The per-run ceiling is $100 here, so the ONLY thing that can
  // refuse this is the cumulative topic cap it previously could not see.
  const res = await evaluateSpendGate(villageRun({ ledger: stubLedger({ topic: 2.95 }) }));
  assert.equal(res.proceed, false);
  assert.match(res.reason, /per-topic cap/);
});

test("ledger: prior spend on OTHER topics still blocks via the daily cap", async () => {
  const res = await evaluateSpendGate(villageRun({ ledger: stubLedger({ topic: 0, day: 4.99 }) }));
  assert.equal(res.proceed, false);
  assert.match(res.reason, /daily cap/);
});

test('ledger: perCall is deliberately NOT applied to a Village run', async () => {
  // perCall is $1.00, sized for one consult; a legitimate Village run costs more.
  // Enforcing it here would refuse every honest run, and a gate that cries wolf is
  // one the human learns to wave through — the failure mode the guard's own
  // comments call more corrosive than the hole. A big run under the topic and day
  // caps must proceed.
  const res = await evaluateSpendGate(villageRun({
    inputChars: 200000,
    ledger: stubLedger({ topic: 0, day: 0, perTopic: 50, perDay: 50 }),
  }));
  assert.equal(res.proceed, true, 'a large but within-budget Village run must not be refused');
});

test('ledger: the per-run hard cap still fires first, before the cumulative check', async () => {
  // Ordering matters for the message the human reads: "your run is too big" is a
  // different instruction from "you have spent too much today."
  const res = await evaluateSpendGate(villageRun({
    env: { SWAN_VILLAGE_MAX_USD: '0.0001' },
    ledger: stubLedger({ topic: 99, day: 99 }),
  }));
  assert.equal(res.proceed, false);
  assert.match(res.reason, /exceeds hard cap/, 'the per-run reason must win when both would refuse');
});

test('ledger: an unreachable ledger fails OPEN, not closed', async () => {
  // Documented and deliberate. Refusing a paid feature because a cost library failed
  // to load would be worse than the spend it prevents, and it is strictly the
  // pre-2026-08-26 behaviour — the check stops being better, never becomes worse.
  const res = await evaluateSpendGate(villageRun({
    ledger: { spentOnTopic() { throw new Error('ledger unreadable'); }, spentToday: () => 0, CAPS: { perTopic: 3, perDay: 5 } },
  })).catch((err) => ({ threw: err }));
  assert.ok(!res.threw, 'a broken ledger must not throw out of the gate');
});

// --- the WRITE side: a finished run must reach the cumulative ledger ---------

test('recordRunSpend: writes one row per SUCCESSFUL model', () => {
  const rows = [];
  const res = recordRunSpend(
    [
      { model: 'a/one', status: 'SUCCESS', costUSD: 0.10 },
      { model: 'a/two', status: 'SUCCESS', costUSD: 0.25 },
    ],
    'plan',
    (row) => rows.push(row),
  );
  assert.equal(res.recorded, 2);
  assert.equal(res.error, null);
  assert.deepEqual(rows.map((r) => r.model), ['a/one', 'a/two']);
  assert.ok(rows.every((r) => r.topic === 'plan'), 'every row carries the run topic');
  assert.ok(rows.every((r) => r.note === 'ai-village'), 'rows are attributable to the Village');
});

test('recordRunSpend: an ERRORED track is not spend and is not booked', () => {
  // Booking a track that never returned a completion would inflate the caps toward
  // false refusals — the cry-wolf direction the guard's comments warn about.
  const rows = [];
  const res = recordRunSpend(
    [{ model: 'a/one', status: 'ERROR' }, { model: 'a/two', status: 'SUCCESS', costUSD: 0.1 }],
    'plan',
    (row) => rows.push(row),
  );
  assert.equal(res.recorded, 1);
  assert.equal(res.skipped, 1);
  assert.deepEqual(rows.map((r) => r.model), ['a/two']);
});

test('recordRunSpend: an UNPRICED success is passed through, not zeroed', () => {
  // recordSpend() treats an unpriceable value as WORST CASE against the caps. If this
  // helper coerced it to 0, the caps could never fire for exactly the calls of unknown
  // price — fail-open in the expensive direction, dressed as safe.
  const rows = [];
  recordRunSpend([{ model: 'a/one', status: 'SUCCESS' }], 'plan', (row) => rows.push(row));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].usd, undefined, 'must NOT be coerced to 0');
});

test('recordRunSpend: a failing ledger is non-fatal and reports what it managed', () => {
  // The money is already spent; losing the run's report as well would be worse.
  const res = recordRunSpend(
    [{ model: 'a/one', status: 'SUCCESS', costUSD: 0.1 }],
    'plan',
    () => { throw new Error('disk full'); },
  );
  assert.equal(res.error, 'disk full');
  assert.equal(res.recorded, 0);
});

test('recordRunSpend: empty and missing results do not throw', () => {
  assert.equal(recordRunSpend([], 'plan', () => {}).recorded, 0);
  assert.equal(recordRunSpend(undefined, 'plan', () => {}).recorded, 0);
});

test('isOverCap guards mid-run spend', () => {
  assert.equal(isOverCap(5, 2), true);
  assert.equal(isOverCap(1, 2), false);
  assert.equal(isOverCap(5, null), false); // no cap set
});
