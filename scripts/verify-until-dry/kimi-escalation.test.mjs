/**
 * @file kimi-escalation.test.mjs
 * @description Tests Kimi K3 selection, ceiling, authorization, cap, and no-retry rules.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../../config/verify-until-dry.config.mjs';
import { executeKimiReview, dispatchKimi, planKimiReview } from './kimi-escalation.mjs';

const packet = { hash: 'a'.repeat(64), sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64),
  text: 'Pure state-machine logic.', evidencePaths: ['src/state-machine.mjs'] };
const approval = (extra = {}) => ({
  mode: 'exact-run', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
  sourceHash: packet.sourceHash, scopeHash: packet.scopeHash, maxUsd: config.kimi.maxUsdPerCall,
  nonce: 'approval-nonce-0001', expiresAt: '2099-01-01T00:00:00Z', ...extra,
});

test('not-required work does not manufacture a paid call', () => {
  const plan = planKimiReview({ required: false, packet, config });
  assert.equal(plan.status, 'NOT_REQUIRED');
  assert.equal(plan.callCount, 0);
});

test('required exact-run review blocks until approval matches packet and cap', () => {
  const blocked = planKimiReview({ required: true, packet, config });
  assert.equal(blocked.status, 'BLOCKED_AUTHORIZATION');
  assert.equal(blocked.preflight.model, 'moonshotai/kimi-k3');
  assert.equal(blocked.preflight.maxTokens, 60_000);
  assert.ok(blocked.preflight.worstCaseUsd <= config.kimi.maxUsdPerCall);

  const ready = planKimiReview({
    required: true, packet, config,
    approval: approval(),
  });
  assert.equal(ready.status, 'READY');
  assert.equal(ready.command.args[ready.command.args.indexOf('--max-tokens') + 1], '60000');
});

test('a packet above the committed worst-case cap reports cost blocking', () => {
  const oversized = { ...packet, text: 'x'.repeat(2_000_000) };
  const plan = planKimiReview({ required: true, packet: oversized, config });
  assert.equal(plan.status, 'BLOCKED_COST_CAP');
  assert.ok(plan.preflight.worstCaseUsd > config.kimi.maxUsdPerCall);
});

test('design-ceiling policy blocks sensitive Kimi evidence with no override', () => {
  const sensitive = { ...packet, evidencePaths: ['backend/routes/authRoutes.mjs'] };
  const plan = planKimiReview({
    required: true, packet: sensitive, config,
    approval: { packetHash: sensitive.hash, maxUsd: 1 },
  });
  assert.equal(plan.status, 'BLOCKED_CEILING');
  assert.equal(plan.callCount, 0);
});

test('environment model overrides cannot silently replace Kimi K3', () => {
  const before = process.env.SWAN_KIMI_MODEL;
  process.env.SWAN_KIMI_MODEL = 'moonshotai/not-kimi-k3';
  try {
    const plan = planKimiReview({ required: true, packet, config });
    assert.equal(plan.status, 'BLOCKED_MODEL_DRIFT');
    assert.equal(plan.callCount, 0);
  } finally {
    if (before === undefined) delete process.env.SWAN_KIMI_MODEL;
    else process.env.SWAN_KIMI_MODEL = before;
  }
});

test('standing mode dispatches automatically only inside an unexpired scoped grant', () => {
  const standing = structuredClone(config);
  standing.kimi.approvalMode = 'standing';
  const scopedPacket = { ...packet, scopeHash: 'b'.repeat(64) };
  const approval = {
    mode: 'standing',
    model: 'moonshotai/kimi-k3',
    scopeHash: scopedPacket.scopeHash,
    maxUsdPerCall: 1,
    remainingCalls: 1,
    callNumber: 1,
    nonce: 'standing-nonce-0001',
    remainingUsd: 2,
    expiresAt: '2026-08-10T00:00:00Z',
  };
  assert.equal(planKimiReview({
    required: true, packet: scopedPacket, config: standing, approval, now: '2026-08-09T12:00:00Z',
  }).status, 'READY');
  assert.equal(planKimiReview({
    required: true, packet: scopedPacket, config: standing, approval, now: '2026-08-11T00:00:00Z',
  }).status, 'BLOCKED_AUTHORIZATION');
});

test('dispatcher makes one call only and never retries a failure', async () => {
  const ready = planKimiReview({
    required: true, packet, config,
    approval: approval({ nonce: 'approval-nonce-0002' }),
  });
  let calls = 0;
  await assert.rejects(dispatchKimi(ready, async () => { calls += 1; throw new Error('provider down'); }), /provider down/);
  assert.equal(calls, 1);
  await assert.rejects(dispatchKimi(ready, async () => { calls += 1; }), /consumed/i);
  assert.equal(calls, 1);
});

test('approved execution materializes one temp packet and returns hashed advisory output', async () => {
  const ready = planKimiReview({
    required: true, packet, config,
    approval: approval({ nonce: 'approval-nonce-0003' }),
  });
  let calls = 0;
  const result = await executeKimiReview({
    plan: ready,
    packet,
    consume: () => {},
    execute: async (command) => {
      calls += 1;
      const packetPath = command.args[command.args.indexOf('--document') + 1];
      const outputPath = command.args[command.args.indexOf('--out') + 1];
      assert.match(packetPath, /verify-kimi-/);
      const { readFileSync, writeFileSync } = await import('node:fs');
      assert.equal(readFileSync(packetPath, 'utf8'), packet.text);
      writeFileSync(outputPath, 'VERDICT: CLEAN\nNo reproducible findings.\n');
      return { code: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'COMPLETED_ADVISORY');
  assert.match(result.outputHash, /^[a-f0-9]{64}$/);
});
