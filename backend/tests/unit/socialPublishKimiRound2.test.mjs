/**
 * Defects the Kimi K3 round-2 review found IN MY OWN FIXES
 * =======================================================
 * Round 1 found six defects; I fixed them. Round 2 was pointed at the fixes,
 * and found five more — two of which make round 1's fixes unsafe rather than
 * merely incomplete.
 *
 * The error strings below are chosen ADVERSARIALLY. My round-1 test for the
 * transient-demotion path used 'ECONNRESET socket hang up', which contains
 * neither of the terms the two regexes disagree on — so it passed while the fix
 * was void for the one class that actually matters. That is the third time in
 * this session I wrote a test that could not fail for its own reason, and it is
 * why these use the strings a real PDS emits.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSocialPublishFanOut } from '../../services/socialPublishFanOut.mjs';
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
    update: vi.fn(async (patch) => { Object.assign(row, patch); return row; }),
  };
  return row;
};

const makeAccountRow = () => makeRow({
  id: 'acct-1',
  provider: 'bluesky',
  status: 'connected',
  credentialCipher: Buffer.from('c'),
  credentialIv: Buffer.alloc(12),
  credentialTag: Buffer.alloc(16),
  credentialKeyId: 'K',
});

const buildFanOut = ({ refreshImpl, refreshTimeoutMs, onPersist }) => {
  const accountRow = makeAccountRow();
  const persisted = [];
  const fanOut = createSocialPublishFanOut({
    AccountModel: { findByPk: vi.fn(async () => accountRow) },
    AttemptModel: { create: vi.fn(async () => ({})) },
    providerAdapters: {
      bluesky: {
        publish: vi.fn(async ({ credentials }) => {
          if (credentials.accessJwt !== 'fresh-access') throw new Error('401 ExpiredToken');
          return { providerPostId: 'at://ok' };
        }),
        refreshSession: refreshImpl,
      },
    },
    decryptCredentials: vi.fn(() => ({ accessJwt: 'stale', refreshJwt: 'R1', serviceUrl: 'https://bsky.social' })),
    encryptCredentials: vi.fn((creds) => {
      persisted.push(creds);
      if (onPersist) onPersist(creds);
      return { cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' };
    }),
    ...(refreshTimeoutMs ? { refreshTimeoutMs } : {}),
  });
  return { fanOut, accountRow, persisted };
};

/* -------- finding 1: a slow refresh that lands late burns the token -------- */

describe('a refresh that lands after we stopped waiting is not thrown away', () => {
  it('persists the rotated credentials even when the wait timed out', async () => {
    let resolveLate;
    const refreshImpl = vi.fn(() => new Promise((res) => { resolveLate = res; }));
    const { fanOut, persisted } = buildFanOut({ refreshImpl, refreshTimeoutMs: 30 });

    const publishing = fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j1' });
    const result = await publishing;
    expect(result.status).toBe('failed'); // we gave up waiting — that part is correct

    // The PDS finishes a moment later. AT Protocol refresh tokens are SINGLE
    // USE, so this call has ALREADY consumed the stored token: if the rotated
    // pair is dropped here, the stored credential is dead, the re-read guard
    // cannot fire (the row never changed), and the next publish demotes a
    // healthy account with no copy of the live credential anywhere.
    resolveLate({ accessJwt: 'fresh-access', refreshJwt: 'R2', serviceUrl: 'https://bsky.social' });
    await new Promise(r => setTimeout(r, 20));

    expect(persisted.some(c => c.refreshJwt === 'R2')).toBe(true);
  });
});

/* -------- finding 2/3: the transient path is defeated by a re-test -------- */

describe('a transient refresh failure does not demote, whatever words it uses', () => {
  // 'Authentication Required' is a real XRPC/proxy string, and it is the ONE
  // term AUTH_FAILURE carries that GRANT_IS_DEAD does not.
  it('does not demote on "Authentication Required" from an edge proxy', async () => {
    const refreshImpl = vi.fn(async () => { throw new Error('Authentication Required'); });
    const { fanOut, accountRow } = buildFanOut({ refreshImpl });

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    expect(accountRow.status).toBe('connected');
  });

  it('does not demote on a bare proxy 403 that never reached the token endpoint', async () => {
    const refreshImpl = vi.fn(async () => { throw new Error('Request failed with status code 403'); });
    const { fanOut, accountRow } = buildFanOut({ refreshImpl });

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    // A WAF event says nothing about the grant. Demoting blocks every later
    // publish until a human reconnects.
    expect(accountRow.status).toBe('connected');
  });

  it('records why the post failed even though it left the account connected', async () => {
    const refreshImpl = vi.fn(async () => { throw new Error('Authentication Required'); });
    const { fanOut, accountRow } = buildFanOut({ refreshImpl });

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    // Not demoting must not mean leaving no trail — otherwise a genuinely dead
    // grant that only ever reports this way fails every post in silence.
    expect(accountRow.lastError).toBeTruthy();
  });

  it('still demotes when the provider names the grant itself', async () => {
    const refreshImpl = vi.fn(async () => { throw new Error('ExpiredToken: Token has expired'); });
    const { fanOut, accountRow } = buildFanOut({ refreshImpl });

    await fanOut.publishToAccounts({ content: 'x', accountIds: ['acct-1'], jobId: 'j' });

    expect(accountRow.status).toBe('needs_reconnect');
  });
});

/* -------- finding 4/5: retry returns unqualified success when it lost -------- */

describe('a retry that lost the terminal write does not report plain success', () => {
  const buildRetry = ({ closedWins }) => {
    const jobRow = makeRow({
      id: 'job-1',
      content: 'hello',
      status: 'partial_failed',
      platformAccountIds: ['acct-1'],
      platformResults: [],
      media: [],
    });
    const JobModel = {
      findByPk: vi.fn(async () => jobRow),
      update: vi.fn(async (patch, { where }) => {
        // The claim into 'running' succeeds; the TERMINAL write is the one the
        // reaper may have taken from us.
        if (patch.status === 'running') { Object.assign(jobRow, patch); return [1]; }
        if (!closedWins) return [0];
        Object.assign(jobRow, patch);
        return [1];
      }),
    };
    const retry = createSocialJobRetry({
      JobModel,
      AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
      publishToAccounts: vi.fn(async () => ({
        status: 'published',
        results: [{ accountId: 'acct-1', provider: 'bluesky', status: 'published' }],
      })),
    });
    return { retry, jobRow };
  };

  it('flags the divergence when another writer already closed the job', async () => {
    const { retry } = buildRetry({ closedWins: false });

    const result = await retry.retryJob('job-1', { userId: 1 });

    // The operator using Retry is a human recovering from a failure. Handing
    // them an unqualified 'published' while the stored record says failed makes
    // their obvious next move — publish again — a duplicate post.
    expect(result.recordedVerdictDiverged).toBe(true);
    expect(result.status).not.toBe('published');
  });

  it('reports plain success when it did own the write', async () => {
    const { retry } = buildRetry({ closedWins: true });

    const result = await retry.retryJob('job-1', { userId: 1 });

    expect(result.status).toBe('published');
    expect(result.recordedVerdictDiverged).toBeUndefined();
  });
});
