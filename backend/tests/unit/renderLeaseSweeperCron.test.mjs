/**
 * Lease sweeper — the reaper, and its ability to say what it reaped.
 * ============================================================================
 *
 * Two failures this file exists to prevent, both silent:
 *
 * 1. NOT RUNNING AT ALL. `sweepExpiredLeases()` shipped unit-tested and wired to
 *    nothing. The lease design assumes a reaper — a worker takes a lease, extends it by
 *    heartbeat, and if kill -9'd the lease "expires". With no sweeper, expiry means
 *    nothing happens: the row sits in `leased` forever and the retry never fires.
 *
 * 2. RUNNING BUT MUTE. The first version of the cron did `Number(result || 0)` against a
 *    service that returns `{ requeued, failed }`. `Number({...})` is NaN, `NaN > 0` is
 *    false — so it would have reaped correctly and logged NOTHING, forever. An agent
 *    crash-loop stranding jobs every minute would produce zero output, indistinguishable
 *    from a healthy quiet system.
 *
 * The second is why these tests assert on log calls rather than only on "it ran". A
 * reaper nobody can see is a reaper nobody will trust when it matters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sweepExpiredLeases = vi.fn();
const warn = vi.fn();
const error = vi.fn();
const info = vi.fn();

vi.mock('../../services/videoRenderJobService.mjs', () => ({
  sweepExpiredLeases: (...a) => sweepExpiredLeases(...a),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { warn: (...a) => warn(...a), error: (...a) => error(...a), info: (...a) => info(...a) },
}));

let mod;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.resetModules();
  mod = await import('../../services/renderLeaseSweeperCron.mjs');
});
afterEach(() => {
  mod?.stopRenderLeaseSweeper();
  vi.useRealTimers();
});

describe('lease sweeper — it actually runs', () => {
  it('sweeps on the interval', async () => {
    sweepExpiredLeases.mockResolvedValue({ requeued: 0, failed: 0 });
    mod.startRenderLeaseSweeper();
    expect(sweepExpiredLeases).not.toHaveBeenCalled();   // not at boot: no thundering herd
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
    expect(sweepExpiredLeases).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
    expect(sweepExpiredLeases).toHaveBeenCalledTimes(2);
  });

  it('does not start a second sweeper on a double start', async () => {
    sweepExpiredLeases.mockResolvedValue({ requeued: 0, failed: 0 });
    const a = mod.startRenderLeaseSweeper();
    const b = mod.startRenderLeaseSweeper();
    expect(a).toBe(b);
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
    expect(sweepExpiredLeases).toHaveBeenCalledTimes(1);   // not 2
  });

  it('stops cleanly', async () => {
    sweepExpiredLeases.mockResolvedValue({ requeued: 0, failed: 0 });
    mod.startRenderLeaseSweeper();
    mod.stopRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS * 3);
    expect(sweepExpiredLeases).not.toHaveBeenCalled();
  });
});

describe('lease sweeper — it can be SEEN working', () => {
  it('reports requeued jobs (the NaN bug: this logged nothing)', async () => {
    sweepExpiredLeases.mockResolvedValue({ requeued: 3, failed: 0 });
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/requeued 3 job/);
  });

  it('escalates exhausted jobs to error — they will never retry', async () => {
    sweepExpiredLeases.mockResolvedValue({ requeued: 0, failed: 2 });
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toMatch(/will not retry/);
  });

  it('stays silent when there is nothing to reap', async () => {
    // A reaper that logs every minute trains everyone to filter it out.
    sweepExpiredLeases.mockResolvedValue({ requeued: 0, failed: 0 });
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS * 3);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('survives a service returning null or a surprise shape', async () => {
    // Defensive because the NaN bug came from assuming this shape in the first place.
    for (const bad of [null, undefined, {}, 5, []]) {
      vi.clearAllMocks();
      sweepExpiredLeases.mockResolvedValue(bad);
      mod.stopRenderLeaseSweeper();
      mod.startRenderLeaseSweeper();
      await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS);
      expect(error).not.toHaveBeenCalled();   // no crash, no false alarm
    }
  });
});

describe('lease sweeper — a failing sweep does not kill the reaper', () => {
  it('keeps sweeping after an error', async () => {
    sweepExpiredLeases.mockRejectedValue(new Error('db down'));
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS * 3);
    // The interval must survive: a reaper that dies on the first blip strands every
    // job from that moment on, silently.
    expect(sweepExpiredLeases).toHaveBeenCalledTimes(3);
  });

  it('logs the first failure but does not scream every minute', async () => {
    sweepExpiredLeases.mockRejectedValue(new Error('db down'));
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS * 5);
    expect(error).toHaveBeenCalledTimes(1);   // 1st only, then every 10th
  });

  it('re-escalates on a sustained outage', async () => {
    sweepExpiredLeases.mockRejectedValue(new Error('db down'));
    mod.startRenderLeaseSweeper();
    await vi.advanceTimersByTimeAsync(mod.SWEEP_INTERVAL_MS * 10);
    expect(error).toHaveBeenCalledTimes(2);   // 1st and 10th
  });
});
