/**
 * Defects found by the Kimi K3 hostile review, 2026-08-14
 * ======================================================
 * A paid external review of the concurrency work. Every finding below was
 * independently verified against the code before a line of this file was
 * written — an external model's output is a hypothesis, not a defect report.
 * The findings it raised that turned out to be latent, architectural, or
 * pre-existing design tradeoffs are recorded in the review document rather
 * than fixed here.
 *
 * These are reproductions: each one fails against the code as shipped.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSocialPublishFanOut } from '../../services/socialPublishFanOut.mjs';
import { createSocialJobScheduler } from '../../services/socialJobScheduler.mjs';

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

const makeJobModel = (rows) => ({
  findAll: vi.fn(async ({ where }) => rows.filter(r => r.status === where.status)),
  findByPk: vi.fn(async (id) => rows.find(r => String(r.id) === String(id)) || null),
  update: vi.fn(async (patch, { where }) => {
    const row = rows.find(r => String(r.id) === String(where.id));
    if (!row) return [0];
    if (where.status && where.status !== row.status) return [0];
    Object.assign(row, { updatedAt: new Date(), ...patch });
    return [1];
  }),
});

const silentLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

const makeAccountRow = () => makeRow({
  id: 'acct-1',
  provider: 'bluesky',
  status: 'connected',
  credentialCipher: Buffer.from('c'),
  credentialIv: Buffer.alloc(12),
  credentialTag: Buffer.alloc(16),
  credentialKeyId: 'K',
});

/* ---------------- finding 5: scheduled posts lose their media ---------------- */

describe('a scheduled post goes out with the media it was created with', () => {
  it('passes the stored media url to the fan-out', async () => {
    const jobRow = makeRow({
      id: 'job-media',
      content: 'leg day',
      status: 'scheduled',
      scheduledAt: new Date('2026-08-13T00:00:00Z'),
      updatedAt: new Date('2026-08-13T00:00:00Z'),
      platformAccountIds: ['acct-1'],
      media: [{ url: 'https://cdn.example/img.jpg' }],
    });
    const publishToAccounts = vi.fn(async () => ({ status: 'published', results: [] }));
    const scheduler = createSocialJobScheduler({
      JobModel: makeJobModel([jobRow]),
      AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
      publishToAccounts,
      log: silentLog(),
    });

    await scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') });

    // The immediate path and retry both pass media; only the scheduler did not.
    // The job STORES the media and the scheduler simply never read it, so every
    // scheduled post with an image published as text — silently, and a post
    // that has gone out cannot be un-posted.
    expect(publishToAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ mediaUrl: 'https://cdn.example/img.jpg' }),
    );
  });
});

/* ---------------- finding 7: a throwing fan-out strands the job ---------------- */

describe('a fan-out that throws does not strand the job in running', () => {
  it('writes a terminal status when the fan-out throws outright', async () => {
    const jobRow = makeRow({
      id: 'job-throw',
      content: 'leg day',
      status: 'scheduled',
      scheduledAt: new Date('2026-08-13T00:00:00Z'),
      updatedAt: new Date('2026-08-13T00:00:00Z'),
      platformAccountIds: ['acct-1'],
    });
    const scheduler = createSocialJobScheduler({
      JobModel: makeJobModel([jobRow]),
      AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
      // Reachable today: loadAccounts throws for an account id that was deleted.
      publishToAccounts: vi.fn(async () => { throw new Error('Social account acct-1 not found'); }),
      log: silentLog(),
    });

    await scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') }).catch(() => {});

    // Left in 'running', the reaper closes it 15 minutes later as UNKNOWN —
    // telling the operator "this may have gone out" when nothing was ever sent.
    expect(jobRow.status).toBe('failed');
  });

  it('keeps publishing the rest of the batch after one job throws', async () => {
    const bad = makeRow({
      id: 'job-bad', content: 'a', status: 'scheduled',
      platformAccountIds: ['x'], updatedAt: new Date(), scheduledAt: new Date(),
    });
    const good = makeRow({
      id: 'job-good', content: 'b', status: 'scheduled',
      platformAccountIds: ['y'], updatedAt: new Date(), scheduledAt: new Date(),
    });
    const publishToAccounts = vi.fn(async ({ jobId }) => {
      if (jobId === 'job-bad') throw new Error('Social account x not found');
      return { status: 'published', results: [{ accountId: 'y', status: 'published' }] };
    });
    const scheduler = createSocialJobScheduler({
      JobModel: makeJobModel([bad, good]),
      AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
      publishToAccounts,
      log: silentLog(),
    });

    const processed = await scheduler.runDueJobs({ now: new Date() });

    // One malformed job must not silently cancel every other due post this tick.
    expect(publishToAccounts).toHaveBeenCalledTimes(2);
    expect(processed.map(p => p.jobId)).toContain('job-good');
  });
});

