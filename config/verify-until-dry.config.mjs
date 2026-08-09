/**
 * FILE: config/verify-until-dry.config.mjs
 * PURPOSE: Owner-controlled risk, budget, Kimi, and convergence policy.
 * SECURITY: Agents may read this configuration but may not lower it at runtime.
 * CHANGE CLASS: Treat every modification as Tier 3 verifier-enforcement work.
 */

export default Object.freeze({
  version: 1,
  provenance: 'LOCAL_ADVISORY',
  risk: {
    minTier: 0,
    maxTier: 3,
    kimiComplexityThreshold: 7,
    broadFileCount: 20,
    broadChangedLines: 500,
  },
  kimi: {
    enabled: true,
    model: 'moonshotai/kimi-k3',
    approvalMode: 'exact-run',
    maxTokens: 60_000,
    maxUsdPerCall: 1,
    maxCallsPerRun: 2,
    maxUsdPerRun: 2,
    launcher: 'scripts/consult-kimi.mjs',
    timeoutMs: 900_000,
  },
  convergence: {
    maxRepairRounds: 5,
    repeatedFindingLimit: 2,
    inverseFixOverlapPercent: 60,
    infrastructureRetries: 3,
    flakyGatePercent: 5,
  },
  fixer: {
    maxFiles: { 0: 10, 1: 15, 2: 25, 3: 0 },
    maxNetLines: { 0: 250, 1: 500, 2: 1_000, 3: 0 },
    tier3RequiresApproval: true,
  },
});
