/**
 * @file review-record.test.mjs
 * @description Tests CLI capture of output-bound independent review evidence.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { commandRecordReview } from './cli.mjs';
import { appendEvent, canonicalJson, sha256 } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';

test('records captured review output instead of accepting naked vantages', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-record-'));
  try {
    const headSha = 'a'.repeat(40);
    const sourceHash = 'b'.repeat(64);
    const scopeContract = { tier: 0, surfaces: ['docs'], paths: ['docs/a.md'] };
    const scopeHash = sha256(canonicalJson(scopeContract));
    const requiredGates = ['diff-check', 'verifier-tests', 'secret-scan'];
    const gates = {};
    let ledger = appendEvent([], { type: 'snapshot', headSha, sourceHash, scopeHash });
    for (const [index, id] of requiredGates.entries()) {
      gates[id] = { status: 'pass', current: true, outputHash: String(index + 1).repeat(64), exitCode: 0 };
      ledger = appendEvent(ledger, { type: 'gate', gateId: id, ...gates[id] });
    }
    const receipt = buildReceipt({
      tier: 0, headSha, sourceHash, scopeHash, scopeContract, reviewedScopeHash: scopeHash,
      reviewPacketHash: 'c'.repeat(64), requiredGates, gates, ledger,
    });
    writeFileSync(join(root, 'receipt.json'), JSON.stringify(receipt));
    writeFileSync(join(root, 'review.txt'), 'VERDICT: CLEAN\nNo reproducible findings.');
    const artifact = commandRecordReview(root, {
      receipt: 'receipt.json', input: 'review.txt', reviewer: 'reviewer-a',
      axes: 'static-control-flow', findings: null, reviews: null, out: 'reviews.json',
    });
    assert.equal(artifact.reviews[0].clean, true);
    assert.match(readFileSync(join(root, 'reviews.json'), 'utf8'), /reviewer-a/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
