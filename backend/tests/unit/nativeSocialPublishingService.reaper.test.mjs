/**
 * reapStuckJobs — recover a job whose process died mid-publish
 * ============================================================
 * A publish moves its Job to 'running' and back to a terminal status. If the
 * process dies in between — a Render deploy, an OOM, a crash — the row stays
 * 'running' forever. Nothing reaped it: the claim query only looks at
 * 'scheduled', so the job was invisible to the worker and, because history
 * shows the Job's status, it read as permanently in-flight.
 *
 * THE DANGEROUS FIX IS REQUEUEING, AND THIS DELIBERATELY DOES NOT DO IT.
 * The fan-out writes its Attempt row AFTER the provider call returns, so a
 * crash in that window leaves a post that really went out with no Attempt to
 * show for it. Absence of evidence is not evidence the post failed — putting
 * the job back to 'scheduled' would re-post to live accounts.
 *
 * So the reaper only ever CLOSES a job, reconstructing what it can from the
 * Attempt ledger and saying plainly, per account, where the truth is unknown.
 * Recovery from there is the operator's existing evidence-based retry, which
 * skips accounts with a recorded success.
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

const STUCK_JOB = {
  id: 'job-stuck',
  content: 'leg day',
  status: 'running',
  scheduledAt: new Date('2026-08-13T00:00:00Z'),
  updatedAt: new Date('2026-08-13T00:00:00Z'),
  platformAccountIds: ['acct-1', 'acct-2'],
};

const NOW = new Date('2026-08-13T01:00:00Z'); // an hour later

const makeService = ({ job = STUCK_JOB, attempts = [], claimResult = [1] } = {}) => {
  const jobRow = makeRow({ ...job });
  const JobModel = {
    findAll: vi.fn(async () => [jobRow]),
    findByPk: vi.fn(async () => jobRow),
    create: vi.fn(async (p) => makeRow({ id: 'job-new', ...p })),
    update: vi.fn(async () => claimResult),
  };
  const AttemptModel = {
    findAll: vi.fn(async () => attempts.map(makeRow)),
    create: vi.fn(async () => ({})),
  };
  const publish = vi.fn(async () => ({ status: 'published', results: [] }));
  const AccountModel = {
    findAll: vi.fn(async () => []),
    findByPk: vi.fn(async () => makeRow({ id: 'acct-1', provider: 'bluesky', status: 'connected' })),
    create: vi.fn(async () => makeRow({ id: 'acct-1' })),
    update: vi.fn(async () => [1]),
  };

  const service = createNativeSocialPublishingService({
    AccountModel,
    JobModel,
    AttemptModel,
    providerAdapters: { bluesky: { publish } },
    decryptCredentials: vi.fn(() => ({ accessJwt: 'a' })),
    encryptCredentials: vi.fn(() => ({ cipher: Buffer.from('c'), iv: Buffer.alloc(12), tag: Buffer.alloc(16), keyId: 'K' })),
    isCredentialStoreReady: vi.fn(() => true),
  });

  return { service, JobModel, AttemptModel, jobRow, publish };
};

describe('a stuck job is closed, never re-sent', () => {
  it('never publishes anything while reaping', async () => {
    const { service, publish } = makeService({
      attempts: [{ jobId: 'job-stuck', accountId: 'acct-1', provider: 'bluesky', status: 'failed', error: 'boom' }],
    });

    await service.reapStuckJobs({ now: NOW });

    expect(publish).not.toHaveBeenCalled();
  });

  it('never puts the job back into a claimable state', async () => {
    const { service, JobModel } = makeService();

    await service.reapStuckJobs({ now: NOW });

    const written = JobModel.update.mock.calls.map(call => call[0].status);
    // 'scheduled' here would mean the worker re-publishes a post that may
    // already have gone out.
    expect(written).not.toContain('scheduled');
  });

  it('only considers jobs that have been running longer than the threshold', async () => {
    const { service, JobModel } = makeService();

    await service.reapStuckJobs({ now: NOW, stuckAfterMs: 15 * 60 * 1000 });

    const where = JobModel.findAll.mock.calls[0][0].where;
    expect(where.status).toBe('running');
    // A job that started 10 seconds ago is not stuck, it is working.
    expect(where.updatedAt).toBeDefined();
  });

  it('closes as published when every account has a recorded success', async () => {
    const { service, JobModel } = makeService({
      attempts: [
        { jobId: 'job-stuck', accountId: 'acct-1', provider: 'bluesky', status: 'published', providerPostId: 'at://1' },
        { jobId: 'job-stuck', accountId: 'acct-2', provider: 'bluesky', status: 'published', providerPostId: 'at://2' },
      ],
    });

    await service.reapStuckJobs({ now: NOW });

    expect(JobModel.update.mock.calls[0][0]).toMatchObject({ status: 'published' });
  });

  it('closes as partial_failed when only some accounts succeeded', async () => {
    const { service, JobModel } = makeService({
      attempts: [
        { jobId: 'job-stuck', accountId: 'acct-1', provider: 'bluesky', status: 'published', providerPostId: 'at://1' },
        { jobId: 'job-stuck', accountId: 'acct-2', provider: 'bluesky', status: 'failed', error: 'ExpiredToken' },
      ],
    });

    await service.reapStuckJobs({ now: NOW });

    expect(JobModel.update.mock.calls[0][0]).toMatchObject({ status: 'partial_failed' });
  });

  it('says the outcome is UNKNOWN for an account with no attempt row', async () => {
    const { service, JobModel } = makeService({
      attempts: [
        { jobId: 'job-stuck', accountId: 'acct-1', provider: 'bluesky', status: 'published', providerPostId: 'at://1' },
      ],
    });

    await service.reapStuckJobs({ now: NOW });

    const results = JobModel.update.mock.calls[0][0].platformResults;
    const unknown = results.find(r => String(r.accountId) === 'acct-2');
    // The attempt row is written AFTER the provider call, so silence here does
    // NOT mean the post failed — claiming it did would be a lie in the history.
    expect(unknown.error).toMatch(/unknown/i);
    expect(unknown.status).not.toBe('published');
  });

  it('preserves the provider post id of work that did land', async () => {
    const { service, JobModel } = makeService({
      attempts: [
        { jobId: 'job-stuck', accountId: 'acct-1', provider: 'bluesky', status: 'published', providerPostId: 'at://kept' },
        { jobId: 'job-stuck', accountId: 'acct-2', provider: 'bluesky', status: 'published', providerPostId: 'at://kept2' },
      ],
    });

    await service.reapStuckJobs({ now: NOW });

    const results = JobModel.update.mock.calls[0][0].platformResults;
    expect(results.find(r => String(r.accountId) === 'acct-1').providerPostId).toBe('at://kept');
  });

  it('closes atomically, guarded on the job still being running', async () => {
    const { service, JobModel } = makeService();

    await service.reapStuckJobs({ now: NOW });

    const options = JobModel.update.mock.calls[0][1];
    // Two reapers, or a reaper racing a worker that revived, must not both write.
    expect(options.where).toMatchObject({ id: 'job-stuck', status: 'running' });
  });

  it('reports nothing reaped when another reaper won the row', async () => {
    const { service } = makeService({ claimResult: [0] });

    const reaped = await service.reapStuckJobs({ now: NOW });

    expect(reaped).toHaveLength(0);
  });
});
