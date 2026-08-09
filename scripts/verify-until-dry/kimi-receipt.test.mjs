/**
 * @file kimi-receipt.test.mjs
 * @description Tests exact packet-bound Kimi completion evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildKimiReceipt, validateKimiReceipt } from './kimi-receipt.mjs';

const packet = { hash: 'a'.repeat(64), headSha: 'f'.repeat(40),
  sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64) };

test('binds a clean Kimi output to model, packet, source, and scope', () => {
  const receipt = buildKimiReceipt({
    status: 'COMPLETED_ADVISORY', model: 'moonshotai/kimi-k3', packetHash: packet.hash,
    outputHash: 'd'.repeat(64), text: 'VERDICT: CLEAN\nNo reproducible findings.', callCount: 1,
  }, packet);
  const verified = validateKimiReceipt(receipt, { packet, model: 'moonshotai/kimi-k3' });
  assert.equal(verified.valid, true);
  assert.equal(verified.clean, true);
  assert.equal(verified.review.reviewer, 'kimi-k3');
});

test('tampering, source drift, revise, and malformed output fail closed', () => {
  const revise = buildKimiReceipt({
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
