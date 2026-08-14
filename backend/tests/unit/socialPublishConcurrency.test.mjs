/**
 * Concurrency hazards in the publish path
 * =======================================
 * Written as REPRODUCTIONS during a hostile review of the five social-publishing
 * slices, from an attack list the author of those slices wrote against his own
 * work. Both cases below were reasoned about but never tested; these tests exist
 * to convert "I think this is broken" into evidence before anything is changed.
 *
 * Each `describe` states the harm in terms of what Sean would see, not in terms
 * of the code, because the code is what is on trial here.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import { createSocialPublishFanOut } from '../../services/socialPublishFanOut.mjs';
import { createSocialJobScheduler } from '../../services/socialJobScheduler.mjs';
import { createSocialJobRetry } from '../../services/socialJobRetry.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

const makeRow = (data) => {
  const row = {
    ...data,
    get: vi.fn(() => {
      const { get, update, ...plain } = row;
      return plain;
    }),
    update: vi.fn(async (patch) => {
      Object.assign(row, patch);
      return row;
    }),
  };
  return row;
};

/* ------------------------------------------------------------------ *
 * 4.1 — two publishes to one account with an expired token
 * ------------------------------------------------------------------ */

/**
 * AT Protocol refresh tokens are SINGLE USE. A second refresh presenting an
 * already-consumed refreshJwt is rejected. That is the whole hazard: the loser
 * of the race cannot tell "this account is dead" apart from "someone else just
 * refreshed it a millisecond ago", and the current code treats both as dead.
 */
const makeSingleUseBluesky = () => {
  const consumed = new Set();
  return {
    consumed,
    adapter: {
      publish: vi.fn(async ({ credentials }) => {
        if (credentials.accessJwt === 'stale-access') {
          throw new Error('401 ExpiredToken: token has expired');
        }
        return { providerPostId: `at://posted/${credentials.accessJwt}` };
      }),
      refreshSession: vi.fn(async ({ refreshJwt }) => {
        if (consumed.has(refreshJwt)) {
          // This is exactly what Bluesky returns for a replayed refresh token.
          throw new Error('400 ExpiredToken: refresh token has already been used');
        }
        consumed.add(refreshJwt);
        return { accessJwt: 'fresh-access', refreshJwt: 'R2', serviceUrl: 'https://bsky.social' };
      }),
    },
  };
};