/* ---------------- finding 6: a hung refresh wedges the account ---------------- */

describe('a hung provider call does not wedge the account forever', () => {
  it('gives up on a refresh that never settles, and frees the slot', async () => {
    const accountRow = makeAccountRow();
    const adapter = {
      publish: vi.fn(async ({ credentials }) => {
        if (credentials.accessJwt === 'stale-access') throw new Error('401 ExpiredToken');
        return { providerPostId: 'at://ok' };
      }),
      // Never settles — a hung PDS socket, and there is no AbortSignal anywhere
      // in the provider layer.
      refreshSession: vi.fn(() => new Promise(() => {})),
    };
    const fanOut = createSocialPublishFanOut({
      AccountModel: { findByPk: vi.fn(async () => accountRow) },
      AttemptModel: { create: vi.fn(async () => ({})) },
      providerAdapters: { bluesky: adapter },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'stale-access', refreshJwt: 'R1', serviceUrl: 'https://bsky.social' })),
      encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
      refreshTimeoutMs: 50,
    });

    // Single-flight makes a hung refresh SHARED: without a timeout the first
    // caller waits forever and every later publish for this account awaits the
    // same promise. That is strictly worse than before single-flight, where
    // each publish at least hung independently — a regression introduced by
    // the fix, which is why it is pinned here.
    const first = await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j1' });
    expect(first.status).toBe('failed');

    // The slot must be free afterwards, or the wedge is merely postponed.
    const second = await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j2' });
    expect(second.status).toBe('failed');
    expect(adapter.refreshSession).toHaveBeenCalledTimes(2);
  });
});

/* ---------------- finding 4: transient refresh errors demote ---------------- */

describe('a transient refresh error is not proof the account is dead', () => {
  const buildFanOut = (refreshError) => {
    const accountRow = makeAccountRow();
    const fanOut = createSocialPublishFanOut({
      AccountModel: { findByPk: vi.fn(async () => accountRow) },
      AttemptModel: { create: vi.fn(async () => ({})) },
      providerAdapters: {
        bluesky: {
          publish: vi.fn(async () => { throw new Error('401 ExpiredToken'); }),
          refreshSession: vi.fn(async () => { throw new Error(refreshError); }),
        },
      },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'stale', refreshJwt: 'R1', serviceUrl: 'https://bsky.social' })),
      encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
    });
    return { fanOut, accountRow };
  };

  it('does NOT demote when the refresh failed for a transport reason', async () => {
    const { fanOut, accountRow } = buildFanOut('ECONNRESET socket hang up');

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    // A dropped socket says nothing about whether the grant is still valid.
    // Demoting here makes Sean reconnect a working account over a blip, and
    // blocks every later publish for it until he does.
    expect(accountRow.status).toBe('connected');
  });

  it('still demotes when the provider says the grant itself is invalid', async () => {
    const { fanOut, accountRow } = buildFanOut('400 invalid_grant: refresh token is not valid');

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    expect(accountRow.status).toBe('needs_reconnect');
  });
});

/* ---------------- finding 2: adapter result clobbers the verdict ---------------- */

describe('an adapter result does not overwrite the outcome the fan-out decided', () => {
  it('keeps status published even when the adapter returns its own status field', async () => {
    const accountRow = makeAccountRow();
    const fanOut = createSocialPublishFanOut({
      AccountModel: { findByPk: vi.fn(async () => accountRow) },
      AttemptModel: { create: vi.fn(async () => ({})) },
      providerAdapters: {
        // An adapter that echoes the HTTP status. Nothing forbids this, and the
        // Bluesky adapter happening to return 'published' is what has masked it.
        bluesky: { publish: vi.fn(async () => ({ providerPostId: 'at://x', status: 201 })) },
      },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'ok' })),
      encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
    });

    const result = await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    // The fan-out decides published/failed; the adapter supplies detail. Spread
    // order let the detail overwrite the verdict, rolling a post that went out
    // up as a failure.
    expect(result.results[0].status).toBe('published');
    expect(result.status).toBe('published');
  });
});
