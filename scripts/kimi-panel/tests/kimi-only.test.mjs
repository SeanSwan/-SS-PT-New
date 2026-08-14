/**
 * Direct Kimi K3 review tests: one source packet, one bounded model call, no panel dependency.
 * Run: node --test scripts/kimi-panel/tests/kimi-only.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KIMI_DIRECT_SEAT } from '../config.mjs';
import { runKimiOnly } from '../kimi-only.mjs';

const reply = JSON.stringify({ findings: [{
  path: 'docs/visualizer.md', startLine: 10, endLine: 12,
  claim: 'The proof slice does not demonstrate the claimed visual breadth.',
  severity: 'high', category: 'visual-fidelity',
  evidence: 'Only one of twenty declared scene families is runtime-ready.',
}] });

test('dry Kimi-only review reserves exactly one Kimi K3 call and executes nothing', async () => {
  let calls = 0;
  const run = await runKimiOnly({
    packet: 'safe visualizer evidence', documentPath: 'docs/visualizer.md',
    capUsd: 2.7, maxTokens: 8_000, confirmed: false,
    callModel: async () => { calls += 1; },
  });
  assert.equal(calls, 0);
  assert.equal(run.status, 'preflight-only');
  assert.equal(run.preflight.model, 'moonshotai/kimi-k3');
  assert.equal(run.preflight.maxMeteredCallCount, 1);
  assert.equal(run.preflight.allowed, true);
});

test('confirmed Kimi-only review returns strict findings and one receipt', async () => {
  const receipts = [];
  const run = await runKimiOnly({
    packet: 'safe visualizer evidence', documentPath: 'docs/visualizer.md',
    capUsd: 2.7, maxTokens: 8_000, confirmed: true,
    receiptSink: (receipt) => receipts.push(receipt),
    callModel: async ({ seat, prompt, maxTokens }) => {
      assert.equal(seat, KIMI_DIRECT_SEAT);
      assert.match(prompt, /INDEPENDENT blind reviewer/);
      assert.equal(maxTokens, 8_000);
      return { text: reply, inTok: 100, outTok: 100, cost: 0.01,
        wallMs: 2, model: seat.model, finishReason: 'stop' };
    },
  });
  assert.equal(run.status, 'complete');
  assert.equal(run.modelCallsExecuted, 1);
  assert.equal(run.final.verdict, 'REVISE');
  assert.equal(run.findings.length, 1);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].findingsRaised, 1);
});

test('Kimi-only cap blocks before the model call', async () => {
  let calls = 0;
  await assert.rejects(() => runKimiOnly({
    packet: 'safe visualizer evidence', documentPath: 'docs/visualizer.md',
    capUsd: 0.001, maxTokens: 8_000, confirmed: true,
    callModel: async () => { calls += 1; },
  }), /cap/i);
  assert.equal(calls, 0);
});
