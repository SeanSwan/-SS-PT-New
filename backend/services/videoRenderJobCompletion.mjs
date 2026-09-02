/**
 * videoRenderJobCompletion.mjs — an agent hands back a finished render.
 * ============================================================================
 *
 * Split from `videoRenderJobService.mjs` at the 300-line cap. The boundary is real rather
 * than convenient: everything here is the single transaction that turns a leased job into
 * a `MediaAsset` — authorisation, poster validation, the find-or-create, and the collision
 * that owner-scoping turns from a silent adoption into a named refusal. Nothing else in
 * the service participates in it, and it is the part that grew.
 *
 * IT IS ALSO THE ONLY PART WITH INJECTED MODELS. `completeJob` takes `jobModel`,
 * `assetModel` and `db` through `options` because three real defects here went unfixed
 * across two sessions purely for want of a way to test them. That injection is what made
 * this extraction safe to do at all — the transaction body has 26 cases over it.
 *
 * Re-exported by `videoRenderJobService.mjs`, so every existing importer is untouched.
 */

import sequelize from '../database.mjs';
import VideoRenderJob from '../models/VideoRenderJob.mjs';
import MediaAsset from '../models/MediaAsset.mjs';
import { keyOwnedByRow } from './atelier/assetKeyOwnership.mjs';
import logger from '../utils/logger.mjs';
import { VideoRenderJobError } from './videoRenderJobError.mjs';

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
