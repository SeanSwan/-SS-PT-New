/**
 * Social publish fan-out — Bluesky session refresh
 * ================================================
 * `refreshBlueskySession` existed, was exported, and had ZERO call sites
 * anywhere in the codebase. Bluesky access tokens expire, so every connected
 * account was on a countdown: the first publish after expiry 401'd, the account
 * was demoted to 'needs_reconnect', and Sean had to re-enter an app password.
 * The demotion made the death visible; nothing ever prevented it.
 *
 * The rules encoded here:
 *  1. an auth failure tries a refresh BEFORE giving up on the account,
 *  2. the rotated credentials are persisted — an AT Protocol refresh returns a
 *     NEW refreshJwt, so failing to store it means the next expiry has nothing
 *     usable to refresh with,
 *  3. exactly ONE refresh per account per publish — a credential that still
 *     401s after refreshing is genuinely dead, and looping would hammer the
 *     provider,
 *  4. a failed refresh must not read like a failed POST. "your connection
 *     expired, reconnect it" and "the post did not go out" are different
 *     problems with different fixes, and
 *  5. a rate limit is not an auth failure and must not trigger either path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSocialPublishFanOut } from '../../services/socialPublishFanOut.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * `update` must mutate the ROW the test later inspects, not a captured copy.
 * The first draft assigned into the closed-over `data`, so `row.status` never
 * changed and "does NOT demote the account" passed vacuously — it could not
 * have observed a demotion if one had happened.
 */
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

const ACCOUNT = {
  id: 'acct-1',
  provider: 'bluesky',
  status: 'connected',
  providerAccountId: 'did:plc:test',
  credentialCipher: Buffer.from('cipher'),
  credentialIv: Buffer.alloc(12),
  credentialTag: Buffer.alloc(16),
  credentialKeyId: 'KEY1',
};

const authError = () => new Error('Bluesky createRecord failed (401): ExpiredToken');

const makeFanOut = ({ adapter, credentials } = {}) => {
  const rows = new Map();
  const AccountModel = {
    findByPk: vi.fn(async (id) => {
      if (String(id) !== String(ACCOUNT.id)) return null;
      if (!rows.has(ACCOUNT.id)) rows.set(ACCOUNT.id, makeRow({ ...ACCOUNT }));
      return rows.get(ACCOUNT.id);
    }),
  };
  const AttemptModel = { create: vi.fn(async () => ({})) };
  const encryptCredentials = vi.fn(() => ({
    cipher: Buffer.from('new-cipher'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'KEY1',
  }));
  const decryptCredentials = vi.fn(() => credentials ?? {
    accessJwt: 'stale-access', refreshJwt: 'refresh-1', serviceUrl: 'https://bsky.social', did: 'did:plc:test',
  });

  const { publishToAccounts } = createSocialPublishFanOut({
    AccountModel, AttemptModel, providerAdapters: { bluesky: adapter },
    decryptCredentials, encryptCredentials,
  });

  return { publishToAccounts, AccountModel, AttemptModel, encryptCredentials, rows };
};

/** Fails once with 401, then succeeds — an expired token that a refresh fixes. */
const expiresThenWorks = () => {
  const publish = vi.fn()
    .mockRejectedValueOnce(authError())
    .mockResolvedValueOnce({ provider: 'bluesky', providerPostId: 'at://ok', status: 'published', raw: {} });
  return {
    publish,
    refreshSession: vi.fn(async () => ({
      did: 'did:plc:test', handle: 'swan', accessJwt: 'fresh-access',
      refreshJwt: 'refresh-2', serviceUrl: 'https://bsky.social',
    })),
  };
};

describe('an expired token is refreshed instead of killing the account', () => {
  it('refreshes and republishes, reporting the post as published', async () => {
    const adapter = expiresThenWorks();
    const { publishToAccounts } = makeFanOut({ adapter });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(adapter.refreshSession).toHaveBeenCalledTimes(1);
    expect(adapter.publish).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('published');
    expect(result.results[0].providerPostId).toBe('at://ok');
  });

  it('does NOT demote an account it just recovered', async () => {
    const adapter = expiresThenWorks();
    const { publishToAccounts, rows } = makeFanOut({ adapter });

    await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(rows.get('acct-1').status).toBe('connected');
  });

  it('persists the ROTATED credentials, including the new refreshJwt', async () => {
    const adapter = expiresThenWorks();
    const { publishToAccounts, encryptCredentials, rows } = makeFanOut({ adapter });

    await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    // AT Protocol rotates the refresh token; storing the old one would leave
    // the account unable to refresh at the NEXT expiry.
    expect(encryptCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ accessJwt: 'fresh-access', refreshJwt: 'refresh-2' }),
    );
    const row = rows.get('acct-1');
    expect(row.update).toHaveBeenCalledWith(
      expect.objectContaining({ credentialCipher: expect.any(Buffer), credentialKeyId: 'KEY1' }),
    );
  });

  it('records ONE attempt for the account, carrying the final outcome', async () => {
    const adapter = expiresThenWorks();
    const { publishToAccounts, AttemptModel } = makeFanOut({ adapter });

    await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'], jobId: 'job-1' });

    expect(AttemptModel.create).toHaveBeenCalledTimes(1);
    expect(AttemptModel.create.mock.calls[0][0]).toMatchObject({ status: 'published' });
  });

  it('refreshes at most once — a token still dead after refresh is dead', async () => {
    const adapter = {
      publish: vi.fn(async () => { throw authError(); }),
      refreshSession: vi.fn(async () => ({
        accessJwt: 'fresh', refreshJwt: 'refresh-2', serviceUrl: 'https://bsky.social',
      })),
    };
    const { publishToAccounts, rows } = makeFanOut({ adapter });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(adapter.refreshSession).toHaveBeenCalledTimes(1);
    expect(adapter.publish).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('failed');
    expect(rows.get('acct-1').status).toBe('needs_reconnect');
  });
});

