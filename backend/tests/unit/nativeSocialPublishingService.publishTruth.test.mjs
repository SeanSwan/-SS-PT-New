/**
 * Native Social Publishing Service — publish-truth contract
 * =========================================================
 * Sibling of nativeSocialPublishingService.test.mjs, reusing its DI harness.
 *
 * WHY: the immediate publish path (scheduledAt absent or in the past) called
 * publishToAccounts directly and never created a Job. getHistory reads Jobs
 * only, so an immediate post could never appear in history — and because the
 * jobId parameter defaults to null, every Attempt row it wrote was orphaned
 * with no parent to hang off. A post could go out, or fail, and leave no
 * reachable record either way.
 *
 * The other half: SocialPublishingAccount had NO update path anywhere in the
 * service — only findAll/findByPk/create. An account whose token expired kept
 * reporting status 'connected' forever while every publish 401'd, with no way
 * for the UI to ever say "reconnect this".
 *
 * DELIBERATE CONSTRAINT: the immediate-path Job must NOT be created in
 * 'scheduled'. runDueJobs claims any job with status 'scheduled' AND
 * scheduledAt <= now, so a job created that way would be picked up by the 60s
 * worker and published a SECOND time — a real duplicate post to a live account.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeSocialPublishingService } from '../../services/nativeSocialPublishingService.mjs';

// The adapters below are module-level mocks shared by every test, so their call
// counts accumulate across the file. Without this, any assertion on
// toHaveBeenCalledTimes passes in isolation and fails in the suite.
beforeEach(() => {
  vi.clearAllMocks();
});

const makeRow = (data) => ({
  ...data,
  get: vi.fn(() => data),
  update: vi.fn(async (patch) => makeRow({ ...data, ...patch })),
  destroy: vi.fn(async () => undefined),
});

const ACCOUNT = {
  id: 'acct-1',
  provider: 'bluesky',
  status: 'connected',
  providerAccountId: 'did:plc:test',
  displayName: 'swan',
};

const makeService = ({ accounts = [ACCOUNT], adapter = {} } = {}) => {
  const accountRows = new Map();
  const AccountModel = {
    findAll: vi.fn(async () => accounts.map((a) => {
      const row = accountRows.get(a.id) || makeRow(a);
      accountRows.set(a.id, row);
      return row;
    })),
    findByPk: vi.fn(async (id) => {
      const a = accounts.find(x => String(x.id) === String(id));
      if (!a) return null;
      const row = accountRows.get(a.id) || makeRow(a);
      accountRows.set(a.id, row);
      return row;
    }),
    create: vi.fn(async (payload) => makeRow({ id: 'native-account-1', ...payload })),
    update: vi.fn(async () => [1]),
  };
  const jobRows = [];
  const JobModel = {
    findAll: vi.fn(async () => jobRows),
    findByPk: vi.fn(async (id) => jobRows.find(j => String(j.id) === String(id)) || null),
    create: vi.fn(async (payload) => {
      const row = makeRow({ id: `job-${jobRows.length + 1}`, ...payload });
      jobRows.push(row);
      return row;
    }),
  };
  const AttemptModel = {
    findAll: vi.fn(async () => []),
    create: vi.fn(async (payload) => makeRow({ id: 'attempt-1', ...payload })),
  };

  return {
    service: createNativeSocialPublishingService({
      AccountModel,
      JobModel,
      AttemptModel,
      providerAdapters: { bluesky: adapter },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'access-jwt', serviceUrl: 'https://bsky.social' })),
      encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'TEST' })),
      isCredentialStoreReady: vi.fn(() => true),
    }),
    AccountModel,
    JobModel,
    AttemptModel,
    accountRows,
    jobRows,
  };
};

/** An adapter that always fails the way an expired Bluesky token actually fails. */
const expiredTokenAdapter = {
  publish: vi.fn(async () => {
    throw new Error('Bluesky createRecord failed (401): ExpiredToken');
  }),
};

const okAdapter = {
  publish: vi.fn(async () => ({ provider: 'bluesky', providerPostId: 'at://x', status: 'published', raw: {} })),
};

