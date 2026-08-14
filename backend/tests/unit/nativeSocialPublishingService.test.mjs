/**
 * Native Social Publishing Service - Unit Tests
 * =============================================
 * TDD contract for replacing Postiz-required publishing with SwanStudios-owned
 * provider adapters, account records, and scheduled jobs.
 */

import { describe, expect, it, vi } from 'vitest';
import { createNativeSocialPublishingService } from '../../services/nativeSocialPublishingService.mjs';

const makeRow = (data) => ({
  ...data,
  get: vi.fn(() => data),
  update: vi.fn(async (patch) => makeRow({ ...data, ...patch })),
  destroy: vi.fn(async () => undefined),
});

const makeService = ({
  accounts = [],
  jobs = [],
  attempts = [],
  adapter = {},
  isCredentialStoreReady = vi.fn(() => true),
} = {}) => {
  const AccountModel = {
    findAll: vi.fn(async () => accounts.map(makeRow)),
    findByPk: vi.fn(async (id) => {
      const row = accounts.find(account => String(account.id) === String(id));
      return row ? makeRow(row) : null;
    }),
    create: vi.fn(async (payload) => makeRow({ id: 'native-account-1', createdAt: new Date(), updatedAt: new Date(), ...payload })),
  };
  const createdJobRows = [];
  const JobModel = {
    findAll: vi.fn(async () => jobs.map(makeRow)),
    findByPk: vi.fn(async (id) => {
      const row = jobs.find(job => String(job.id) === String(id));
      return row ? makeRow(row) : null;
    }),
    create: vi.fn(async (payload) => {
      const row = makeRow({ id: 'job-1', createdAt: new Date(), updatedAt: new Date(), ...payload });
      createdJobRows.push(row);
      return row;
    }),
    // Writes that move a job out of 'running' are conditional now, so the fake
    // has to honour the WHERE — always reporting one affected row would make a
    // lost claim indistinguishable from a won one.
    update: vi.fn(async (patch, { where } = {}) => {
      const row = createdJobRows.find(r => String(r.id) === String(where?.id))
        || createdJobRows[0];
      if (!row) return [0];
      if (where?.status && where.status !== row.status) return [0];
      Object.assign(row, patch);
      return [1];
    }),
  };
  const AttemptModel = {
    findAll: vi.fn(async () => attempts.map(makeRow)),
    create: vi.fn(async (payload) => makeRow({ id: 'attempt-1', createdAt: new Date(), updatedAt: new Date(), ...payload })),
  };

  return {
    service: createNativeSocialPublishingService({
      AccountModel,
      JobModel,
      AttemptModel,
      providerAdapters: { bluesky: adapter },
      decryptCredentials: vi.fn(() => ({ accessJwt: 'access-jwt', serviceUrl: 'https://bsky.social' })),
      encryptCredentials: vi.fn(() => ({
        cipher: Buffer.from('cipher'),
        iv: Buffer.alloc(12),
        tag: Buffer.alloc(16),
        keyId: 'TEST',
      })),
      isCredentialStoreReady,
    }),
    AccountModel,
    JobModel,
    AttemptModel,
  };
};

