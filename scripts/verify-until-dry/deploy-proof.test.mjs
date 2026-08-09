/**
 * @file deploy-proof.test.mjs
 * @description Tests exact commit-to-Render-to-health deployment evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeployProof, collectDeployProof } from './deploy-proof.mjs';

const commit = 'a'.repeat(40);
const healthHash = 'b'.repeat(64);

test('proves deployment only when remote, Render, and health bind to one commit', () => {
  const proof = buildDeployProof({
    expectedCommit: commit, serviceId: 'srv-1',
    remoteMainSha: commit,
    deploy: { id: 'dep-1', serviceId: 'srv-1', commitSha: commit, status: 'live' },
    health: { statusCode: 200, bodyHash: healthHash, observedAt: '2026-08-09T12:00:00Z', url: 'https://example.test/health' },
  });
  assert.equal(proof.status, 'CLAIM_VALID');
  assert.match(proof.proofHash, /^[a-f0-9]{64}$/);
});

test('commit drift, non-live deploys, and unhealthy probes remain UNPROVEN', () => {
  const base = {
    expectedCommit: commit, remoteMainSha: commit, serviceId: 'srv-1',
    deploy: { id: 'dep-1', serviceId: 'srv-1', commitSha: commit, status: 'live' },
    health: { statusCode: 200, bodyHash: healthHash, observedAt: '2026-08-09T12:00:00Z', url: 'https://example.test/health' },
  };
  assert.deepEqual(buildDeployProof({ ...base, remoteMainSha: 'c'.repeat(40) }).reasons, ['remote-main-mismatch']);
  assert.ok(buildDeployProof({ ...base, deploy: { ...base.deploy, status: 'failed' } }).reasons.includes('render-deploy-not-live'));
  assert.ok(buildDeployProof({ ...base, health: { ...base.health, statusCode: 503 } }).reasons.includes('health-probe-failed'));
});

test('missing hashes and timestamps fail closed', () => {
  assert.throws(() => buildDeployProof({ expectedCommit: 'short' }), /commit/i);
  assert.throws(() => buildDeployProof({
    expectedCommit: commit, remoteMainSha: commit, serviceId: 'srv-1',
    deploy: { id: 'd', serviceId: 'srv-1', commitSha: commit, status: 'live' },
    health: { statusCode: 200, bodyHash: 'bad' },
  }), /health/i);
});

test('caller-injected acquisition remains advisory and can never emit PROVEN', async () => {
  const proof = await collectDeployProof({
    expectedCommit: commit, serviceId: 'srv-1', healthUrl: 'https://example.test/health',
    now: '2026-08-09T12:00:00Z', observeRemoteMain: async () => commit,
    observeDeploy: async () => ({ id: 'dep-1', serviceId: 'srv-1', commitSha: commit, status: 'live' }),
    observeHealth: async () => ({ statusCode: 200, body: 'ok' }),
  });
  assert.equal(proof.status, 'OBSERVED_ADVISORY');
  assert.notEqual(proof.status, 'PROVEN');
  await assert.rejects(() => collectDeployProof({ expectedCommit: commit }), /requires/i);
});
