/**
 * Side-effect-free boundary adapter for MiniSwan resource admission.
 * The policy function is injected so the render-agent cannot silently grow a
 * second policy implementation.
 */
export function evaluateWorkerAdmission({ job, assess, state = {} } = {}) {
  if (!job || typeof assess !== 'function') {
    return { allowed: false, reason: 'invalid_admission_context', kind: null };
  }
  const kind = String(job.workflowId || '').split(':')[0];
  return assess({
    mode: state.mode || 'cool',
    kind,
    heavyJobsRunning: Number(state.heavyJobsRunning || 0),
    browserSessions: Number(state.browserSessions || 0),
    telemetryFresh: state.telemetryFresh === true,
    now: state.now || Date.now(),
    expiresAt: state.expiresAt || null,
  });
}

export function assertWorkerAdmission(input) {
  const result = evaluateWorkerAdmission(input);
  if (!result.allowed) {
    const error = new Error(`Worker admission denied: ${result.reason}`);
    error.code = 'WORKER_ADMISSION_DENIED';
    error.reason = result.reason;
    error.permanent = false;
    throw error;
  }
  return result;
}
