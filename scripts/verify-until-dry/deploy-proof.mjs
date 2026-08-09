/**
 * @file deploy-proof.mjs
 * @description Binds remote main, Render deployment, and health evidence to one commit.
 */
import { canonicalJson, sha256 } from './ledger.mjs';

const COMMIT = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;

function requireCommit(value, label) {
  if (!COMMIT.test(String(value ?? ''))) throw new Error(`${label} commit SHA is invalid`);
}

export function buildDeployProof(input = {}) {
  requireCommit(input.expectedCommit, 'Expected');
  requireCommit(input.remoteMainSha, 'Remote main');
  requireCommit(input.deploy?.commitSha, 'Render deploy');
  if (!input.deploy?.id) throw new Error('Render deploy id is required');
  if (!HASH.test(String(input.health?.bodyHash ?? '')) || !input.health?.observedAt) {
    throw new Error('Health evidence needs a body hash and observation timestamp');
  }
  const reasons = [];
  if (input.remoteMainSha !== input.expectedCommit) reasons.push('remote-main-mismatch');
  if (input.deploy.commitSha !== input.expectedCommit) reasons.push('render-commit-mismatch');
  if (input.deploy.status !== 'live') reasons.push('render-deploy-not-live');
  if (input.health.statusCode < 200 || input.health.statusCode >= 300) reasons.push('health-probe-failed');
  const proof = {
    schema: 'verify-until-dry.deploy-proof.v1',
    status: reasons.length ? 'UNPROVEN' : 'PROVEN',
    reasons,
    expectedCommit: input.expectedCommit,
    remoteMainSha: input.remoteMainSha,
    deploy: { ...input.deploy },
    health: { ...input.health },
  };
  return Object.freeze({ ...proof, proofHash: sha256(canonicalJson(proof)) });
}
