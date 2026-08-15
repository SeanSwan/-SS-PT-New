/**
 * SERVICE: social publish retry
 * =============================
 * Split out of nativeSocialPublishingService to keep both files under the
 * 300-line rule. Retry is its own operation with its own correctness rule:
 * it must never re-post to an account that already succeeded.
 *
 * @module socialJobRetry
 */

import { Op } from 'sequelize';

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);

/**
 * The only states a retry may act on — all terminal.
 *
 * 'running' is excluded because retry derives what to re-send from the Attempt
 * ledger, and attempts are written AFTER each provider call returns. A job that
 * is still publishing therefore has no attempt row for the accounts currently
 * in flight, so retry reads them as never-tried and posts to them a SECOND
 * time. 'scheduled' is excluded because the worker has not run it yet and will.
 *
 * 'published' stays retryable: it is the no-op path that simply reports done.
 */
const RETRYABLE_STATUSES = ['published', 'partial_failed', 'failed'];

const conflict = (message) => {
  const err = new Error(message);
  err.conflict = true;
  return err;
};

export function createSocialJobRetry({ JobModel, AttemptModel, publishToAccounts, heartbeatMs = 60 * 1000 }) {
  /**
   * Move the job out of a terminal state and into 'running' in one statement,
   * so two operators double-clicking Retry cannot both fan out.
   */
  const claimForRetry = async (jobId, patch) => {
    const [affected] = await JobModel.update(patch, {
      where: { id: jobId, status: { [Op.in]: RETRYABLE_STATUSES } },
    });
    return Boolean(affected);
  };
/**
 * Re-publish only the accounts of an existing job that have NOT already
 * succeeded.
 *
 * This exists because the previous slice stopped discarding the draft on a
 * partial failure — which made the obvious recovery (press Publish again) a
 * duplicate-post machine: a fresh publish targets every selected account,
 * including the ones that already went out. Retry is therefore scoped to the
 * ORIGINAL job and consults the Attempt ledger, which is the only durable
 * record of what actually reached a platform.
 *
 * The skip is evidence-based rather than trusting `platformResults`: attempts
 * are written as each account is tried, so they survive a crash between the
 * publish and the job update. Deriving from the weaker source would risk
 * re-posting to an account whose success was never written back to the job.
 */
const retryJob = async (jobId, { userId, now = new Date() } = {}) => {
  const row = await JobModel.findByPk(jobId);
  if (!row) throw new Error(`Social publishing job ${jobId} not found`);
  const job = getPlain(row);

  // Checked before anything is read or written: a job that is mid-publish must
  // not be reasoned about from a ledger that is still being written.
  if (!RETRYABLE_STATUSES.includes(job.status)) {
    throw conflict(
      job.status === 'running'
        ? `Social publishing job ${jobId} is still publishing — wait for it to finish before retrying`
        : `Social publishing job ${jobId} has not run yet (status: ${job.status}); it is scheduled to publish on its own`,
    );
  }

  const priorAttempts = (await AttemptModel.findAll({ where: { jobId: job.id, status: 'published' } }))
    .map(getPlain);
  const alreadyPublished = new Set(priorAttempts.map(attempt => String(attempt.accountId)));

  const previousResults = Array.isArray(job.platformResults) ? job.platformResults : [];
  const pending = (job.platformAccountIds || []).filter(id => !alreadyPublished.has(String(id)));

  // Nothing left to try is a SUCCESS, not an error — a caller retrying a job
  // that finished while they were deciding should be told it is done.
  if (pending.length === 0) {
    const results = previousResults.length
      ? previousResults
      : priorAttempts.map(a => ({ provider: a.provider, accountId: a.accountId, status: 'published' }));
    await row.update({ status: 'published', platformResults: results, publishedAt: now, failedAt: null, failureReason: null });
    return { status: 'published', results, jobId: String(job.id), retried: [] };
  }

  // Take the job before fanning out. Two operators double-clicking Retry, or a
  // retry racing the worker, would otherwise both publish to the same pending
  // accounts — the same duplicate-post harm the scheduler's claim prevents.
  if (!(await claimForRetry(job.id, { status: 'running' }))) {
    throw conflict(`Social publishing job ${jobId} was already picked up by another retry`);
  }

  // Claiming into 'running' makes this job visible to the reaper, so it needs
  // the same proof-of-life the scheduler's fan-out has. Without it a retry
  // slower than the stuck threshold would be closed underneath itself.
  const beat = setInterval(() => {
    JobModel.update({ updatedAt: new Date() }, { where: { id: job.id, status: 'running' } })
      .catch(() => {});
  }, heartbeatMs);
  if (typeof beat.unref === 'function') beat.unref();

  let result;
  try {
    result = await publishToAccounts({ content: job.content, accountIds: pending, mediaUrl: job.media?.[0]?.url, jobId: job.id });
  } catch (err) {
    await JobModel.update(
      { status: 'failed', failedAt: now, failureReason: err.message },
      { where: { id: job.id, status: 'running' } },
    ).catch(() => {});
    throw err;
  } finally {
    clearInterval(beat);
  }

  // Merge, do not replace. Replacing would erase the earlier success from the
  // job's record and make a fully-published post look partial forever.
  const merged = [
    ...previousResults.filter(r => alreadyPublished.has(String(r.accountId))),
    ...result.results,
  ];
  const failures = merged.filter(r => r.status !== 'published');
  const status = failures.length === 0
    ? 'published'
    : failures.length === merged.length ? 'failed' : 'partial_failed';

  const [closed] = await JobModel.update({
    status,
    platformResults: merged,
    publishedAt: status === 'published' ? now : null,
    failedAt: status !== 'published' ? now : null,
    failureReason: merged.find(item => item.error)?.error || null,
  }, { where: { id: job.id, status: 'running' } });

  // Losing this write matters MORE here than anywhere else. The person pressing
  // Retry is a human recovering from a failure: hand them an unqualified
  // 'published' while the stored record says failed, and their obvious next
  // move — publish again — is a duplicate post to a live account. So report the
  // verdict that was actually RECORDED, not the one held in memory, and say
  // plainly that the two disagree.
  if (!closed) {
    const current = getPlain(await JobModel.findByPk(job.id));
    return {
      status: current?.status || 'unknown',
      results: current?.platformResults || merged,
      jobId: String(job.id),
      retried: pending,
      recordedVerdictDiverged: true,
      attemptedStatus: status,
      attemptedResults: merged,
    };
  }

  return { status, results: merged, jobId: String(job.id), retried: pending };
};

  return { retryJob };
}
