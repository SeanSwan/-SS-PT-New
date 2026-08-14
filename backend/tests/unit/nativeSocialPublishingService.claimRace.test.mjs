/**
 * runDueJobs — the claim must be atomic
 * =====================================
 * The scheduler claimed work with find-then-update: `findAll({status:
 * 'scheduled'})`, then `row.update({status: 'running'})`. Nothing between those
 * two statements stops a second process from finding the same row, so two
 * Render instances would both claim the same job and both publish it — a real
 * duplicate post to a live social account, which is not recoverable by deleting
 * a database row.
 *
 * This was survivable only because the worker happened to run on a single
 * instance with an in-process `running` guard. That is a deployment accident,
 * not a safety property: scaling the service to two instances, or a manual
 * `runDueJobs` while the worker ticks, reintroduces it.
 *
 * The fix is a conditional write — `UPDATE ... SET status='running' WHERE id=?
 * AND status='scheduled'` — and treating "0 rows affected" as "someone else got
 * it", which is the standard single-statement claim. These tests pin the
 * property that matters: **a job whose claim was lost is never published.**
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeSocialPublishingService } from '../../services/nativeSocialPublishingService.mjs';

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

const DUE_JOB = {
  id: 'job-1',
  content: 'leg day',
  status: 'scheduled',
  scheduledAt: new Date(Date.now() - 60_000),
  platformAccountIds: ['acct-1'],
};

/**
 * @param claimResult what the conditional UPDATE reports. `[1]` = we won the
 *   claim, `[0]` = another instance already moved the row out of 'scheduled'.
 */
const makeService = ({ claimResult = [1], publishImpl } = {}) => {
  const jobRow = makeRow({ ...DUE_JOB });
  const JobModel = {
    findAll: vi.fn(async () => [jobRow]),
    findByPk: vi.fn(async () => jobRow),
    create: vi.fn(async (payload) => makeRow({ id: 'job-new', ...payload })),
    update: vi.fn(async () => claimResult),
  };
  const publish = publishImpl || vi.fn(async () => ({
    status: 'published',
    results: [{ provider: 'bluesky', accountId: 'acct-1', status: 'published' }],
  }));
  const AccountModel = {
    findAll: vi.fn(async () => []),
    findByPk: vi.fn(async () => makeRow({
      id: 'acct-1', provider: 'bluesky', status: 'connected', providerAccountId: 'did:plc:x',
    })),
    create: vi.fn(async () => makeRow({ id: 'acct-1' })),
    update: vi.fn(async () => [1]),
  };
  const AttemptModel = { findAll: vi.fn(async () => []), create: vi.fn(async () => ({})) };

  const service = createNativeSocialPublishingService({
    AccountModel,
    JobModel,
    AttemptModel,
    providerAdapters: { bluesky: { publish: publish } },
    decryptCredentials: vi.fn(() => ({ accessJwt: 'a', serviceUrl: 'https://bsky.social' })),
    encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
    isCredentialStoreReady: vi.fn(() => true),
  });

  return { service, JobModel, jobRow, publish };
};

describe('a scheduled job is claimed atomically', () => {
  it('claims with a conditional write guarded on the still-scheduled status', async () => {
    const { service, JobModel } = makeService();

    await service.runDueJobs({ now: new Date() });

    const [values, options] = JobModel.update.mock.calls[0];
    expect(values).toMatchObject({ status: 'running' });
    // Without `status: 'scheduled'` in the WHERE, this is find-then-update
    // wearing a different syntax and two instances still both win.
    expect(options.where).toMatchObject({ id: 'job-1', status: 'scheduled' });
    // Exactly one write may move the job OUT of 'scheduled'. This used to be
    // asserted as "update called once", which broke when the terminal write
    // became conditional too — a stricter guarantee, not a weaker one.
    const claims = JobModel.update.mock.calls
      .filter(([, opts]) => opts?.where?.status === 'scheduled');
    expect(claims).toHaveLength(1);
  });

  it('publishes the job when it wins the claim', async () => {
    const { service, publish } = makeService({ claimResult: [1] });

    const processed = await service.runDueJobs({ now: new Date() });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(processed).toHaveLength(1);
  });

  it('DOES NOT PUBLISH when another instance won the claim', async () => {
    const { service, publish } = makeService({ claimResult: [0] });

    const processed = await service.runDueJobs({ now: new Date() });

    // This is the whole point: losing the race must mean not posting.
    expect(publish).not.toHaveBeenCalled();
    expect(processed).toHaveLength(0);
  });

  it('does not overwrite the winner\'s terminal state after losing the claim', async () => {
    const { service, jobRow } = makeService({ claimResult: [0] });

    await service.runDueJobs({ now: new Date() });

    // The instance that lost must not write status/publishedAt/failedAt — the
    // winner owns that row now.
    expect(jobRow.update).not.toHaveBeenCalled();
  });

  it('keeps processing later jobs after skipping one it lost', async () => {
    const { service, JobModel, publish } = makeService();
    const lost = makeRow({ ...DUE_JOB, id: 'job-lost' });
    const won = makeRow({ ...DUE_JOB, id: 'job-won' });
    JobModel.findAll.mockResolvedValue([lost, won]);
    JobModel.update
      .mockResolvedValueOnce([0])   // lost
      .mockResolvedValueOnce([1]);  // won

    const processed = await service.runDueJobs({ now: new Date() });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(processed.map(p => p.jobId)).toEqual(['job-won']);
  });

  it('records the terminal outcome on the job it did claim', async () => {
    const { service, JobModel } = makeService({ claimResult: [1] });

    await service.runDueJobs({ now: new Date() });

    // The terminal write moved from an unguarded row.update to the same
    // conditional claim used to take the job, so that a reaper which closed
    // this row mid-flight cannot have its verdict silently overwritten.
    const terminal = JobModel.update.mock.calls
      .filter(([patch]) => patch.status === 'published');
    expect(terminal).toHaveLength(1);
    expect(terminal[0][1].where).toMatchObject({ id: 'job-1', status: 'running' });
  });
});
