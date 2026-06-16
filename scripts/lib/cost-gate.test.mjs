/**
 * Tests for the Cost Gate module.
 * Run: node --test scripts/lib/cost-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceFor,
  resolveBudget,
  estimateRunCost,
  aggregateCostByModel,
  formatCostSummary,
  formatCostSummaryMarkdown,
  confirmSpend,
  evaluateSpendGate,
  isOverCap,
} from './cost-gate.mjs';

test('priceFor: known paid, free, and runtime-injected models', () => {
  assert.deepEqual(priceFor('anthropic/claude-sonnet-4.6'), { in: 3.0, out: 15.0 });
  assert.deepEqual(priceFor('nvidia/nemotron-3-nano-30b-a3b:free'), { in: 0, out: 0 });
  assert.deepEqual(priceFor('anthropic/claude-opus-4.8', { 'anthropic/claude-opus-4.8': { in: 5, out: 25 } }), { in: 5, out: 25 });
});

test('resolveBudget reads cap + pre-approval from env', () => {
  assert.deepEqual(resolveBudget({ SWAN_VILLAGE_MAX_USD: '2.50', SWAN_VILLAGE_CONFIRM: 'yes' }), { capUSD: 2.5, preApproved: true });
  assert.deepEqual(resolveBudget({}), { capUSD: null, preApproved: false });
  assert.deepEqual(resolveBudget({ SWAN_VILLAGE_MAX_USD: 'bogus' }), { capUSD: null, preApproved: false });
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

test('isOverCap guards mid-run spend', () => {
  assert.equal(isOverCap(5, 2), true);
  assert.equal(isOverCap(1, 2), false);
  assert.equal(isOverCap(5, null), false); // no cap set
});
