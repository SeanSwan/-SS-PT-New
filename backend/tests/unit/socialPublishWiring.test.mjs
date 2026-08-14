/**
 * The scheduler and the fan-out, composed for real
 * ================================================
 * Every other test in this area injects a fake `publishToAccounts`, which means
 * none of them can see a wiring mistake BETWEEN the scheduler and the fan-out —
 * the seam where the media regression actually lived. This one wires the two
 * real modules together and fakes only the outermost edges (models, provider
 * adapter), so what it proves is that a value handed to the scheduler reaches
 * the provider.
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
    update: vi.fn(async (patch) => { Object.assign(row, patch); return row; }),
  };
  return row;
};

const wire = ({ media }) => {
  const jobRow = makeRow({
    id: 'job-1',
    content: 'leg day',
    status: 'scheduled',
    scheduledAt: new Date('2026-08-13T00:00:00Z'),
    updatedAt: new Date('2026-08-13T00:00:00Z'),
    platformAccountIds: ['acct-1'],
    media,
  });
  const accountRow = makeRow({
    id: 'acct-1',
    provider: 'bluesky',
    status: 'connected',
    credentialCipher: Buffer.from('c'),
    credentialIv: Buffer.alloc(12),
    credentialTag: Buffer.alloc(16),
    credentialKeyId: 'K',
  });

  const publish = vi.fn(async () => ({ providerPostId: 'at://posted' }));

  // The REAL fan-out, not a stand-in.
  const { publishToAccounts } = createSocialPublishFanOut({
    AccountModel: { findByPk: vi.fn(async () => accountRow) },
    AttemptModel: { create: vi.fn(async () => ({})) },
    providerAdapters: { bluesky: { publish } },
    decryptCredentials: vi.fn(() => ({ accessJwt: 'ok' })),
    encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
  });

  const scheduler = createSocialJobScheduler({
    JobModel: {
      findAll: vi.fn(async ({ where }) => (where.status === jobRow.status ? [jobRow] : [])),
      findByPk: vi.fn(async () => jobRow),
      update: vi.fn(async (patch, { where }) => {
        if (where.status && where.status !== jobRow.status) return [0];
        Object.assign(jobRow, { updatedAt: new Date(), ...patch });
        return [1];
      }),
    },
    AttemptModel: { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) },
    publishToAccounts,
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  return { scheduler, publish, jobRow };
};

describe('a scheduled job reaches the provider with everything it was given', () => {
  it('carries the media url all the way through to the adapter', async () => {
    const { scheduler, publish } = wire({ media: [{ url: 'https://cdn.example/img.jpg' }] });

    await scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') });

    expect(publish).toHaveBeenCalledTimes(1);
    // A mock at the scheduler/fan-out seam cannot prove this; the media
    // regression lived exactly here.
    expect(publish.mock.calls[0][0].mediaUrl).toBe('https://cdn.example/img.jpg');
  });

  it('publishes a text-only job without inventing a media url', async () => {
    const { scheduler, publish } = wire({ media: [] });

    await scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') });

    expect(publish.mock.calls[0][0].mediaUrl).toBeUndefined();
  });

  it('records the job as published through the real result rollup', async () => {
    const { scheduler, jobRow } = wire({ media: [{ url: 'https://cdn.example/img.jpg' }] });

    await scheduler.runDueJobs({ now: new Date('2026-08-13T00:00:00Z') });

    expect(jobRow.status).toBe('published');
  });
});
