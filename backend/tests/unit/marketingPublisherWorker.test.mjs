/**
 * Marketing Publisher Worker - Unit Tests
 * =======================================
 * Ensures scheduled native publishing jobs have a real server-side runner.
 */

import { describe, expect, it, vi } from 'vitest';

describe('marketingPublisherWorker', () => {
  it('runs due native publishing jobs once on demand', async () => {
    const service = { runDueJobs: vi.fn(async () => [{ jobId: 'job-1', status: 'published' }]) };
    const { createMarketingPublisherWorker } = await import('../../jobs/marketingPublisherWorker.mjs');
    const worker = createMarketingPublisherWorker({ service, intervalMs: 60000 });

    await expect(worker.runOnce()).resolves.toEqual([{ jobId: 'job-1', status: 'published' }]);
    expect(service.runDueJobs).toHaveBeenCalledWith({ limit: 10 });
  });

  it('does not start an interval when disabled by env', async () => {
    const service = { runDueJobs: vi.fn() };
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { createMarketingPublisherWorker } = await import('../../jobs/marketingPublisherWorker.mjs');
    const worker = createMarketingPublisherWorker({ service, enabled: false });

    worker.start();

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('backs off when native social publishing storage is unavailable', async () => {
    const missingTableError = new Error('relation "social_publishing_jobs" does not exist');
    missingTableError.code = '42P01';
    const service = { runDueJobs: vi.fn(async () => { throw missingTableError; }) };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const { createMarketingPublisherWorker } = await import('../../jobs/marketingPublisherWorker.mjs');
    const worker = createMarketingPublisherWorker({ service, intervalMs: 60000, log });

    await expect(worker.runOnce()).resolves.toEqual([]);
    await expect(worker.runOnce()).resolves.toEqual([]);

    expect(service.runDueJobs).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('worker disabled'),
      expect.objectContaining({ reason: 'storage_unavailable' }),
    );
    expect(log.error).not.toHaveBeenCalled();
  });
});
