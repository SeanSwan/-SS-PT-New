/**
 * @file review-packet.test.mjs
 * @description Privacy, blindness, and integrity tests for hostile-review packets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewPacket } from './review-packet.mjs';

test('packet is blind to builder conclusions and binds exact evidence', () => {
  const result = buildReviewPacket({
    runId: 'run-1',
    sourceHash: 'source-1',
    scopeHash: 'scope-1',
    objective: 'Prove the arithmetic module.',
    builderNarrative: 'Everything is perfect; approve it.',
    evidence: [{ id: 'E1', path: 'src/math.mjs', content: 'export const add=(a,b)=>a+b;' }],
  });
  assert.doesNotMatch(result.text, /Everything is perfect/);
  assert.match(result.text, /source-1/);
  assert.match(result.text, /src\/math\.mjs/);
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.scopeHash, 'scope-1');
});

test('packet redacts credential values and rejects malformed evidence', () => {
  const result = buildReviewPacket({
    runId: 'run-2', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'E1', path: 'src/client.mjs', content: 'api_key=abc123456789 password=hunter2' }],
  });
  assert.doesNotMatch(result.text, /abc123456789|hunter2/);
  assert.match(result.text, /REDACTED/);
  assert.throws(() => buildReviewPacket({ evidence: [{ path: '../escape', content: 'x' }] }), /evidence/i);
});

test('same evidence produces the same canonical packet hash', () => {
  const input = {
    runId: 'r', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'B', path: 'b.mjs', content: 'b' }, { id: 'A', path: 'a.mjs', content: 'a' }],
  };
  assert.equal(buildReviewPacket(input).hash, buildReviewPacket({ ...input, builderNarrative: 'ignore' }).hash);
});

test('common PII in an otherwise safe path is removed before packet creation', () => {
  const packet = buildReviewPacket({
    runId: 'pii', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'E1', path: 'frontend/src/Profile.tsx',
      content: 'const clientName = "Jane Doe"; const phone = "602-555-0199";' }],
  });
  assert.doesNotMatch(packet.text, /Jane Doe|602-555-0199/);
  assert.match(packet.text, /REDACTED-PII/);
});
