/**
 * contractSuites.list — which dependency-free suites this gate runs, and why each one exists.
 * @module scripts/swan-brain-console/contractSuites.list
 *
 * WHY THIS IS A SEPARATE FILE FROM `contractSuites.mjs`
 * The eighth Rule 4 split in this subsystem, and the one the module it came out of had already
 * described: *"The list itself was never the problem; the problem was that nothing checked it
 * against reality."* Those are two subjects. This file is the list — one entry per suite, each
 * carrying the review round, the finding it answers and the mutation that would expose it,
 * because an entry with no rationale is an entry nobody can retire. `contractSuites.mjs` is the
 * check over it.
 *
 * They also fail differently, which is why they must be able to fail separately: a wrong entry
 * here is a stale claim about one suite, while a wrong `missingSuites()` there means the gate
 * silently stopped running something. Round 16 added two suites to a file that was already at
 * 315 lines, and the honest options were to split it or to declare a Rule 4 exception for a
 * breach this round created. `lineBudget.test.mjs` caps that exception list at two entries and
 * calls a budget that porous no budget at all, so: split.
 *
 * BOUNDS: data only. No imports, no I/O, no clock — importing this file cannot do anything.
 */
/**
 * Every dependency-free suite this gate is responsible for, named explicitly so the run is
 * deterministic — no glob ordering, no shell differences between CI and a workstation.
 *
 * Adding a `*.test.mjs` under an owned root WITHOUT adding it here fails stage 3 of
 * `npm run verify`. That is the point: the list is still explicit and reviewable, but it can
 * no longer be silently incomplete.
 */
export const NODE_CONTRACT_SUITES = Object.freeze([
  'scripts/swan-brain-console/engine-contract.test.mjs',
  'scripts/swan-brain-console/server-contract.test.mjs',
  'scripts/swan-brain-console/hostGuard.test.mjs',
  'scripts/swan-brain-console/buildIdentity.test.mjs',
  'scripts/swan-brain-console/lineBudget.test.mjs',
  'scripts/swan-brain-console/serverBoot.test.mjs',
  'scripts/swan-brain-console/gateHealth.test.mjs',
  'scripts/swan-brain-console/gateHealth.summary.test.mjs',
  'scripts/swan-brain-console/verifyTarget.test.mjs',
  'scripts/swan-brain-console/verifyReport.test.mjs',
  'scripts/swan-brain-console/harnessIdentity.test.mjs',
  'scripts/swan-brain-console/shot-diff.test.mjs',
  'scripts/swan-brain-console/contractSuites.test.mjs',
  'scripts/swan-brain-console/mcp/tools.test.mjs',
  'scripts/swan-brain-console/mcp/server.test.mjs',
  'scripts/swan-brain-console/mcp/searchDoctrine.test.mjs',
  'scripts/swan-brain-console/mcp/snapshot.parity.test.mjs',
  'scripts/swan-brain-console/app/app-gates.test.mjs',
  'scripts/swan-brain-console/app/app-fallback-drift.test.mjs',
  'scripts/swan-brain-console/app/app-shell.test.mjs',
  'scripts/swan-brain-console/app/app-shell-dom.test.mjs',
  'scripts/swan-brain-console/app/judge-export.test.mjs',
  'scripts/swan-brain-console/app/registry-route.test.mjs',
  'scripts/swan-brain-console/app/asset-routes.test.mjs',
  'scripts/swan-brain-console/app/style-hooks.test.mjs',
  'scripts/swan-brain-console/app/judge-persistence.test.mjs',
  'scripts/swan-brain-console/fleet-population.test.mjs',
  'scripts/swan-brain-console/fleet-data.test.mjs',
  'scripts/swan-brain-console/panelPopulation.test.mjs',
  'scripts/swan-brain-console/gateEvidence.test.mjs',
  'scripts/swan-brain-console/gateIdentity.test.mjs',
  'scripts/swan-brain-console/gateIdentity.contract.test.mjs',
  'scripts/swan-brain-console/renderAttempt.test.mjs',
  'scripts/swan-brain-console/renderFence.test.mjs',
  'scripts/swan-brain-console/app/contrast.test.mjs',
  'scripts/swan-brain-console/app/contrast.scope.test.mjs',
  'scripts/swan-brain-console/app/contrast.declared.test.mjs',
  'scripts/swan-brain-console/attemptLock.test.mjs',
  'scripts/swan-brain-console/lifecycleEntry.test.mjs',
  'scripts/swan-brain-console/fleetMeasure.test.mjs',
  'scripts/swan-brain-console/gateReconcile.test.mjs',
  'scripts/swan-brain-console/gateHealth.producerless.test.mjs',
  'scripts/swan-brain-console/app/judge-evidence.test.mjs',
  'scripts/swan-brain-console/mcp/readme-contract.test.mjs',
  'scripts/swan-brain-console/doctrine.test.mjs',
  'scripts/swan-brain-console/app/app-banner.test.mjs',
  'scripts/swan-brain-console/app/app-judge-render.test.mjs',
  'scripts/swan-brain-console/app/app-judge.test.mjs',
  'scripts/swan-brain-console/lockState.test.mjs',
  'scripts/swan-brain-console/attemptLock.identity.test.mjs',
  'scripts/swan-brain-console/baselineLock.test.mjs',
  'scripts/swan-brain-console/baselineLock.acquire.test.mjs',
  'scripts/swan-brain-console/renderAttempt.artifact.test.mjs',
  'scripts/swan-brain-console/stageReport.test.mjs',
  'scripts/swan-brain-console/exitCodes.test.mjs',
  'scripts/swan-brain-console/probeReconcile.test.mjs',
  'scripts/qa/local-frontend-server.test.mjs',
  'scripts/qa/local-frontend-server.deadline.test.mjs',
]);

/** The directories this gate is responsible for. See the header for why this is scoped. */
export const OWNED_SUITE_ROOTS = Object.freeze([
  'scripts/swan-brain-console',
  'scripts/qa',
]);
