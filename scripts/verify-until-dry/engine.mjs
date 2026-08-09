/**
 * @file engine.mjs
 * @description Orchestrates a deterministic verification pass without granting CLEAN itself.
 */
import { appendEvent } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';
import { captureSnapshot } from './snapshot.mjs';
import { createFence, disposeFence, runGates } from './fenced-runner.mjs';
import { selectGates } from './gate-registry.mjs';

export async function runDeterministicPass(input) {
  const capture = input.capture ?? ((args) => captureSnapshot(args));
  const select = input.select ?? selectGates;
  const create = input.create ?? createFence;
  const run = input.run ?? runGates;
  const dispose = input.dispose ?? disposeFence;
  const snapshot = input.snapshot ?? capture({ cwd: input.repoRoot, scopeContract: input.scopeContract });
  const selected = select({ tier: input.tier, surfaces: input.surfaces });
  const fence = create({
    repoRoot: input.repoRoot,
    snapshot,
    scopeContract: input.scopeContract,
  });
  let results;
  try {
    results = await run({
      fencePath: fence.path,
      expectedSourceHash: snapshot.sourceHash,
      scopeContract: input.scopeContract,
      gates: selected,
    });
  } finally {
    dispose(fence);
  }

  let ledger = appendEvent([], {
    type: 'snapshot',
    headSha: snapshot.headSha,
    sourceHash: snapshot.sourceHash,
    scopeHash: snapshot.scopeHash,
  });
  const gates = {};
  for (const result of results) {
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
