/**
 * videoRenderJobLease.mjs — the contract between the server and a render agent.
 * ============================================================================
 *
 * Split from `videoRenderJobService.mjs` at the 300-line cap, along a boundary the CODEBASE
 * ALREADY DREW rather than one invented to hit a number. The two consumers import disjoint
 * sets:
 *
 *   renderAgentRoutes    leaseNextJob, heartbeat, completeJob, failJob   <- the worker surface
 *   contentStudioRoutes  createJob, getJob, getAssetProvenance          <- the operator surface
 *
 * This file is the first set (minus `completeJob`, which is large enough to have its own
 * module), plus `sweepExpiredLeases` — which is lease maintenance and belongs with the
 * lease, even though its caller is a cron rather than a route.
 *
 * `cancelJob` is deliberately NOT here. An operator cancelling a job is not part of the
 * agent protocol, and moving it because it happened to sit between two functions that ARE
 * would make the split about adjacency instead of meaning.
 *
 * Re-exported by `videoRenderJobService.mjs`, so every existing importer is untouched.
 */

import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import VideoRenderJob, { VIDEO_JOB_LEASE_SECONDS } from '../models/VideoRenderJob.mjs';
import { VideoRenderJobError } from './videoRenderJobError.mjs';

const backoffSeconds = (attempts) => Math.min(30 * attempts * attempts, 900);

/**
 * Atomically lease the highest-priority eligible job for an agent.
 *
 * FOR UPDATE SKIP LOCKED is deliberate and non-negotiable: an ORM
 * find-then-update races, and two agents would render the same job. Capability
 * containment (`@>`) keeps a worker from claiming work it cannot execute.
 *
 * Returns the leased job, or null when nothing is eligible.
 */
export async function leaseNextJob({ agentId, capabilities = [] }) {
  if (!agentId) {
    throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'agentId is required.');
  }

  const [rows] = await sequelize.query(
    `
    UPDATE video_render_jobs
       SET status           = 'leased',
           leased_by        = :agentId,
           leased_at        = now(),
           lease_expires_at = now() + (:leaseSeconds * interval '1 second'),
           attempts         = attempts + 1,
           started_at       = COALESCE(started_at, now()),
           updated_at       = now()
     WHERE id = (
       SELECT id
         FROM video_render_jobs
        WHERE status = 'queued'
          AND run_after <= now()
          AND cancel_requested = false
          AND (:capabilities)::jsonb @> required_capabilities
        ORDER BY priority ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     RETURNING *;
    `,
    {
      replacements: {
        agentId,
        leaseSeconds: VIDEO_JOB_LEASE_SECONDS,
        capabilities: JSON.stringify(capabilities),
      },
    },
  );

  if (!rows?.length) return null;
  return VideoRenderJob.findByPk(rows[0].id);
}

/**
 * Extend a lease and report progress. Returns { cancelRequested } so the agent
 * learns about cancellation on its next beat — cancellation never blocks on the
 * agent being reachable.
 *
 * Rejects a heartbeat from an agent that no longer holds the lease (409): if the
 * sweeper already reclaimed the job and someone else took it, the old worker must
 * drop it rather than write over the new one's progress.
 */
export async function heartbeat({ jobId, agentId, progress, message }) {
  const job = await VideoRenderJob.findByPk(jobId);
  if (!job) throw new VideoRenderJobError(404, 'NOT_FOUND', 'Job not found.');
  if (job.isTerminal) {
    throw new VideoRenderJobError(409, 'JOB_TERMINAL', 'Job is already in a terminal state.');
  }
  if (job.leasedBy !== agentId) {
    throw new VideoRenderJobError(409, 'LEASE_CONFLICT', 'You do not hold the lease for this job.');
  }

  const patch = {
    status: job.status === 'leased' ? 'rendering' : job.status,
    heartbeatAt: new Date(),
    leaseExpiresAt: new Date(Date.now() + VIDEO_JOB_LEASE_SECONDS * 1000),
  };
  if (Number.isFinite(progress)) patch.progress = Math.max(0, Math.min(100, Math.trunc(progress)));
  if (typeof message === 'string') patch.progressMessage = message.slice(0, 200);

  await job.update(patch);
  return { cancelRequested: job.cancelRequested };
}

/**
 * Record a failure. `retryable: false` (an OOM, an impossible parameter combination)
 * goes straight to terminal — retrying a poison job just burns the GPU three times
 * and fails identically.
 */
export async function failJob({ jobId, agentId, errorCode, errorMessage, retryable = true }) {
  const job = await VideoRenderJob.findByPk(jobId);
  if (!job) throw new VideoRenderJobError(404, 'NOT_FOUND', 'Job not found.');
  if (job.isTerminal) return job;
  if (agentId && job.leasedBy !== agentId) {
    throw new VideoRenderJobError(409, 'LEASE_CONFLICT', 'You do not hold the lease for this job.');
  }

  const exhausted = !retryable || job.attempts >= job.maxAttempts;
  await job.update({
    status: exhausted ? 'failed' : 'queued',
    errorCode: (errorCode || 'RENDER_FAILED').slice(0, 60),
    // Truncated and sanitized by the caller — stack traces never reach this column.
    errorMessage: (errorMessage || '').slice(0, 500) || null,
    leasedBy: null,
    leaseExpiresAt: null,
    runAfter: exhausted ? job.runAfter : new Date(Date.now() + backoffSeconds(job.attempts) * 1000),
    finishedAt: exhausted ? new Date() : null,
  });
  return job;
}

/**
 * Reclaim jobs whose lease lapsed. Idempotent and safe to run from every web
 * instance concurrently — it is a single conditional UPDATE, so there must be NO
 * in-memory "currently sweeping" state anywhere in the web process.
 *
 * Expiry REQUEUES rather than fails while attempts remain: the agent being asleep
 * is normal operation for a home GPU, not an error.
 */
export async function sweepExpiredLeases() {
  const [, requeued] = await VideoRenderJob.update(
    { status: 'queued', leasedBy: null, leaseExpiresAt: null },
    {
      where: {
        status: { [Op.in]: ['leased', 'rendering', 'uploading'] },
        leaseExpiresAt: { [Op.lt]: new Date() },
        attempts: { [Op.lt]: sequelize.col('max_attempts') },
      },
    },
  );

  const [, exhausted] = await VideoRenderJob.update(
    {
      status: 'failed',
      errorCode: 'LEASE_EXPIRED',
      errorMessage: 'Agent stopped reporting and no attempts remain.',
      leasedBy: null,
      leaseExpiresAt: null,
      finishedAt: new Date(),
    },
    {
      where: {
        status: { [Op.in]: ['leased', 'rendering', 'uploading'] },
        leaseExpiresAt: { [Op.lt]: new Date() },
        attempts: { [Op.gte]: sequelize.col('max_attempts') },
      },
    },
  );

  return { requeued: requeued ?? 0, failed: exhausted ?? 0 };
}