describe('immediate publish must leave a durable, reachable record', () => {
  it('creates a Job for an immediate post so it can appear in history', async () => {
    const { service, JobModel } = makeService({ adapter: okAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    expect(JobModel.create).toHaveBeenCalledTimes(1);
  });

  it('never creates that Job in a claimable state, or the worker double-posts', async () => {
    const { service, JobModel } = makeService({ adapter: okAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    const created = JobModel.create.mock.calls[0][0];
    // runDueJobs claims WHERE status='scheduled' AND scheduledAt <= now.
    expect(created.status).not.toBe('scheduled');
  });

  it('moves the Job to a terminal status carrying the per-platform truth', async () => {
    const { service, jobRows } = makeService({ adapter: okAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    const job = jobRows[0];
    expect(job.update).toHaveBeenCalled();
    const patch = job.update.mock.calls.at(-1)[0];
    expect(patch.status).toBe('published');
    expect(Array.isArray(patch.platformResults)).toBe(true);
    expect(patch.platformResults[0]).toEqual(expect.objectContaining({ accountId: 'acct-1', status: 'published' }));
  });

  it('parents every Attempt row to that Job instead of orphaning it', async () => {
    const { service, AttemptModel } = makeService({ adapter: okAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    expect(AttemptModel.create).toHaveBeenCalled();
    for (const [payload] of AttemptModel.create.mock.calls) {
      expect(payload.jobId, 'an Attempt with no jobId is unreachable from history').toBeTruthy();
    }
  });

  it('still records the Job — and the failure — when every platform fails', async () => {
    const { service, JobModel, jobRows } = makeService({ adapter: expiredTokenAdapter });

    const result = await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    expect(result.status).toBe('failed');
    expect(JobModel.create).toHaveBeenCalledTimes(1);
    const patch = jobRows[0].update.mock.calls.at(-1)[0];
    expect(patch.status).toBe('failed');
    expect(patch.failureReason).toMatch(/401/);
  });

  it('does not strand a Job in a running state when the publish throws outright', async () => {
    // A throw out of publishToAccounts must still land the Job in a terminal
    // state; otherwise the fix introduces a new orphan class no reaper handles.
    const throwingAdapter = {
      get publish() { throw new Error('adapter exploded before any attempt'); },
    };
    const { service, jobRows } = makeService({ adapter: throwingAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 }).catch(() => {});

    if (jobRows.length) {
      const patch = jobRows[0].update.mock.calls.at(-1)?.[0];
      expect(patch?.status, 'a Job must never be left in running/scheduled after a throw').not.toBe('running');
    }
  });
});

describe('account health must reflect reality', () => {
  it('marks the account as needing reconnection when the token is rejected', async () => {
    const { service, accountRows } = makeService({ adapter: expiredTokenAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    const row = accountRows.get('acct-1');
    expect(row, 'the account row should have been loaded').toBeTruthy();
    expect(row.update, 'an auth failure must not leave the account claiming "connected"').toHaveBeenCalled();
    const patch = row.update.mock.calls.at(-1)[0];
    expect(patch.status).toBe('needs_reconnect');
  });

  it('does NOT demote the account for an ordinary non-auth failure', async () => {
    const rateLimited = { publish: vi.fn(async () => { throw new Error('Bluesky createRecord failed (429): RateLimitExceeded'); }) };
    const { service, accountRows } = makeService({ adapter: rateLimited });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    const row = accountRows.get('acct-1');
    const demoted = (row?.update.mock.calls || []).some(([p]) => p?.status === 'needs_reconnect');
    expect(demoted, 'a rate limit is not a broken connection').toBe(false);
  });

  it('leaves a healthy account alone on success', async () => {
    const { service, accountRows } = makeService({ adapter: okAdapter });

    await service.publish({ content: 'hello', platformIds: ['acct-1'] }, { userId: 1 });

    const row = accountRows.get('acct-1');
    const demoted = (row?.update.mock.calls || []).some(([p]) => p?.status === 'needs_reconnect');
    expect(demoted).toBe(false);
  });
});

describe('recording an attempt must never rewrite the outcome', () => {
  it('still publishes to every platform when the attempt write fails', async () => {
    // Unguarded, a throw from the success-path AttemptModel.create landed in the
    // catch, whose own create threw again and propagated out of the loop — so
    // remaining platforms were never tried and a post that DID go out surfaced
    // as a 500. This also exercises the logger path, which was referenced
    // without being imported and would have crashed only in production.
    const { service, AttemptModel } = makeService({
      accounts: [ACCOUNT, { ...ACCOUNT, id: 'acct-2' }],
      adapter: okAdapter,
    });
    AttemptModel.create.mockRejectedValue(new Error('relation "social_publishing_attempts" does not exist'));

    const result = await service.publish({ content: 'hello', platformIds: ['acct-1', 'acct-2'] }, { userId: 1 });

    expect(result.status).toBe('published');
    expect(result.results).toHaveLength(2);
    expect(okAdapter.publish).toHaveBeenCalledTimes(2);
  });
});

describe('one unusable account must not take down the others', () => {
  it('records a per-account failure instead of aborting the whole publish', async () => {
    // loadAccounts used to THROW for a non-connected account, and the loads run
    // under Promise.all — so a single stale connection aborted every platform
    // before any was attempted. Demoting accounts on auth failure made that
    // path routinely reachable.
    const { service } = makeService({
      accounts: [{ ...ACCOUNT, id: 'acct-1', status: 'needs_reconnect' }, { ...ACCOUNT, id: 'acct-2' }],
      adapter: okAdapter,
    });

    const result = await service.publish({ content: 'hello', platformIds: ['acct-1', 'acct-2'] }, { userId: 1 });

    expect(result.status).toBe('partial_failed');
    const byAccount = Object.fromEntries(result.results.map(r => [r.accountId, r]));
    expect(byAccount['acct-1'].status).toBe('failed');
    expect(byAccount['acct-1'].error).toMatch(/not connected/);
    expect(byAccount['acct-2'].status).toBe('published');
  });

  it('still rejects a genuinely unknown account id as a bad request', async () => {
    const { service } = makeService({ accounts: [ACCOUNT], adapter: okAdapter });

    await expect(service.publish({ content: 'hello', platformIds: ['nope'] }, { userId: 1 }))
      .rejects.toThrow(/not found/);
  });
});

describe('history must be ordered by what happened, not by what is planned', () => {
  it('asks the store for creation order, not scheduledAt order', async () => {
    // Sorting a HISTORY view by scheduledAt puts a post scheduled for next week
    // — which has not gone out at all — above one published a minute ago. That
    // was invisible while only scheduled jobs lived here; recording immediate
    // posts makes it the normal case.
    const { service, JobModel } = makeService({ adapter: okAdapter });

    await service.getHistory(20);

    expect(JobModel.findAll).toHaveBeenCalled();
    const query = JobModel.findAll.mock.calls.at(-1)[0];
    const orderFields = (query.order || []).map(([field]) => field);
    expect(orderFields[0]).toBe('createdAt');
    expect(orderFields).not.toContain('scheduledAt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RETRY. Keeping the draft on a partial failure (the previous slice) made the
// natural recovery — press Publish again — re-post to the platforms that already
// succeeded. Retry is scoped to the ORIGINAL job and skips accounts that already
// have a published Attempt for it, so recovery cannot duplicate.
// ─────────────────────────────────────────────────────────────────────────────

/** A job that half-succeeded: acct-1 published, acct-2 failed. */
const partialJob = () => ({
  id: 'job-1',
  content: 'hello world',
  status: 'partial_failed',
  scheduledAt: new Date('2026-08-12T12:00:00Z'),
  platformAccountIds: ['acct-1', 'acct-2'],
  media: [],
  complianceSnapshot: {},
  platformResults: [
    { provider: 'bluesky', accountId: 'acct-1', status: 'published', providerPostId: 'at://one' },
    { provider: 'bluesky', accountId: 'acct-2', status: 'failed', error: 'rate limited' },
  ],
});

const makeRetryService = ({ job = partialJob(), publishedAccountIds = ['acct-1'], adapter = okAdapter } = {}) => {
  const accounts = [{ ...ACCOUNT, id: 'acct-1' }, { ...ACCOUNT, id: 'acct-2' }];
  const jobRow = makeRow(job);
  const attempts = publishedAccountIds.map(accountId => ({ jobId: job.id, accountId, provider: 'bluesky', status: 'published' }));
  const AttemptModel = {
    findAll: vi.fn(async () => attempts.map(makeRow)),
    create: vi.fn(async (p) => makeRow({ id: 'attempt-x', ...p })),
  };
  const AccountModel = {
    findAll: vi.fn(async () => accounts.map(makeRow)),
    findByPk: vi.fn(async (id) => { const a = accounts.find(x => x.id === id); return a ? makeRow(a) : null; }),
    create: vi.fn(async () => makeRow({})),
  };
  const JobModel = {
    findByPk: vi.fn(async (id) => (String(id) === String(job.id) ? jobRow : null)),
    findAll: vi.fn(async () => [jobRow]),
    create: vi.fn(async () => makeRow({ id: 'should-not-be-called' })),
  };
  return {
    service: createNativeSocialPublishingService({
      AccountModel, JobModel, AttemptModel,
      providerAdapters: { bluesky: adapter },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'x', serviceUrl: 'https://bsky.social' })),
      encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'T' })),
      isCredentialStoreReady: vi.fn(() => true),
    }),
    jobRow, JobModel, AttemptModel, adapter,
  };
};

describe('retrying a partial failure must not re-post what already went out', () => {
  it('publishes ONLY to the account that failed', async () => {
    const { service, adapter } = makeRetryService();

    await service.retryJob('job-1', { userId: 1 });

    expect(adapter.publish).toHaveBeenCalledTimes(1);
    const accountsTried = adapter.publish.mock.calls.map(([arg]) => arg.account.id);
    expect(accountsTried).toEqual(['acct-2']);
    expect(accountsTried, 'acct-1 already published — retrying it duplicates the post').not.toContain('acct-1');
  });

  it('updates the ORIGINAL job rather than creating a second one', async () => {
    const { service, JobModel, jobRow } = makeRetryService();

    await service.retryJob('job-1', { userId: 1 });

    expect(JobModel.create).not.toHaveBeenCalled();
    expect(jobRow.update).toHaveBeenCalled();
  });

  it('keeps the earlier success in platformResults instead of forgetting it', async () => {
    const { service, jobRow } = makeRetryService();

    await service.retryJob('job-1', { userId: 1 });

    const patch = jobRow.update.mock.calls.at(-1)[0];
    expect(patch.status).toBe('published');
    const byAccount = Object.fromEntries((patch.platformResults || []).map(r => [r.accountId, r.status]));
    expect(byAccount['acct-1'], 'the original success must survive the retry').toBe('published');
    expect(byAccount['acct-2']).toBe('published');
  });

  it('reports still-partial when the retry fails again', async () => {
    const stillFailing = { publish: vi.fn(async () => { throw new Error('rate limited'); }) };
    const { service, jobRow } = makeRetryService({ adapter: stillFailing });

    const result = await service.retryJob('job-1', { userId: 1 });

    expect(result.status).toBe('partial_failed');
    const patch = jobRow.update.mock.calls.at(-1)[0];
    expect(patch.status).toBe('partial_failed');
  });

  it('is a no-op on a job where every platform already published', async () => {
    const { service, adapter } = makeRetryService({ publishedAccountIds: ['acct-1', 'acct-2'] });

    const result = await service.retryJob('job-1', { userId: 1 });

    expect(adapter.publish).not.toHaveBeenCalled();
    expect(result.status).toBe('published');
  });

  it('rejects an unknown job rather than silently doing nothing', async () => {
    const { service } = makeRetryService();

    await expect(service.retryJob('nope', { userId: 1 })).rejects.toThrow(/not found/i);
  });

  it('never leaves the job in running after a retry', async () => {
    const { service, jobRow } = makeRetryService();

    await service.retryJob('job-1', { userId: 1 });

    const statuses = jobRow.update.mock.calls.map(([p]) => p.status);
    expect(statuses.at(-1)).not.toBe('running');
  });
});
