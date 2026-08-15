/**
 * SERVICE: social immediate publish
 * =================================
 * The request-driven half of publishing — "post this now", and "put this in the
 * calendar for later". Split out of nativeSocialPublishingService for the same
 * reason the scheduler and retry were: the 300-line rule, enforced by
 * tests/unit/socialPublishingStructure.test.mjs, which caught this file's parent
 * crossing the cap on the very commit that added a guard to it.
 *
 * The subtlety worth keeping in one place: an immediate post still needs a Job
 * row, and the status that row is BORN in is load-bearing. `runDueJobs` claims
 * `status:'scheduled' AND scheduledAt <= now`, which is exactly the shape of an
 * immediate post — so creating one as 'scheduled' hands it to the 60s worker to
 * publish a second time, to a live account.
 *
 * @module socialImmediatePublish
 */

import logger from '../utils/logger.mjs';
import { DEFAULT_HEARTBEAT_MS } from './socialJobScheduler.mjs';

export function createSocialImmediatePublish({
  JobModel,
  publishToAccounts,
  serializeJob,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
}) {
  const publish = async (payload, { userId, now = new Date(), source = 'dashboard' } = {}) => {
    const content = String(payload.content || '').trim();
    const accountIds = Array.isArray(payload.platformIds) ? payload.platformIds : [];
    if (!content) throw new Error('content is required');
    if (accountIds.length === 0) throw new Error('platformIds array is required');

    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : now;
    if (Number.isNaN(scheduledAt.getTime())) throw new Error('scheduledAt must be a valid ISO date');

    if (scheduledAt.getTime() > now.getTime()) {
      const job = await JobModel.create({
        content,
        status: 'scheduled',
        scheduledAt,
        platformAccountIds: accountIds,
        media: payload.mediaUrl ? [{ url: payload.mediaUrl }] : [],
        complianceSnapshot: payload.compliance || {},
        source,
        createdBy: userId ?? null,
      });
      return { status: 'scheduled', jobId: String(job.id), data: serializeJob(job) };
    }

    // Immediate path. This MUST create a Job even though it publishes right now:
    // getHistory reads Jobs only, so without one an immediate post is invisible
    // forever, and every Attempt row it writes is orphaned because jobId
    // defaults to null. See the module header for why it is born 'running'.
    const job = await JobModel.create({
      content,
      status: 'running',
      scheduledAt,
      platformAccountIds: accountIds,
      media: payload.mediaUrl ? [{ url: payload.mediaUrl }] : [],
      complianceSnapshot: payload.compliance || {},
      source,
      createdBy: userId ?? null,
    });

    // Born 'running' makes this row the reaper's business. The HTTP client may
    // be long gone — Render times the connection out — while this fan-out keeps
    // going, so it needs the same proof-of-life the worker and retry paths have.
    const beat = setInterval(() => {
      JobModel.update({ updatedAt: new Date() }, { where: { id: job.id, status: 'running' } })
        .catch(() => {});
    }, heartbeatMs);
    if (typeof beat.unref === 'function') beat.unref();

    let result;
    try {
      result = await publishToAccounts({ content, accountIds, mediaUrl: payload.mediaUrl, jobId: job.id });
    } catch (err) {
      // A throw out of the fan-out must still land the Job in a terminal state,
      // or this becomes a brand-new orphan class: a 'running' row no reaper
      // handles and no claim query will ever revisit.
      await JobModel.update({
        status: 'failed',
        failedAt: new Date(),
        failureReason: err.message,
      }, { where: { id: job.id, status: 'running' } }).catch(() => {});
      throw err;
    } finally {
      clearInterval(beat);
    }

    const [closed] = await JobModel.update({
      status: result.status,
      platformResults: result.results,
      publishedAt: result.status === 'published' ? now : null,
      failedAt: result.status !== 'published' ? now : null,
      failureReason: result.results.find(item => item.error)?.error || null,
    }, { where: { id: job.id, status: 'running' } });

    // Guarding a write then ignoring whether it landed is the same bug, quieter:
    // if the reaper closed this row first the caller would be handed 'published'
    // while the history says otherwise — and this is the path with a human
    // waiting on the answer.
    //
    // Detecting the divergence and then still returning the in-memory status was
    // only half a fix: any UI keyed on `status === 'published'` renders success
    // while getHistory — the durable record the user will act on — says failed.
    // So the RECORDED verdict is what goes back, with the attempted one kept
    // alongside it for forensics.
    if (!closed) {
      logger.warn(`[social-publish] job ${job.id} finished as ${result.status} but another writer had already closed it`);
      const current = await JobModel.findByPk(job.id);
      const recorded = current?.get ? current.get({ plain: true }) : current;
      return {
        ...result,
        status: recorded?.status || 'unknown',
        results: recorded?.platformResults || result.results,
        jobId: String(job.id),
        recordedVerdictDiverged: true,
        attemptedStatus: result.status,
        attemptedResults: result.results,
      };
    }

    return { ...result, jobId: String(job.id) };
  };

  return { publish };
}
