/**
 * @file review-queue.test.mjs
 * @description Tests read-only, independent hostile-review job contracts.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { completeReview, enqueueReview } from './review-queue.mjs';

test('queued reviewers are independent and explicitly read-only', () => {
  assert.throws(() => enqueueReview({
    id: 'same', builder: 'agent-a', reviewer: 'agent-a', packetHash: 'a'.repeat(64),
    sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64), vantage: { reviewer: 'agent-a', mode: 'static' },
  }), /independent/i);
  const job = enqueueReview({
    id: 'R1', builder: 'agent-a', reviewer: 'agent-b', packetHash: 'a'.repeat(64),
    sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64), vantage: { reviewer: 'agent-b', mode: 'static' },
  });
  assert.equal(job.capabilities.write, false);
  assert.equal(job.status, 'QUEUED');
});

test('only the assigned reviewer can complete against the same source and scope', () => {
  const job = enqueueReview({
    id: 'R2', builder: 'agent-a', reviewer: 'agent-b', packetHash: 'a'.repeat(64),
    sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64), vantage: { reviewer: 'agent-b', mode: 'dynamic' },
  });
  assert.throws(() => completeReview(job, { actor: 'agent-c', outputHash: 'd'.repeat(64), findings: [] }), /assigned/i);
  assert.throws(() => completeReview(job, { actor: 'agent-b', outputHash: 'bad', findings: [] }), /hash/i);
  const complete = completeReview(job, { actor: 'agent-b', outputHash: 'd'.repeat(64), findings: [] });
  assert.equal(complete.status, 'COMPLETE');
  assert.equal(complete.sourceHash, job.sourceHash);
  assert.deepEqual(complete.findings, []);
});
