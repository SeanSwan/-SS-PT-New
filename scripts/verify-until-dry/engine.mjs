/**
 * @file engine.mjs
 * @description Orchestrates a deterministic verification pass without granting CLEAN itself.
 */
import { appendEvent } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';
import { captureSnapshot } from './snapshot.mjs';
import { createFence, disposeFence, runGates } from './fenced-runner.mjs';
import { selectGates } from './gate-registry.mjs';

const GATE_ID = /^[a-z][a-z0-9-]*$/;
const GATE_STATUSES = new Set(['passed', 'failed']);

export async function runDeterministicPass(input) {
  const capture = input.capture ?? ((args) => captureSnapshot(args));
  const select = input.select ?? selectGates;
  const create = input.create ?? createFence;
  const run = input.run ?? runGates;
  const dispose = input.dispose ?? disposeFence;
  const snapshot = input.snapshot ?? capture({ cwd: input.repoRoot, scopeContract: input.scopeContract });
  const selected = select({ tier: input.tier, surfaces: input.surfaces });
  const selectedIds = selected.map((gate) => gate.id);
  if (selectedIds.some((id) => typeof id !== 'string' || !GATE_ID.test(id))) {
    throw new Error('Selected gate identity is invalid');
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Selected gate identities must be unique');
  }
  const fence = create({
    repoRoot: input.repoRoot,
    snapshot,
    scopeContract: input.scopeContract,
  });
  let results;
  let primaryError = null;
  try {
    results = await run({
      fencePath: fence.path,
      expectedSourceHash: snapshot.sourceHash,
      scopeContract: input.scopeContract,
      gates: selected,
    });
  } catch (error) {
    primaryError = error;
  }
  let cleanupError = null;
  try {
    dispose(fence);
  } catch (error) {
    cleanupError = error;
  }
  if (primaryError && cleanupError) {
    throw new AggregateError(
      [primaryError, cleanupError],
      'Gate execution and fence cleanup both failed',
      { cause: primaryError },
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;

  if (!Array.isArray(results)) throw new Error('Gate result collection is invalid');
  const resultCount = results.length;
  if (resultCount !== selected.length) {
    throw new Error('Gate result count mismatch');
  }
  const stableResults = Object.freeze(Array.from({ length: resultCount }, (_, index) => {
    const result = results[index];
    return Object.freeze({
      gateId: result?.gateId, status: result?.status,
      outputHash: result?.outputHash, exitCode: result?.exitCode,
    });
  }));
  // runGates is sequential; receipt evidence intentionally binds this exact order.
  for (let index = 0; index < stableResults.length; index += 1) {
    const result = stableResults[index];
    if (!GATE_STATUSES.has(result.status)) throw new Error('Gate result status is invalid');
    if (result.exitCode !== undefined && (!Number.isInteger(result.exitCode) || result.exitCode < 0)) {
      throw new Error('Gate result exit code is invalid');
    }
    if (result.exitCode !== undefined && ((result.status === 'passed') !== (result.exitCode === 0))) {
      throw new Error('Gate result exit code contradicts status');
    }
    if (!selectedIds.includes(result.gateId)) {
      throw new Error('Gate result identity mismatch');
    }
    if (result.gateId !== selectedIds[index]) throw new Error('Gate result order mismatch');
  }

  let ledger = appendEvent([], {
    type: 'snapshot',
    headSha: snapshot.headSha,
    sourceHash: snapshot.sourceHash,
    scopeHash: snapshot.scopeHash,
  });
  const gates = Object.create(null);
  for (const result of stableResults) {
    gates[result.gateId] = {
      status: result.status === 'passed' ? 'pass' : 'fail',
      current: true,
      outputHash: result.outputHash,
      exitCode: result.exitCode ?? (result.status === 'passed' ? 0 : 1),
    };
    ledger = appendEvent(ledger, { type: 'gate', gateId: result.gateId, ...gates[result.gateId] });
  }
  return buildReceipt({
    tier: input.tier,
    headSha: snapshot.headSha,
    sourceHash: snapshot.sourceHash,
    scopeHash: snapshot.scopeHash,
    reviewedScopeHash: input.reviewedScopeHash ?? snapshot.scopeHash,
    reviewPacketHash: input.reviewPacketHash ?? null,
    scopeContract: input.scopeContract,
    requiredGates: selected.map((gate) => gate.id),
    gates,
    findings: input.findings ?? [],
    blockers: input.blockers ?? [],
    escalations: input.escalations ?? [],
    vantages: input.vantages ?? [],
    reviews: input.reviews ?? [],
    ledger,
  });
}
