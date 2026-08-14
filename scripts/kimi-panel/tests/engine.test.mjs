/**
 * Runtime sequencing tests: blind parallel fanout, Kimi adjudication, aborts, and cap gates.
 * Run: node --test scripts/kimi-panel/tests/engine.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BLIND_PANEL_SEATS } from '../config.mjs';
import { runKimiPanel } from '../engine.mjs';

function reviewerReply(seat) {
  return JSON.stringify({ findings: [{
    path: `src/${seat.id}.ts`, startLine: 2, endLine: 3,
    claim: `${seat.lab} found a distinct issue.`, severity: 'medium',
    category: 'review', evidence: 'The packet supports this claim.',
  }] });
}

test('confirmed run fans ten blind prompts before Kimi sees original evidence and every finding', async () => {
  const calls = [];
  const receipts = [];
  const callModel = async ({ seat, prompt, findings }) => {
    calls.push({ seat, prompt });
    if (seat.stage === 'adjudication') {
      return { text: JSON.stringify({ overall: 'REVISE', verdicts: findings.map((item) => ({
        findingId: item.findingId,
        ruling: item === findings[0] ? 'NOT_REAL' : 'REAL',
        rationale: 'Verified against original evidence.',
      })) }), inTok: 100, outTok: 100, cost: 0.01, wallMs: 2, model: seat.model };
    }
    if (seat.stage === 'opus-verify') {
      return { text: JSON.stringify({ dismissals: findings.map((item) => ({
        findingId: item.findingId, verdict: 'UPHOLD_DISMISSAL', rationale: 'Source rechecked.',
      })) }), inTok: 50, outTok: 50, cost: 0.01, wallMs: 2, model: seat.model };
    }
    return { text: reviewerReply(seat), inTok: 10, outTok: 10,
      cost: seat.priceOutPerM === 0 ? 0 : 0.0001, wallMs: 1, model: seat.model };
  };
  const run = await runKimiPanel({
    packet: 'ORIGINAL VISUALIZER EVIDENCE', documentPath: 'docs/visualizer.md',
    opusSelfReview: true, capUsd: 5, confirmed: true, callModel,
    receiptSink: (receipt) => receipts.push(receipt),
  });
  assert.equal(calls.length, 13);
  assert.equal(calls[0].seat.stage, 'opus-first');
  assert.deepEqual(calls.slice(1, 11).map((call) => call.seat.model), BLIND_PANEL_SEATS.map((seat) => seat.model));
  for (const call of calls.slice(1, 11)) {
    assert.match(call.prompt, /ORIGINAL VISUALIZER EVIDENCE/);
    assert.doesNotMatch(call.prompt, /distinct issue/i, 'a blind reviewer saw another reviewer output');
  }
  assert.equal(calls[11].seat.stage, 'adjudication');
  assert.match(calls[11].prompt, /ORIGINAL VISUALIZER EVIDENCE/);
  for (const seat of BLIND_PANEL_SEATS) {
    assert.match(calls[11].prompt, new RegExp(seat.model.replaceAll('/', '\\/')));
  }
  assert.equal(calls[12].seat.stage, 'opus-verify');
  assert.equal(run.status, 'complete');
  assert.equal(run.adjudication.verdicts.length, 11, 'ten panel findings plus Opus first pass');
  assert.equal(run.final.verdict, 'REVISE', 'real findings prevent a false clean');
  assert.equal(run.spendUsd, 0.0211);
  assert.equal(receipts.length, 13);
  assert.deepEqual(receipts.map((receipt) => receipt.seat.stage), [
    'opus-first', ...Array(10).fill('fanout'), 'adjudication', 'opus-verify',
  ]);
  assert.ok(receipts.every((receipt) => Number.isInteger(receipt.findingsRaised)));
  const tokenAllocation = new Map(run.preflight.roster.map((entry) => [entry.id, entry.maxTokens]));
  assert.ok(receipts.every((receipt) => receipt.maxTokens === tokenAllocation.get(receipt.seat.id)),
    'receipts must preserve the exact per-seat allocation, not a default ceiling');
});

test('dry run executes no model calls', async () => {
  let calls = 0;
  const run = await runKimiPanel({ packet: 'safe', documentPath: 'docs/safe.md', capUsd: 5,
    confirmed: false, callModel: async () => { calls += 1; } });
  assert.equal(calls, 0);
  assert.equal(run.status, 'preflight-only');
  assert.equal(run.preflight.modelCallsExecuted, 0);
});

test('one failed blind reviewer aborts before Kimi and is never retried', async () => {
  const attempts = new Map();
  await assert.rejects(() => runKimiPanel({
    packet: 'safe', documentPath: 'docs/safe.md', capUsd: 5, confirmed: true,
    callModel: async ({ seat }) => {
      attempts.set(seat.id, (attempts.get(seat.id) ?? 0) + 1);
      if (seat.id === 'glm') throw new Error('provider unavailable');
      return { text: reviewerReply(seat), inTok: 1, outTok: 1, cost: 0.001, wallMs: 1, model: seat.model };
    },
  }), /fanout aborted/i);
  assert.equal(attempts.size, 11, 'Opus first plus all ten blind panel seats were attempted');
  assert.ok([...attempts.values()].every((count) => count === 1), 'a paid call was retried');
  assert.equal(attempts.has('kimi-adjudicator'), false);
});

test('HY3 preview failure uses full HY3 once, then mandatory Kimi adjudication continues', async () => {
  const calls = [];
  const callModel = async ({ seat, findings }) => {
    calls.push(seat);
    if (seat.id === 'hy3') {
      const error = new Error('preview unavailable');
      error.code = 'TRANSPORT';
      throw error;
    }
    if (seat.stage === 'adjudication') {
      return { text: JSON.stringify({ overall: 'REVISE', verdicts: findings.map((item) => ({
        findingId: item.findingId, ruling: 'REAL', rationale: 'Verified against evidence.',
      })) }), inTok: 1, outTok: 1, cost: 0.001, wallMs: 1, model: seat.model };
    }
    if (seat.stage === 'opus-verify') {
      return { text: JSON.stringify({ dismissals: [] }), inTok: 1, outTok: 1,
        cost: 0.001, wallMs: 1, model: seat.model };
    }
    return { text: reviewerReply(seat), inTok: 1, outTok: 1,
      cost: 0.000001, wallMs: 1, model: seat.model };
  };
  const run = await runKimiPanel({
    packet: 'safe visualizer evidence', documentPath: 'docs/safe.md', capUsd: 5,
    confirmed: true, callModel,
  });
  assert.equal(calls.filter((seat) => seat.id === 'hy3').length, 1);
  assert.equal(calls.filter((seat) => seat.id === 'hy3-full').length, 1);
  assert.equal(calls.filter((seat) => seat.id === 'kimi-adjudicator').length, 1);
  assert.equal(run.modelCallsExecuted, 14);
  assert.equal(run.status, 'complete');
});

test('a cap below conservative worst case blocks every call', async () => {
  let calls = 0;
  await assert.rejects(() => runKimiPanel({
    packet: 'safe', documentPath: 'docs/safe.md',
    capUsd: 0.01, confirmed: true, callModel: async () => { calls += 1; },
  }), /shared cap/i);
  assert.equal(calls, 0);
});

test('provider cost above its reserved max-price allocation is charged, receipted, and aborts', async () => {
  const receipts = [];
  await assert.rejects(() => runKimiPanel({
    packet: 'safe', documentPath: 'docs/safe.md', capUsd: 5, confirmed: true,
    receiptSink: (receipt) => receipts.push(receipt),
    callModel: async ({ seat }) => ({
      text: reviewerReply(seat), inTok: 1, outTok: 1, cost: 4.5, wallMs: 1, model: seat.model,
    }),
  }), /max-price estimate/i);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].result.cost, 4.5);
  assert.equal(receipts[0].errorCode, 'SPEND_CAP');
});
