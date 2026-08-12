/**
 * SERVICE: social publish retry
 * =============================
 * Split out of nativeSocialPublishingService to keep both files under the
 * 300-line rule. Retry is its own operation with its own correctness rule:
 * it must never re-post to an account that already succeeded.
 *
 * @module socialJobRetry
 */

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);

export function createSocialJobRetry({ JobModel, AttemptModel, publishToAccounts }) {
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

  let result;
  try {
    result = await publishToAccounts({ content: job.content, accountIds: pending, mediaUrl: job.media?.[0]?.url, jobId: job.id });
  } catch (err) {
    await row.update({ status: 'failed', failedAt: now, failureReason: err.message }).catch(() => {});
    throw err;
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

  await row.update({
    status,
    platformResults: merged,
    publishedAt: status === 'published' ? now : null,
    failedAt: status !== 'published' ? now : null,
    failureReason: merged.find(item => item.error)?.error || null,
  });

  return { status, results: merged, jobId: String(job.id), retried: pending };
};

  return { retryJob };
}
