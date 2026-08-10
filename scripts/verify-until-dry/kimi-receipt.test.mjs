/**
 * @file kimi-receipt.test.mjs
 * @description Tests exact packet-bound Kimi completion evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildKimiReceipt, validateKimiReceipt } from './kimi-receipt.mjs';

const packet = { hash: 'a'.repeat(64), headSha: 'f'.repeat(40),
  sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64),
  evidencePaths: ['src/state-machine.mjs'] };
const providerEvidence = {
  attemptId: 'approval-receipt-0001-1', generationId: 'gen-receipt-0001',
};

test('binds a clean Kimi output to model, packet, source, and scope', () => {
  const receipt = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64), text: 'VERDICT: CLEAN\nNo reproducible findings.', callCount: 1,
  }, packet);
  assert.equal(receipt.schema, 'verify-until-dry.kimi-receipt.v2');
  assert.equal(receipt.attemptId, 'approval-receipt-0001-1');
  assert.equal(receipt.generationId, 'gen-receipt-0001');
  const verified = validateKimiReceipt(receipt, { packet, model: 'moonshotai/kimi-k3' });
  assert.equal(verified.valid, true);
  assert.equal(verified.clean, true);
  assert.equal(verified.review.reviewer, 'kimi-k3');
});

test('tampering, source drift, revise, and malformed output fail closed', () => {
  const revise = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64), text: 'VERDICT: REVISE\nRace found.', callCount: 1,
  }, packet);
  assert.equal(validateKimiReceipt(revise, { packet, model: 'moonshotai/kimi-k3' }).clean, false);
  assert.equal(validateKimiReceipt(revise, {
    packet: { ...packet, sourceHash: 'e'.repeat(64) }, model: 'moonshotai/kimi-k3',
  }).valid, false);
  const tampered = structuredClone(revise);
  tampered.output = 'VERDICT: CLEAN';
  assert.equal(validateKimiReceipt(tampered, { packet, model: 'moonshotai/kimi-k3' }).valid, false);
});

test('a contradictory CLEAN Kimi body is malformed and cannot become a clean review', () => {
  const receipt = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64),
    text: 'VERDICT: CLEAN\nSEVERITY: HIGH\nFINDING: division by zero is reproducible.', callCount: 1,
  }, packet);
  const verified = validateKimiReceipt(receipt, { packet, model: 'moonshotai/kimi-k3' });
  assert.equal(verified.valid, true);
  assert.equal(verified.clean, false);
  assert.equal(verified.review.clean, false);
});

test('parses the canonical consult launcher envelope before a REVISE verdict', () => {
  const text = [
    '# SwanStudios Kimi K3 Design Review',
    '',
    '**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)',
    '**Document:** C:\\Temp\\packet.md',
    '**Seed:** (none)',
    '**Tokens:** 10 in / 20 out | **Cost:** ~$0.0003 | **Wall:** 1.0s | **finish_reason:** stop',
    '',
    '---',
    '',
    'VERDICT: REVISE',
    'Race found.',
  ].join('\n');
  const receipt = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64), text, callCount: 1,
  }, packet);
  const verified = validateKimiReceipt(receipt, { packet, model: 'moonshotai/kimi-k3' });
  assert.equal(receipt.decision, 'REVISE');
  assert.equal(verified.valid, true);
  assert.equal(verified.clean, false);
});

test('parses a canonical consult envelope without allowing arbitrary pre-verdict findings', () => {
  const envelope = [
    '# SwanStudios Kimi K3 Design Review',
    '**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)',
    '**Document:** C:\\Temp\\packet.md',
    '**Seed:** (none)',
    '**Tokens:** 10 in / 20 out | **Cost:** ~$0.0003 | **Wall:** 1.0s | **finish_reason:** stop',
    '---',
  ];
  const clean = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64), text: [...envelope, 'VERDICT: CLEAN', 'No reproducible findings.'].join('\n'),
    callCount: 1,
  }, packet);
  assert.equal(validateKimiReceipt(clean, { packet, model: 'moonshotai/kimi-k3' }).clean, true);

  const spoof = buildKimiReceipt({
    ...providerEvidence,
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64),
    text: ['FINDING: hidden defect', 'VERDICT: CLEAN', 'No reproducible findings.'].join('\n'),
    callCount: 1,
  }, packet);
  assert.equal(validateKimiReceipt(spoof, { packet, model: 'moonshotai/kimi-k3' }).clean, false);
});
