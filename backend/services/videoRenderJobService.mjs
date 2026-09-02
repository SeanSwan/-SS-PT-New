/**
 * Video render job service — the leasing core.
 *
 * ── THE STRUCTURAL GUARD (read this before adding an endpoint) ───────────────
 * Three endpoints in this section reported success while doing nothing: an AI-video
 * generator that returned a provider job id nothing could poll, two panels calling
 * routes that were never written, and a "render job" endpoint that swallowed its
 * only side effect in `catch { /* non-fatal *\/ }` and still answered
 * `{ success: true, "Render job queued" }`.
 *
 * The rule that makes that class impossible, enforced here rather than by convention:
 *
 *   1. A handler that claims to enqueue work MUST obtain the job row from this
 *      service. There is no code path here that returns a job-shaped object without
 *      having committed a row — createJob() either commits and returns a real id,
 *      or throws. It never resolves "optimistically".
 *   2. Every id this service returns is POLLABLE BY ID. If you return an identifier
 *      to a client, `getJob(id)` must be able to find it. That is what the deleted
 *      endpoint could not do.
 *   3. Never wrap a call to this service in a swallowing catch. If enqueueing fails,
 *      the request fails. A 500 the operator sees beats a success they cannot use.
 *
 * ── LEASING ─────────────────────────────────────────────────────────────────
 * Workers claim work with FOR UPDATE SKIP LOCKED so N agents never collide and a
 * slow agent never blocks a fast one. Leases are extended by HEARTBEAT, never by an
 * estimate of render duration: a 40-minute render is safe under a 90-second lease
 * while heartbeats flow, and a dead agent is reclaimed in 90 seconds instead of 40
 * minutes. Delivery is at-least-once — a crash between upload and acknowledgement
 * re-renders — and that is made harmless by deterministic R2 keys plus a UNIQUE
 * constraint on media_assets.r2_key, not by trying to guarantee exactly-once.
 */

import VideoRenderJob, {
  VIDEO_JOB_LEASE_SECONDS,
  VIDEO_JOB_TERMINAL_STATUSES,
} from '../models/VideoRenderJob.mjs';
import MediaAsset from '../models/MediaAsset.mjs';
import { VideoRenderJobError } from './videoRenderJobError.mjs';
import { completeJob } from './videoRenderJobCompletion.mjs';

// RE-EXPORTED so every existing importer is untouched by the split. Five modules
// import from this file; none of them should have to know the shape changed.
export { VideoRenderJobError, completeJob };
export { leaseNextJob, heartbeat, failJob, sweepExpiredLeases } from './videoRenderJobLease.mjs';


const MAX_PROMPT_CHARS = 4000;
/** Exponential, capped. Attempt 1 -> 30s, 2 -> 120s, 3 -> 270s, capped at 15 min. */
const backoffSeconds = (attempts) => Math.min(30 * attempts * attempts, 900);

/** Deterministic keys are what make re-delivery an overwrite instead of a duplicate. */
export const r2KeyForJob = (jobId, name = 'source.mp4') => `jobs/${jobId}/${name}`;

/**
 * Create a job. Idempotent per (userId, idempotencyKey).
 *
 * Returns { job, replayed }. `replayed: true` means an identical request already
 * created this job — the caller should answer 200 with the SAME id rather than
 * creating a second render. A double-clicked Generate must not occupy the GPU twice.
 *
 * Throws on any validation or persistence failure. It never returns a job-shaped
 * object that does not correspond to a committed row (structural guard #1).
 */
export async function createJob(input = {}) {
  const userId = Number(input.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'A valid userId is required.');
  }

  const idempotencyKey = typeof input.idempotencyKey === 'string' ? input.idempotencyKey.trim() : '';
  if (!idempotencyKey) {
    // Without this the retry story is "hope the user does not click twice".
    throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'An Idempotency-Key is required.');
  }

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) {
    throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'Prompt is required.');
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new VideoRenderJobError(
      400, 'VALIDATION_ERROR', `Prompt must be ${MAX_PROMPT_CHARS} characters or fewer.`,
    );
  }

  const workflowId = typeof input.workflowId === 'string' ? input.workflowId.trim() : '';
  if (!workflowId) {
    // A render with no workflow id is unreproducible the moment it looks wrong.
    throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'workflowId is required.');
  }

  // Replay check before insert keeps the happy path off the unique-violation path,
  // but the DB constraint is still the authority under concurrency (see catch below).
  const existing = await VideoRenderJob.findOne({ where: { userId, idempotencyKey } });
  if (existing) return { job: existing, replayed: true };

  try {
    const job = await VideoRenderJob.create({
      userId,
      idempotencyKey,
      projectId: input.projectId ?? null,
      exerciseId: input.exerciseId ?? null,
      kind: input.kind || 'generate',
      workflowId,
      workflowVersion: input.workflowVersion ?? 1,
      prompt,
      negativePrompt: input.negativePrompt ?? null,
      params: input.params ?? {},
      compiledPrompt: input.compiledPrompt ?? null,
      brainVersion: input.brainVersion ?? null,
      parentJobId: input.parentJobId ?? null,
      requiredCapabilities: input.requiredCapabilities ?? [],
      priority: input.priority ?? 100,
    });
    return { job, replayed: false };
  } catch (err) {
    // Two identical submits racing: the loser reads the winner's row rather than
    // erroring at the operator, which is the whole point of the idempotency key.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      const raced = await VideoRenderJob.findOne({ where: { userId, idempotencyKey } });
      if (raced) return { job: raced, replayed: true };
    }
    throw err;
  }
}

/** Pollable by id — structural guard #2. */
export async function getJob(id) {
  return VideoRenderJob.findByPk(id);
}

/**
 * The frozen provenance record for a job's produced asset, or null.
 *
 * Queried directly rather than through an association because MediaAsset declares none —
 * writing `job.asset.provenance` would have read `undefined` forever and reported "no
 * provenance" for assets that have it.
 */
export async function getAssetProvenance(jobId) {
  if (!jobId) return null;
  const asset = await MediaAsset.findOne({
    where: { jobId },
    order: [['createdAt', 'DESC']],
  });
  return asset?.provenance ?? null;
}

/**
 * Request cancellation. Flag-only when the job is in flight so the click returns
 * immediately; the agent converges on its next heartbeat. A queued job that no
 * agent holds is cancelled outright, since there is nobody to converge with.
 */
export async function cancelJob(jobId) {
  const job = await VideoRenderJob.findByPk(jobId);
  if (!job) throw new VideoRenderJobError(404, 'NOT_FOUND', 'Job not found.');
  if (job.isTerminal) {
    throw new VideoRenderJobError(409, 'JOB_TERMINAL', 'Job is already in a terminal state.');
  }

  if (job.status === 'queued') {
    await job.update({ status: 'cancelled', cancelRequested: true, finishedAt: new Date() });
  } else {
    await job.update({ cancelRequested: true });
  }
  return job;
}
