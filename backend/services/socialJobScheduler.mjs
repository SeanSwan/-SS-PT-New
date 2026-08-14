/**
 * SERVICE: social job scheduler + reaper
 * ======================================
 * The two worker-driven halves of a job's life: claiming work that is due, and
 * closing work that died mid-flight. Split out of nativeSocialPublishingService
 * to keep that file under the 300-line rule, and because both share the one
 * idiom that makes them safe — the atomic claim.
 *
 * Why the claim has to be a single conditional UPDATE: `findAll` returns
 * candidates, not ownership. Between a SELECT and a plain `row.update()` a
 * second instance can find the same row, and both would publish — a duplicate
 * post to a live account, which no database cleanup can undo.
 *
 * Why the reaper never requeues: the fan-out writes its Attempt row AFTER the
 * provider call returns, so a crash in that window leaves a post that really
 * went out with no Attempt to show for it. Absence of evidence is not evidence
 * the post failed. The reaper therefore only ever CLOSES a job, and says
 * plainly which accounts it cannot account for.
 *
 * @module socialJobScheduler
 */

import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);

/** How long a job may sit in 'running' before it is presumed dead. */
export const DEFAULT_STUCK_AFTER_MS = 15 * 60 * 1000;

const UNKNOWN_OUTCOME =
  'Publish was interrupted before this account was recorded — outcome UNKNOWN. '
  + 'The post may have gone out; verify the account before retrying.';

/** Roll per-account results up into the job's terminal status. */
const terminalStatus = (results) => {
  if (results.length === 0) return 'failed';
  const failures = results.filter(item => item.status !== 'published');
  if (failures.length === 0) return 'published';
  return failures.length === results.length ? 'failed' : 'partial_failed';
};

/**
 * Rebuild per-account outcomes from the Attempt ledger.
 *
 * An account with no attempt row is reported as not-published WITH an explicit
 * unknown-outcome reason rather than a bare "failed": the difference decides
 * whether it is safe to retry, and quietly calling it a failure would put a
 * claim in the history that nothing supports.
 */
const reconstructResults = (job, attempts) => {
  const byAccount = new Map();
  for (const attempt of attempts) {
    const key = String(attempt.accountId);
    const previous = byAccount.get(key);
    // A recorded success outranks a recorded failure for the same account:
    // the fan-out can retry a refreshed credential, so both rows may exist.
    if (!previous || (attempt.status === 'published' && previous.status !== 'published')) {
      byAccount.set(key, attempt);
    }
  }

  const accountIds = Array.isArray(job.platformAccountIds) ? job.platformAccountIds : [];
  return accountIds.map((accountId) => {
    const attempt = byAccount.get(String(accountId));
    if (!attempt) {
      return { accountId, provider: null, status: 'failed', error: UNKNOWN_OUTCOME };
    }
    return {
      accountId,
      provider: attempt.provider || null,
      status: attempt.status,
      ...(attempt.providerPostId ? { providerPostId: attempt.providerPostId } : {}),
      ...(attempt.error ? { error: attempt.error } : {}),
    };
  });
};

/**
 * How often a running job proves it is still alive.
 *
 * Must stay well under DEFAULT_STUCK_AFTER_MS: the gap between them is the
 * margin by which a healthy-but-slow publish avoids being declared dead.
 */
export const DEFAULT_HEARTBEAT_MS = 60 * 1000;

export function createSocialJobScheduler({
  JobModel,
  AttemptModel,
  publishToAccounts,
  log = logger,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
}) {
  /**
   * Take ownership of a row by moving it between statuses in one statement.
   * Returns false when someone else got there first — the caller must then do
   * NOTHING to that row, because the winner owns its terminal state.
   */
  const claim = async (jobId, from, patch) => {
    const [affected] = await JobModel.update(patch, { where: { id: jobId, status: from } });
    return Boolean(affected);
  };

  const runDueJobs = async ({ now = new Date(), limit = 10 } = {}) => {
    const rows = await JobModel.findAll({
      where: { status: 'scheduled', scheduledAt: { [Op.lte]: now } },
      order: [['scheduledAt', 'ASC']],
      limit,
    });

    const processed = [];
    for (const row of rows) {
      const job = getPlain(row);

      if (!(await claim(job.id, 'scheduled', { status: 'running' }))) {
        log.info(`[social-publish] job ${job.id} was claimed by another worker; skipping`);
        continue;
      }

      // Staleness is measured on updatedAt, which is bumped at claim and at the
      // terminal write but NOT during the fan-out — so a publish across several
      // slow providers that outlasts the threshold was reaped while still
      // running. Sean then saw 'failed' for a post that was at that instant
      // still going out, and the retry button re-sent it: a duplicate post to a
      // live account, which is the exact harm the atomic claim exists to stop.
      // The heartbeat is what distinguishes slow from dead.
      const beat = setInterval(() => {
        JobModel.update({ updatedAt: new Date() }, { where: { id: job.id, status: 'running' } })
          .catch(err => log.warn(`[social-publish] heartbeat failed for job ${job.id}: ${err.message}`));
      }, heartbeatMs);
      if (typeof beat.unref === 'function') beat.unref();

      let result;
      try {
        result = await publishToAccounts({
          content: job.content,
          accountIds: job.platformAccountIds || [],
          jobId: job.id,
        });
      } finally {
        clearInterval(beat);
      }

      // Guarded exactly like the claim. An unguarded write here gives back the
      // atomicity the claim buys: if a reaper closed this row while we were in
      // flight, overwriting its verdict would erase the record that the job was
      // presumed dead — including any retry that verdict has already triggered.
      const closed = await claim(job.id, 'running', {
        status: result.status,
        platformResults: result.results,
        publishedAt: result.status === 'published' ? now : null,
        failedAt: result.status !== 'published' ? now : null,
        failureReason: result.results.find(item => item.error)?.error || null,
      });
      if (!closed) {
        log.warn(
          `[social-publish] job ${job.id} finished as ${result.status} but was no longer 'running' — `
          + 'another writer (most likely the reaper) already closed it; leaving its verdict in place',
        );
        continue;
      }
      processed.push({ jobId: String(job.id), ...result });
    }
    return processed;
  };

  /**
   * Close jobs stranded in 'running'. Never publishes, never requeues — see the
   * module header for why re-sending would be the dangerous fix.
   */
  const reapStuckJobs = async ({
    now = new Date(),
    stuckAfterMs = DEFAULT_STUCK_AFTER_MS,
    limit = 25,
  } = {}) => {
    const rows = await JobModel.findAll({
      where: {
        status: 'running',
        updatedAt: { [Op.lte]: new Date(now.getTime() - stuckAfterMs) },
      },
      order: [['updatedAt', 'ASC']],
      limit,
    });

    const reaped = [];
    for (const row of rows) {
      const job = getPlain(row);
      const attempts = (await AttemptModel.findAll({ where: { jobId: job.id } })).map(getPlain);
      const results = reconstructResults(job, attempts);
      const status = terminalStatus(results);

      // Guarded on 'running' so two reapers — or a reaper racing a worker that
      // somehow revived — cannot both write a terminal state.
      const won = await claim(job.id, 'running', {
        status,
        platformResults: results,
        publishedAt: status === 'published' ? now : null,
        failedAt: status === 'published' ? null : now,
        failureReason: results.find(item => item.error)?.error || null,
      });
      if (!won) continue;

      log.warn(`[social-publish] reaped stuck job ${job.id} as ${status} from ${attempts.length} attempt row(s)`);
      reaped.push({ jobId: String(job.id), status, results });
    }
    return reaped;
  };

  return { runDueJobs, reapStuckJobs };
}