const makeFanOut = () => {
  const accountRow = makeRow({
    id: 'acct-1',
    provider: 'bluesky',
    status: 'connected',
    credentialCipher: Buffer.from('c'),
    credentialIv: Buffer.alloc(12),
    credentialTag: Buffer.alloc(16),
    credentialKeyId: 'K',
  });

  const { adapter, consumed } = makeSingleUseBluesky();

  const fanOut = createSocialPublishFanOut({
    AccountModel: { findByPk: vi.fn(async () => accountRow) },
    AttemptModel: { create: vi.fn(async () => ({})) },
    providerAdapters: { bluesky: adapter },
    // Both concurrent publishes read the SAME stored credential, which is the
    // real-world situation: neither has persisted a rotation yet.
    decryptCredentials: vi.fn(() => ({
      accessJwt: 'stale-access',
      refreshJwt: 'R1',
      serviceUrl: 'https://bsky.social',
    })),
    encryptCredentials: vi.fn(() => ({
      cipher: Buffer.from('c2'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K',
    })),
  });

  return { fanOut, accountRow, adapter, consumed };
};

describe('two posts publishing at the same moment must not kill a healthy account', () => {
  it('does not demote an account that was successfully refreshed by the other publish', async () => {
    const { fanOut, accountRow } = makeFanOut();

    const [a, b] = await Promise.all([
      fanOut.publishToAccounts({ content: 'post A', accountIds: ['acct-1'], jobId: 'job-a' }),
      fanOut.publishToAccounts({ content: 'post B', accountIds: ['acct-1'], jobId: 'job-b' }),
    ]);

    // The account's token WAS refreshed successfully during this window. Telling
    // Sean to reconnect a live account is a false alarm that also stops every
    // later publish, because loadAccounts refuses anything not 'connected'.
    expect(accountRow.status).toBe('connected');
    expect([a.status, b.status]).toEqual(['published', 'published']);
  });

  it('refreshes the session once, not once per concurrent publish', async () => {
    const { fanOut, adapter } = makeFanOut();

    await Promise.all([
      fanOut.publishToAccounts({ content: 'post A', accountIds: ['acct-1'], jobId: 'job-a' }),
      fanOut.publishToAccounts({ content: 'post B', accountIds: ['acct-1'], jobId: 'job-b' }),
    ]);

    // Two refreshes against one single-use token is the definition of the race:
    // the second is guaranteed to fail, and burns a provider call to do it.
    expect(adapter.refreshSession).toHaveBeenCalledTimes(1);
  });
});

/**
 * Single-flight only covers one process. A second Render instance refreshing
 * the same account cannot be seen through an in-memory map, so the failure path
 * re-reads storage to tell "the token was rotated by someone else" apart from
 * "this account is dead". These two tests cover that fallback in both
 * directions, because getting it wrong in either one is harmful: too eager and
 * a dead account looks alive forever, too strict and a live one gets demoted.
 */
describe('a refresh that lost to another instance is not treated as a dead account', () => {
  const makeCrossInstance = ({ storedRefreshJwt }) => {
    const accountRow = makeRow({
      id: 'acct-1',
      provider: 'bluesky',
      status: 'connected',
      credentialCipher: Buffer.from('c'),
      credentialIv: Buffer.alloc(12),
      credentialTag: Buffer.alloc(16),
      credentialKeyId: 'K',
    });

    const adapter = {
      publish: vi.fn(async ({ credentials }) => {
        if (credentials.accessJwt === 'stale-access') throw new Error('401 ExpiredToken');
        return { providerPostId: 'at://ok' };
      }),
      // Always rejects: this instance is the loser of the race by construction.
      refreshSession: vi.fn(async () => {
        throw new Error('400 ExpiredToken: refresh token has already been used');
      }),
    };

    let reads = 0;
    const fanOut = createSocialPublishFanOut({
      AccountModel: { findByPk: vi.fn(async () => accountRow) },
      AttemptModel: { create: vi.fn(async () => ({})) },
      providerAdapters: { bluesky: adapter },
      decryptCredentials: vi.fn(() => {
        reads += 1;
        // First read is the credential this publish starts with; later reads are
        // the fallback re-reading what is in storage NOW.
        return reads === 1
          ? { accessJwt: 'stale-access', refreshJwt: 'R1', serviceUrl: 'https://bsky.social' }
          : { accessJwt: 'other-instance-access', refreshJwt: storedRefreshJwt, serviceUrl: 'https://bsky.social' };
      }),
      encryptCredentials: vi.fn(() => ({
        cipher: Buffer.from('c2'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K',
      })),
    });

    return { fanOut, accountRow, adapter };
  };

  it('uses the credentials another instance stored, instead of demoting', async () => {
    // Storage now holds a DIFFERENT refresh token: somebody rotated it.
    const { fanOut, accountRow } = makeCrossInstance({ storedRefreshJwt: 'R2' });

    const result = await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    expect(result.status).toBe('published');
    expect(accountRow.status).toBe('connected');
  });

  it('still demotes when storage shows the same token we already failed with', async () => {
    // Nothing rotated it: our failure really is conclusive.
    const { fanOut, accountRow } = makeCrossInstance({ storedRefreshJwt: 'R1' });

    const result = await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    expect(result.status).toBe('failed');
    expect(accountRow.status).toBe('needs_reconnect');
  });
});

/* ------------------------------------------------------------------ *
 * 4.2 — the reaper against a publish that is slow rather than dead
 * ------------------------------------------------------------------ */

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

const makeScheduler = ({ heartbeatMs } = {}) => {
  const jobRow = makeRow({
    id: 'job-slow',
    content: 'leg day',
    status: 'scheduled',
    scheduledAt: new Date('2026-08-13T00:00:00Z'),
    updatedAt: new Date('2026-08-13T00:00:00Z'),
    platformAccountIds: ['acct-1', 'acct-2'],
  });

  const JobModel = {
    // Modelled on the real queries, not on convenience: the reaper's staleness
    // filter is honoured here, because a mock that returns the row regardless
    // of updatedAt would let a broken heartbeat pass this suite.
    findAll: vi.fn(async ({ where }) => {
      if (where.status !== jobRow.status) return [];
      const bound = where.updatedAt?.[Op.lte];
      if (bound && new Date(jobRow.updatedAt) > new Date(bound)) return [];
      return [jobRow];
    }),
    findByPk: vi.fn(async () => jobRow),
    update: vi.fn(async (patch, { where }) => {
      if (where.status && where.status !== jobRow.status) return [0];
      // Sequelize maintains updatedAt on every write; the heartbeat depends on
      // that, so the fake must do it too.
      Object.assign(jobRow, { updatedAt: new Date(), ...patch });
      return [1];
    }),
  };

  const gate = deferred();
  const publishToAccounts = vi.fn(async () => {
    await gate.promise;
    return {
      status: 'published',
      results: [
        { accountId: 'acct-1', provider: 'bluesky', status: 'published', providerPostId: 'at://1' },
        { accountId: 'acct-2', provider: 'bluesky', status: 'published', providerPostId: 'at://2' },
      ],
    };
  });

  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const scheduler = createSocialJobScheduler({
    JobModel,
    AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
    publishToAccounts,
    log,
    ...(heartbeatMs ? { heartbeatMs } : {}),
  });

  return { scheduler, JobModel, jobRow, gate, log };
};

describe('a publish that is slow must not be mistaken for a publish that died', () => {
  it('does not close a job whose fan-out is still running', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T00:00:00Z'));
    try {
      const { scheduler, jobRow, gate } = makeScheduler({ heartbeatMs: 60 * 1000 });

      // Worker claims the job and enters the fan-out. It does not return during
      // this window — a handful of slow providers is all this takes.
      const working = scheduler.runDueJobs({ now: new Date() });
      await vi.advanceTimersByTimeAsync(0);

      // An hour of genuinely slow publishing, four times the stuck threshold.
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      await scheduler.reapStuckJobs({ now: new Date() });

      // If the reaper closed it, Sean sees "failed" for a post that is at this
      // instant still going out — and the retry button will re-send it.
      expect(jobRow.status).toBe('running');

      gate.resolve();
      await working;
    } finally {
      vi.useRealTimers();
    }
  });

  it('still reaps a job that genuinely stopped heartbeating', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T00:00:00Z'));
    try {
      // No worker in flight: this is the crashed-process case the reaper exists
      // for. The heartbeat must not have made the reaper toothless.
      const { scheduler, jobRow } = makeScheduler({ heartbeatMs: 60 * 1000 });
      jobRow.status = 'running';
      jobRow.updatedAt = new Date('2026-08-13T00:00:00Z');

      vi.setSystemTime(new Date('2026-08-13T01:00:00Z'));
      const reaped = await scheduler.reapStuckJobs({ now: new Date() });

      expect(reaped).toHaveLength(1);
      expect(jobRow.status).not.toBe('running');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the terminal write guarded so a live worker cannot overwrite a reap', async () => {
    const { scheduler, JobModel, gate } = makeScheduler();

    const working = scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') });
    await Promise.resolve();
    gate.resolve();
    await working;

    // The claim is a conditional UPDATE; the terminal write must be too, or the
    // atomicity the claim buys is given straight back at the end of the job.
    const terminalWrites = JobModel.update.mock.calls.filter(
      ([patch]) => patch.status && patch.status !== 'running',
    );
    expect(terminalWrites.length).toBeGreaterThan(0);
    for (const [, options] of terminalWrites) {
      expect(options.where).toHaveProperty('status');
    }
  });
});

/* ------------------------------------------------------------------ *
 * Found during THIS review, not on the inherited attack list:
 * retry has no idea whether the job is already publishing
 * ------------------------------------------------------------------ */

/**
 * retryJob decides what to re-send from the Attempt ledger, which is written
 * AFTER each provider call returns. A job that is still 'running' therefore has
 * no attempt row yet for the accounts currently in flight — so retry reads them
 * as "never tried" and posts to them a second time.
 *
 * Nothing guards this: neither retryJob nor the route checks job.status. It is
 * reachable by a human pressing a button on a job that looks stuck, and the
 * heartbeat added for 4.2 makes jobs legitimately sit in 'running' for longer,
 * which widens exactly this window.
 */
const makeRetryHarness = ({ status }) => {
  const jobRow = makeRow({
    id: 'job-1',
    content: 'hello',
    status,
    platformAccountIds: ['acct-1', 'acct-2'],
    platformResults: [],
    media: [],
  });

  const JobModel = {
    findByPk: vi.fn(async () => jobRow),
    update: vi.fn(async (patch, { where }) => {
      const wanted = where.status?.[Op.in] ?? (where.status ? [where.status] : null);
      if (wanted && !wanted.includes(jobRow.status)) return [0];
      Object.assign(jobRow, { updatedAt: new Date(), ...patch });
      return [1];
    }),
  };

  const publishToAccounts = vi.fn(async () => ({
    status: 'published',
    results: [
      { accountId: 'acct-1', provider: 'bluesky', status: 'published' },
      { accountId: 'acct-2', provider: 'bluesky', status: 'published' },
    ],
  }));

  const retry = createSocialJobRetry({
    JobModel,
    // No attempt rows: the in-flight publish has not written any yet.
    AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
    publishToAccounts,
  });

  return { retry, publishToAccounts, jobRow };
};

describe('retry must not fire at a job that is already publishing', () => {
  it('refuses to re-publish a job still in running', async () => {
    const { retry, publishToAccounts } = makeRetryHarness({ status: 'running' });

    await expect(retry.retryJob('job-1', { userId: 1 })).rejects.toThrow(/publish|running|progress/i);

    // If this fires, both the worker and the retry are posting the same content
    // to the same live accounts.
    expect(publishToAccounts).not.toHaveBeenCalled();
  });

  it('refuses a job that has not run yet', async () => {
    const { retry, publishToAccounts } = makeRetryHarness({ status: 'scheduled' });

    await expect(retry.retryJob('job-1', { userId: 1 })).rejects.toThrow();
    expect(publishToAccounts).not.toHaveBeenCalled();
  });

  it('still retries a job that genuinely finished failing', async () => {
    const { retry, publishToAccounts } = makeRetryHarness({ status: 'partial_failed' });

    const result = await retry.retryJob('job-1', { userId: 1 });

    expect(publishToAccounts).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('published');
  });
});