describe('a failed refresh is a reconnect problem, not a failed post', () => {
  it('says reconnect rather than blaming the post', async () => {
    const adapter = {
      publish: vi.fn(async () => { throw authError(); }),
      refreshSession: vi.fn(async () => { throw new Error('Bluesky refreshSession failed (400): ExpiredToken'); }),
    };
    const { publishToAccounts, rows } = makeFanOut({ adapter });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(result.status).toBe('failed');
    expect(result.results[0].error).toMatch(/reconnect/i);
    expect(rows.get('acct-1').status).toBe('needs_reconnect');
    // The publish must not be retried when there is no usable credential.
    expect(adapter.publish).toHaveBeenCalledTimes(1);
  });

  it('demotes without attempting a refresh when there is no refreshJwt', async () => {
    const adapter = {
      publish: vi.fn(async () => { throw authError(); }),
      refreshSession: vi.fn(),
    };
    const { publishToAccounts, rows } = makeFanOut({
      adapter,
      credentials: { accessJwt: 'stale', serviceUrl: 'https://bsky.social' },
    });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(adapter.refreshSession).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(rows.get('acct-1').status).toBe('needs_reconnect');
  });
});

describe('non-auth failures are left exactly as they were', () => {
  it('does not refresh or demote on a rate limit', async () => {
    const adapter = {
      publish: vi.fn(async () => { throw new Error('Bluesky createRecord failed (429): RateLimitExceeded'); }),
      refreshSession: vi.fn(),
    };
    const { publishToAccounts, rows } = makeFanOut({ adapter });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(adapter.refreshSession).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    // A rate limit is not a broken connection — demoting would make Sean
    // reconnect a perfectly healthy account.
    expect(rows.get('acct-1').status).toBe('connected');
  });

  it('still publishes normally when nothing is wrong', async () => {
    const adapter = {
      publish: vi.fn(async () => ({ provider: 'bluesky', providerPostId: 'at://fine', status: 'published', raw: {} })),
      refreshSession: vi.fn(),
    };
    const { publishToAccounts } = makeFanOut({ adapter });

    const result = await publishToAccounts({ content: 'leg day', accountIds: ['acct-1'] });

    expect(result.status).toBe('published');
    expect(adapter.refreshSession).not.toHaveBeenCalled();
  });
});
