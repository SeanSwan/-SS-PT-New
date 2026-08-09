/**
 * @file review-queue.mjs
 * @description Immutable contracts for independent, read-only hostile-review jobs.
 */
const HASH = /^[a-f0-9]{64}$/;

function requireHash(value, label) {
  if (!HASH.test(String(value ?? ''))) throw new Error(`${label} must be a SHA-256 hash`);
}

export function enqueueReview(input = {}) {
  if (!input.id || !input.builder || !input.reviewer) throw new Error('Review id, builder, and reviewer are required');
  if (input.builder === input.reviewer) throw new Error('Hostile review requires an independent reviewer');
  requireHash(input.packetHash, 'Packet hash');
  requireHash(input.sourceHash, 'Source hash');
  requireHash(input.scopeHash, 'Scope hash');
  if (!input.vantage || Object.keys(input.vantage).length < 2) {
    throw new Error('Review vantage must name at least two independent axes');
  }
  return Object.freeze({
    id: input.id,
    builder: input.builder,
    reviewer: input.reviewer,
    packetHash: input.packetHash,
    sourceHash: input.sourceHash,
    scopeHash: input.scopeHash,
    vantage: Object.freeze({ ...input.vantage }),
    capabilities: Object.freeze({ read: true, write: false, executeUntrusted: false }),
    status: 'QUEUED',
  });
}

export function completeReview(job, result = {}) {
  if (job?.status !== 'QUEUED') throw new Error('Only queued reviews can complete');
  if (result.actor !== job.reviewer) throw new Error('Only the assigned reviewer can complete this job');
  requireHash(result.outputHash, 'Review output hash');
  if (!Array.isArray(result.findings)) throw new Error('Review findings must be an array');
  return Object.freeze({
    ...job,
    status: 'COMPLETE',
    outputHash: result.outputHash,
    findings: Object.freeze(result.findings.map((finding) => Object.freeze({ ...finding }))),
  });
}
