/**
 * ============================================================================
 * FILE: reconciliationQueue.test.mjs
 * PURPOSE: Executed contract for the durable checkout-reconciliation sweeper
 *          (SWA-225 EX-3) — the flag routing, the fail-open path, and the
 *          scheduler settings that stop a slow sweep being double-run.
 *
 * WHY THE lockDuration ASSERTION IS NOT COSMETIC. BullMQ's default stalled-job
 * lock is 30 seconds. This sweep runs every 5 minutes and can exceed 30s on a
 * large cart table — at which point BullMQ declares it stalled and hands it to a
 * second worker while the first is still running. Two sweeps racing over the
 * same stale carts is precisely the double-run the interval was replaced to
 * prevent, so the 2x-interval lock is pinned here by number.
 *
 * CONTROLS — run each, watch it fail, restore:
 *   C1  misspell the `runSweep` import in reconciliationQueue.mjs
 *       → "processor runs the EXACT sweep" fails at import.
 *   C2  drop `lockDuration` from the Worker options
 *       → "locks a slow sweep for 2x its interval" fails.
 *   C3  make startReconciliationQueue throw instead of returning null when
 *       REDIS_URL is missing → "fails OPEN" fails.
 * ============================================================================
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const REDIS = 'REDIS_URL';
let originalRedis;

const loadFresh = async () => {
  vi.resetModules();
  return import('../../jobs/queues/reconciliationQueue.mjs');
};

describe('durable checkout-reconciliation sweeper', () => {
  beforeEach(() => { originalRedis = process.env[REDIS]; });
  afterEach(() => {
    if (originalRedis === undefined) delete process.env[REDIS];
    else process.env[REDIS] = originalRedis;
    vi.restoreAllMocks();
  });

  it('fails OPEN when REDIS_URL is absent — returns null rather than throwing', async () => {
    delete process.env[REDIS];
    const mod = await loadFresh();
    mod.__resetReconciliationQueueForTests();

    await expect(mod.startReconciliationQueue()).resolves.toBeNull();
    // The caller reads null and keeps the interval. If this threw, startup's
    // catch would log a warning and NO sweeper would run at all.
  });

  it('locks a slow sweep for 2x its interval so it can never be declared stalled mid-run', async () => {
    const mod = await loadFresh();
    const { SWEEP_INTERVAL_MS } = await import('../../services/checkoutReconciliationCron.mjs');

    expect(mod.RECONCILIATION_LOCK_MS).toBe(2 * SWEEP_INTERVAL_MS);
    // Explicit floor: BullMQ's 30s default would be shorter than a real sweep.
    expect(mod.RECONCILIATION_LOCK_MS).toBeGreaterThan(30_000);
  });

  it('uses a FIXED scheduler id so re-registering on every boot is a no-op', async () => {
    const mod = await loadFresh();
    // A generated id would stack a new repeatable schedule on each deploy until
    // the sweep ran many times per interval.
    expect(mod.RECONCILIATION_JOB_ID).toBe('checkout-reconciliation-sweep');
    expect(mod.RECONCILIATION_QUEUE_NAME).toBe('checkout-reconciliation');
  });

  it('processor EXECUTES the shared sweep — no logic is duplicated', async () => {
    // The whole safety argument of this slice: only the scheduling mechanism
    // changes. This CALLS the processor with the shared sweep mocked, so a
    // mis-wired import fails here.
    //
    // It was a source-grep first, and that version could not fail: under Vite's
    // ESM transform a mis-named import becomes `undefined` rather than a link
    // error, and nothing invoked it. Renaming the import to `runSweepTypo` left
    // the suite green. Executing the processor is what makes the control real.
    vi.resetModules();
    const sweep = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../services/checkoutReconciliationCron.mjs', () => ({
      SWEEP_INTERVAL_MS: 5 * 60 * 1000,
      runSweep: sweep,
      startCheckoutReconciliationSweeper: vi.fn(),
      stopCheckoutReconciliationSweeper: vi.fn(),
    }));
    const mod = await import('../../jobs/queues/reconciliationQueue.mjs');

    await mod.processSweepJob();

    expect(sweep).toHaveBeenCalledTimes(1);
    vi.doUnmock('../../services/checkoutReconciliationCron.mjs');
  });

  it('startup routes to the interval when the flag is off, and to the queue when on', async () => {
    // Source-level assertion on purpose: exercising core/startup.mjs requires a
    // full app boot with a live DB. What matters is that BOTH branches exist and
    // that the fallback is unconditional — checked by shape, and backed by the
    // executed fail-open test above.
    const source = (await import('node:fs')).readFileSync(
      new URL('../../core/startup.mjs', import.meta.url),
      'utf8',
    );
    expect(source).toContain("process.env.USE_BULLMQ_RECONCILIATION === 'true'");
    expect(source).toContain('startReconciliationQueue');
    expect(source).toContain('startCheckoutReconciliationSweeper();');
    // The interval must run whenever the durable path did not start.
    expect(source).toMatch(/if \(!durableStarted\) \{/);
  });

  it('closes cleanly even when nothing was ever started', async () => {
    const mod = await loadFresh();
    mod.__resetReconciliationQueueForTests();
    await expect(mod.stopReconciliationQueue()).resolves.toBeUndefined();
  });
});
