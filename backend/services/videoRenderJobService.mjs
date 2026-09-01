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

import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import VideoRenderJob, {
  VIDEO_JOB_LEASE_SECONDS,
  VIDEO_JOB_TERMINAL_STATUSES,
} from '../models/VideoRenderJob.mjs';
import MediaAsset from '../models/MediaAsset.mjs';
import { keyOwnedByRow } from './atelier/assetKeyOwnership.mjs';
import logger from '../utils/logger.mjs';

export class VideoRenderJobError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'VideoRenderJobError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

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
 * Mark a job ready and record its asset. Idempotent on r2Key: a duplicate
 * completion (the expected consequence of at-least-once delivery) returns the
 * existing asset instead of inserting a second row.
 *
 * `verifyObject` is injected so the caller can HEAD the object in R2 first — the
 * server must not take the agent's word that bytes exist. Never trust a worker's
 * self-report about state the server can check.
 */
export async function completeJob({ jobId, agentId, r2Key, mime = 'video/mp4', ...meta }, options = {}) {
  if (!r2Key) throw new VideoRenderJobError(400, 'VALIDATION_ERROR', 'r2Key is required.');

  // MODELS INJECTED, DEFAULTING TO THE REAL ONES. Not a refactor for its own sake: this
  // function had three known defects that went unfixed across two sessions purely because
  // nothing here could be tested — the suite's own header says it covers only paths running
  // BEFORE database access, and the leasing paths "need Postgres". An unfalsifiable fix is
  // not a fix, so the first move is making the path reachable from a test.
  const d = { jobModel: VideoRenderJob, assetModel: MediaAsset, db: sequelize, ...options };

  const job = await d.jobModel.findByPk(jobId);
  if (!job) throw new VideoRenderJobError(404, 'NOT_FOUND', 'Job not found.');

  // AUTHORIZATION. The obvious form of this check —
  //   if (leasedBy !== agentId && !isTerminal) throw
  // — inverts on terminal jobs: `!isTerminal` is false, the && short-circuits, and ANY
  // caller can "complete" a job that already failed or was cancelled. That would mint a
  // MediaAsset for output nobody verified and drop it into the library as a draft.
  //
  // Only two callers may proceed: the agent that currently holds the lease, or an
  // idempotent replay of a completion that already happened with this exact key. A
  // failed or cancelled job satisfies neither, because it is not 'ready'.
  const holdsLease = job.leasedBy === agentId;
  const isIdempotentReplay = job.status === 'ready' && job.r2Key === r2Key;
  if (!holdsLease && !isIdempotentReplay) {
    throw new VideoRenderJobError(409, 'LEASE_CONFLICT', 'You do not hold the lease for this job.');
  }


  if (typeof options.verifyObject === 'function') {
    const ok = await options.verifyObject(r2Key);
    if (!ok) {
      throw new VideoRenderJobError(422, 'OBJECT_MISSING', 'Declared object was not found in storage.');
    }
  }

  // THE POSTER IS CALLER-SUPPLIED AND WAS NEVER CHECKED. `meta` reaches here from the body
  // of POST /api/render-agents/jobs/:jobId/complete, and `verifyObject` above checks that an
  // object EXISTS at `r2Key` — never that a key is one this system wrote. An enrolled agent
  // could therefore store a poster pointing anywhere in the bucket, on a row it legitimately
  // owns. Both readers now refuse such a key, but a reader should not be the only line: a
  // value that cannot legitimately be stored should not be stored.
  //
  // Dropped rather than rejected. The poster is an OPTIMISATION — every path that produces
  // one already tolerates its absence — so refusing the whole completion would trade a
  // missing thumbnail for a lost render, which is the wrong direction on a job that has
  // already spent GPU time.
  const declaredPoster = meta.posterR2Key ?? null;
  const poster = keyOwnedByRow(declaredPoster, { ownerUserId: job.userId, jobId: job.id })
    ? declaredPoster
    : null;
  if (declaredPoster && !poster) {
    logger.warn('[VideoRenderJob] job %s declared a poster key this system did not write for it; dropped', job.id);
  }

  // AND WHAT OWNER-SCOPING TURNS A COLLISION INTO. `media_assets.r2_key` carries a UNIQUE
  // partial index (`ma_r2_key_live_uniq`, WHERE deleted_at IS NULL). Before the owner was in
  // the lookup, a cross-tenant collision FOUND the other tenant's row and silently adopted
  // it. Now the lookup misses, the insert hits that index, and Sequelize throws.
  //
  // Loud is the right direction, but an unhandled constraint error is a 500 — a server
  // fault for what is actually a deliberate refusal, which is the same mistake this slice
  // just fixed one file over. Named instead: 409, because the caller has declared a key that
  // is not theirs to declare, and no retry of the same request will change that.
  const runCompletion = async (transaction) => {
    const [asset, created] = await d.assetModel.findOrCreate({
      // OWNER IN THE LOOKUP, not only in the defaults. On an `r2Key` collision across
      // tenants this found ANOTHER tenant's row: the completer's asset never appeared in
      // their library, `ownerUserId` stayed the original owner's, and nothing errored.
      where: { r2Key, ownerUserId: job.userId },
      defaults: {
        ownerUserId: job.userId,
        jobId: job.id,
        kind: 'video',
        source: 'generated',
        r2Key,
        posterR2Key: poster,
        mime,
        width: meta.width ?? null,
        height: meta.height ?? null,
        durationMs: meta.durationMs ?? null,
        sizeBytes: meta.sizeBytes ?? null,
        exerciseId: job.exerciseId,
        projectId: job.projectId,
        // `meta` is cherry-picked above, which silently DROPPED the provenance record
        // the agent builds — so the licensing commitment was unmet at the persistence
        // layer while every unit test upstream passed. Stored as given; the record is
        // frozen at the source and must not be reshaped here.
        provenance: meta.provenance ?? null,
      },
      transaction,
    });

    // BACKFILL ON THE FOUND PATH. `defaults` are ignored when the row already exists, and
    // the poster written twelve lines below belongs to `job.update(...)` — the JOB, not the
    // asset. So a clip whose row was created on a poster-less declaration kept `null`
    // forever while the job knew better, and the library could not show it. Only ever
    // fills a gap: an existing poster is never overwritten by a later declaration.
    if (!created && poster && !asset.posterR2Key) {
      await asset.update({ posterR2Key: poster }, { transaction });
    }

    if (!job.isTerminal) {
      await job.update({
        status: 'ready',
        progress: 100,
        r2Key,
        // THE SAME SANITISED VALUE THE ASSET GOT. This read `meta.posterR2Key` directly, so
        // the asset dropped a foreign key while the job twelve lines away kept it — one half
        // of a pair, in the fix for a pair defect. A strengthened test caught it; the weak
        // one I wrote first would not have.
        posterR2Key: poster ?? job.posterR2Key,
        durationMs: meta.durationMs ?? job.durationMs,
        width: meta.width ?? job.width,
        height: meta.height ?? job.height,
        sizeBytes: meta.sizeBytes ?? job.sizeBytes,
        seedUsed: meta.seedUsed ?? job.seedUsed,
        finishedAt: new Date(),
        leasedBy: null,
        leaseExpiresAt: null,
      }, { transaction });
    }

    return { job, asset };
  };

  try {
    return await d.db.transaction(runCompletion);
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      throw new VideoRenderJobError(409, 'KEY_COLLISION',
        'That object key already belongs to another owner\u0027s asset. Declare a key under this job.');
    }
    throw err;
  }
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
