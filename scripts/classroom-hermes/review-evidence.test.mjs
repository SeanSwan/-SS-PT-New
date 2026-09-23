/** Deterministic evidence lock for the completed Claude five-model panel. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { verifyReviewEvidence } from './review-evidence.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

test('panel receipts, spend, packet hash, ledger counts, and blueprint cap agree', () => {
  const receipt = verifyReviewEvidence(repoRoot);
  assert.equal(receipt.ok, true, JSON.stringify(receipt.failures, null, 2));
  assert.equal(receipt.packetSha256, 'FF09857BBDD5D86563AC1FA13CBB4ADA26C1DE04E1B16C43F7F1C31855061AE5');
  assert.equal(receipt.openRouterSpendUsd, 0.9915);
  assert.deepEqual(receipt.verdictCounts, { REVISE: 4 });
  assert.deepEqual(receipt.decisionCounts, {
    ADOPT: 22,
    REJECT: 2,
    DEFER: 2,
    NEEDS_PROBE: 4,
  });
  assert.equal(receipt.blueprintLineCount <= 300, true);
});
