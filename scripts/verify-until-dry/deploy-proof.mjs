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
  if (!input.deploy?.id || !input.deploy?.serviceId || input.deploy.serviceId !== input.serviceId) {
    throw new Error('Exact Render service and deploy ids are required');
  }
  if (!HASH.test(String(input.health?.bodyHash ?? '')) || !input.health?.observedAt) {
    throw new Error('Health evidence needs a body hash and observation timestamp');
  }
  if (!Number.isFinite(Date.parse(input.health.observedAt)) ||
      !/^https:\/\//i.test(String(input.health.url ?? ''))) {
    throw new Error('Health evidence needs a valid timestamp and HTTPS URL');
  }
  const reasons = [];
  if (input.remoteMainSha !== input.expectedCommit) reasons.push('remote-main-mismatch');
  if (input.deploy.commitSha !== input.expectedCommit) reasons.push('render-commit-mismatch');
  if (input.deploy.status !== 'live') reasons.push('render-deploy-not-live');
  if (input.health.statusCode < 200 || input.health.statusCode >= 300) reasons.push('health-probe-failed');
  const proof = {
    schema: 'verify-until-dry.deploy-proof.v1',
    status: reasons.length ? 'UNPROVEN' : 'CLAIM_VALID',
    reasons,
    expectedCommit: input.expectedCommit,
    remoteMainSha: input.remoteMainSha,
    serviceId: input.serviceId,
    deploy: { ...input.deploy },
    health: { ...input.health },
  };
  return Object.freeze({ ...proof, proofHash: sha256(canonicalJson(proof)) });
}

/** Acquire advisory observations through caller-supplied Git, Render, and HTTPS adapters. */
export async function collectDeployProof(input = {}) {
  for (const name of ['observeRemoteMain', 'observeDeploy', 'observeHealth']) {
    if (typeof input[name] !== 'function') throw new Error(`Deploy collector requires ${name}`);
  }
  const remoteMainSha = await input.observeRemoteMain();
  const deploy = await input.observeDeploy(input.serviceId);
  const healthRaw = await input.observeHealth(input.healthUrl);
  const observedAt = input.now ?? new Date().toISOString();
  const claim = buildDeployProof({
    expectedCommit: input.expectedCommit, remoteMainSha, serviceId: input.serviceId, deploy,
    health: { statusCode: healthRaw.statusCode, bodyHash: sha256(healthRaw.body),
      observedAt, url: input.healthUrl },
  });
  const proof = { ...claim, status: claim.reasons.length ? 'UNPROVEN' : 'OBSERVED_ADVISORY',
    acquisition: { remote: 'caller-injected', render: 'caller-injected', health: 'caller-injected' } };
  return Object.freeze({ ...proof, proofHash: sha256(canonicalJson({ ...proof, proofHash: undefined })) });
}