describe('nativeSocialPublishingService', () => {
  it('reports native publishing health without requiring Postiz configuration', async () => {
    const { service } = makeService();

    const health = await service.getHealth();

    expect(health).toEqual(expect.objectContaining({
      configured: true,
      mode: 'native',
      postiz: expect.objectContaining({ optional: true, configured: false }),
      providers: expect.arrayContaining([
        expect.objectContaining({ id: 'bluesky', native: true, implementationStatus: 'available' }),
        expect.objectContaining({ id: 'youtube', native: true }),
        expect.objectContaining({ id: 'instagram', native: true }),
        expect.objectContaining({ id: 'facebook', native: true }),
        expect.objectContaining({ id: 'tiktok', native: true }),
        expect.objectContaining({ id: 'nextdoor', native: true }),
      ]),
    }));
  });

  it('reports degraded health instead of throwing when social account storage is unavailable', async () => {
    const { service, AccountModel } = makeService();
    AccountModel.findAll.mockRejectedValueOnce(new Error('relation "SocialPublishingAccounts" does not exist'));

    const health = await service.getHealth();

    expect(health).toEqual(expect.objectContaining({
      configured: false,
      mode: 'native',
      accountCount: 0,
      storage: expect.objectContaining({
        ok: false,
        message: 'Social publishing account storage is unavailable',
      }),
    }));
  });

  it('stores connected Bluesky account metadata with encrypted credentials only', async () => {
    const adapter = {
      createSession: vi.fn(async () => ({
        did: 'did:plc:swan',
        handle: 'swanstudios.bsky.social',
        accessJwt: 'access-jwt',
        refreshJwt: 'refresh-jwt',
        serviceUrl: 'https://bsky.social',
      })),
    };
    const { service, AccountModel } = makeService({ adapter });

    const account = await service.connectBluesky({
      identifier: 'swanstudios.bsky.social',
      appPassword: 'app-password',
    }, { userId: 1 });

    expect(AccountModel.create).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'bluesky',
      providerAccountId: 'did:plc:swan',
      handle: 'swanstudios.bsky.social',
      credentialCipher: Buffer.from('cipher'),
      credentialKeyId: 'TEST',
      createdBy: 1,
    }));
    expect(JSON.stringify(AccountModel.create.mock.calls[0][0])).not.toContain('app-password');
    expect(account).toEqual(expect.objectContaining({
      id: 'native-account-1',
      platform: 'bluesky',
      name: 'swanstudios.bsky.social',
      native: true,
    }));
  });

  it('fails Bluesky connection before provider login when credential encryption is not configured', async () => {
    const adapter = {
      createSession: vi.fn(async () => ({
        did: 'did:plc:swan',
        handle: 'swanstudios.bsky.social',
        accessJwt: 'access-jwt',
        refreshJwt: 'refresh-jwt',
        serviceUrl: 'https://bsky.social',
      })),
    };
    const { service } = makeService({
      adapter,
      isCredentialStoreReady: vi.fn(() => false),
    });

    await expect(service.connectBluesky({
      identifier: 'swanstudios.bsky.social',
      appPassword: 'app-password',
    }, { userId: 1 })).rejects.toThrow('Native credential encryption is not configured');
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  it('creates a scheduled native publishing job instead of calling a third-party scheduler', async () => {
    const { service, JobModel } = makeService({
      accounts: [{ id: 'acct-1', provider: 'bluesky', displayName: 'Swan', status: 'connected' }],
    });

    const result = await service.publish({
      content: 'Scheduled training tip',
      platformIds: ['acct-1'],
      scheduledAt: '2026-06-01T16:00:00.000Z',
    }, { userId: 1, now: new Date('2026-06-01T15:00:00.000Z') });

    expect(JobModel.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Scheduled training tip',
      status: 'scheduled',
      scheduledAt: new Date('2026-06-01T16:00:00.000Z'),
      platformAccountIds: ['acct-1'],
      createdBy: 1,
      source: 'dashboard',
    }));
    expect(result).toEqual(expect.objectContaining({
      status: 'scheduled',
      jobId: 'job-1',
    }));
  });

  it('publishes immediately through the native provider adapter and records attempts', async () => {
    const adapter = {
      publish: vi.fn(async () => ({
        provider: 'bluesky',
        providerPostId: 'at://post/1',
        status: 'published',
      })),
    };
    const { service, AttemptModel } = makeService({
      adapter,
      accounts: [{
        id: 'acct-1',
        provider: 'bluesky',
        providerAccountId: 'did:plc:swan',
        displayName: 'Swan',
        status: 'connected',
      }],
    });

    const result = await service.publish({
      content: 'Immediate training tip',
      platformIds: ['acct-1'],
    }, { userId: 1, now: new Date('2026-06-01T15:00:00.000Z') });

    expect(adapter.publish).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Immediate training tip',
      credentials: { accessJwt: 'access-jwt', serviceUrl: 'https://bsky.social' },
    }));
    expect(AttemptModel.create).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acct-1',
      provider: 'bluesky',
      status: 'published',
      providerPostId: 'at://post/1',
    }));
    expect(result).toEqual(expect.objectContaining({
      status: 'published',
      results: [expect.objectContaining({ providerPostId: 'at://post/1' })],
    }));
  });
});
