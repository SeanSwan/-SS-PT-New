/**
 * Admission policy for background work on miniswan.
 *
 * This is deliberately a policy layer, not a hardware controller. A caller must
 * still apply the returned limits to its process/job scheduler and report actual
 * telemetry before claiming that a mode is enforced.
 */

const POLICIES = Object.freeze({
  cool: Object.freeze({
    mode: 'cool',
    cpuBudgetPercent: 20,
    gpuProfile: 'conservative',
    maxHeavyJobs: 0,
    maxBrowserSessions: 0,
    requiresFreshTelemetry: false,
    fullModeExpires: false,
  }),
  balanced: Object.freeze({
    mode: 'balanced',
    cpuBudgetPercent: 50,
    gpuProfile: 'reduced',
    maxHeavyJobs: 1,
    maxBrowserSessions: 1,
    requiresFreshTelemetry: true,
    fullModeExpires: false,
  }),
  full: Object.freeze({
    mode: 'full',
    cpuBudgetPercent: 85,
    gpuProfile: 'stock-with-watchdog',
    maxHeavyJobs: 1,
    maxBrowserSessions: 2,
    requiresFreshTelemetry: true,
    fullModeExpires: true,
  }),
  sleep: Object.freeze({
    mode: 'sleep',
    cpuBudgetPercent: 0,
    gpuProfile: 'off',
    maxHeavyJobs: 0,
    maxBrowserSessions: 0,
    requiresFreshTelemetry: false,
    fullModeExpires: false,
  }),
});

const CONTROL_KINDS = new Set(['health', 'report', 'collect-public']);
const HEAVY_KINDS = new Set([
  'video-render',
  'video-transcode',
  'generate',
  'mediasync',
  'transcribe',
  'model-generation',
  'browser-draft',
]);

function denied(reason, policy, kind) {
  return { allowed: false, reason, policy, kind };
}

export function getWorkerPolicy(mode) {
  return POLICIES[mode] || null;
}

export function assessJobAdmission({
  mode = 'cool',
  kind,
  heavyJobsRunning = 0,
  browserSessions = 0,
  telemetryFresh = false,
  now = Date.now(),
  expiresAt = null,
} = {}) {
  const policy = getWorkerPolicy(mode);
  if (!policy) return denied('unknown_mode', null, kind);
  if (kind === 'external-send') return denied('external_action_requires_approval', policy, kind);
  if (mode === 'sleep') return denied('worker_sleeping', policy, kind);
  if (CONTROL_KINDS.has(kind)) return { allowed: true, reason: 'admitted', policy, kind };
  if (!HEAVY_KINDS.has(kind)) return denied('unknown_job_kind', policy, kind);
  if (policy.maxHeavyJobs === 0) return denied('mode_blocks_heavy_work', policy, kind);
  if (policy.requiresFreshTelemetry && telemetryFresh !== true) {
    return denied('telemetry_stale', policy, kind);
  }
  if (heavyJobsRunning >= policy.maxHeavyJobs) {
    return denied('heavy_capacity_full', policy, kind);
  }
  if (kind === 'browser-draft' && browserSessions >= policy.maxBrowserSessions) {
    return denied('browser_capacity_full', policy, kind);
  }
  if (policy.fullModeExpires) {
    const expiry = Date.parse(expiresAt || '');
    if (!Number.isFinite(expiry)) return denied('full_mode_requires_expiry', policy, kind);
    if (expiry <= now) return denied('full_mode_expired', policy, kind);
  }
  return { allowed: true, reason: 'admitted', policy, kind };
}
