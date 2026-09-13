/**
 * Coach fact purge scheduler — behavioural suite (G09-R1 / T35 residual)
 * ======================================================================
 *
 * What these tests prove, and why each exists:
 *
 * 1. The kill switch is default-OFF and STRICT. `'true'` only. If this ever
 *    loosens, a destructive job silently switches itself on in production.
 * 2. The scheduler refuses to schedule while disabled — the `false` return is the
 *    observable contract, not an implementation detail.
 * 3. Start is idempotent and stop clears, so a restart cannot stack intervals.
 * 4. A tick actually calls the purge, forwards `now`, and reports the count. This
 *    is the can-fail core: revert `purgeDueFacts` to a no-op caller and it reds.
 * 5. A THROWING purge is contained. A scheduler whose rejection escapes takes the
 *    process down; this asserts it does not.
 * 6. Concurrent ticks do not overlap — a slow sweep makes the second tick skip
 *    rather than run the destroy concurrently.
 * 7. PRIVACY: only a count is logged. Fact text is user content (rule 8), so this
 *    asserts the number is present AND the fact content is absent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logSpy = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }));

vi.mock('../../utils/logger.mjs', () => ({ default: logSpy }));

import {
  isCoachFactPurgeEnabled,
  readCoachFactPurgeStatus,
  runCoachFactPurgeTick,
  startCoachFactPurgeScheduler,
  stopCoachFactPurgeScheduler,
} from '../../services/coachFactPurgeCron.mjs';

describe('coach fact purge scheduler', () => {
  beforeEach(() => {
    logSpy.info.mockReset();
    logSpy.warn.mockReset();
    logSpy.error.mockReset();
  });

  afterEach(() => {
    stopCoachFactPurgeScheduler();
  });

  describe('kill switch is default-off and strict', () => {
    it('is disabled when the variable is absent', () => {
      expect(isCoachFactPurgeEnabled({})).toBe(false);
    });

    it('is enabled only by the exact string "true"', () => {
      expect(isCoachFactPurgeEnabled({ ENABLE_COACH_FACT_PURGE: 'true' })).toBe(true);
    });

    it.each([['TRUE'], ['True'], ['1'], ['yes'], ['on'], ['']])(
      'treats %j as DISABLED so a partial match cannot arm a destructive job',
      (value) => {
        expect(isCoachFactPurgeEnabled({ ENABLE_COACH_FACT_PURGE: value })).toBe(false);
      },
    );
  });

  describe('scheduler lifecycle', () => {
    it('refuses to schedule while disabled and says so', () => {
      expect(startCoachFactPurgeScheduler({})).toBe(false);
      expect(logSpy.info).toHaveBeenCalled();
      expect(String(logSpy.info.mock.calls[0][0])).toContain('disabled');
    });

    it('schedules when enabled and is idempotent across repeated starts', () => {
      const env = { ENABLE_COACH_FACT_PURGE: 'true' };
      expect(startCoachFactPurgeScheduler(env)).toBe(true);
      expect(startCoachFactPurgeScheduler(env)).toBe(true);
      // Both starts report the same single interval; a second start must not stack.
      const started = logSpy.info.mock.calls.filter(([m]) => String(m).includes('scheduler started'));
      expect(started).toHaveLength(1);
    });

    it('stop clears the handles without throwing when nothing was started', () => {
      expect(() => stopCoachFactPurgeScheduler()).not.toThrow();
      expect(() => stopCoachFactPurgeScheduler()).not.toThrow();
    });
  });

  describe('a tick actually purges', () => {
    it('calls the purge and reports how many rows it destroyed', async () => {
      const purge = vi.fn().mockResolvedValue({ purged: 4 });
      const out = await runCoachFactPurgeTick({ purge });
      expect(purge).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ purged: 4, skipped: false });
    });

    it('forwards the supplied instant so the deadline comparison is deterministic', async () => {
      const now = new Date('2026-09-13T00:00:00.000Z');
      const purge = vi.fn().mockResolvedValue({ purged: 0 });
      await runCoachFactPurgeTick({ now, purge });
      expect(purge).toHaveBeenCalledWith({ now });
    });

    it('stays silent in the log when nothing was due', async () => {
      await runCoachFactPurgeTick({ purge: vi.fn().mockResolvedValue({ purged: 0 }) });
      expect(logSpy.info).not.toHaveBeenCalled();
    });

    it('treats a malformed result as zero rather than NaN in the log', async () => {
      const out = await runCoachFactPurgeTick({ purge: vi.fn().mockResolvedValue(undefined) });
      expect(out).toEqual({ purged: 0, skipped: false });
    });
  });

  describe('failure is contained, never thrown', () => {
    it('reports an error result instead of rejecting when the purge throws', async () => {
      const purge = vi.fn().mockRejectedValue(new Error('relation "coach_facts" does not exist'));
      const out = await runCoachFactPurgeTick({ purge });
      expect(out.purged).toBe(0);
      expect(out.error).toContain('does not exist');
      expect(logSpy.error).toHaveBeenCalled();
    });

    it('releases the in-flight latch after a failure so the next tick still runs', async () => {
      const boom = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue({ purged: 2 });
      await runCoachFactPurgeTick({ purge: boom });
      const second = await runCoachFactPurgeTick({ purge: boom });
      expect(second).toEqual({ purged: 2, skipped: false });
    });
  });

  describe('concurrent ticks do not overlap', () => {
    it('skips a second tick while the first is still running', async () => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const purge = vi.fn().mockImplementation(async () => { await gate; return { purged: 1 }; });

      const first = runCoachFactPurgeTick({ purge });
      const second = await runCoachFactPurgeTick({ purge });
      expect(second).toEqual({ purged: 0, skipped: true });
      expect(purge).toHaveBeenCalledTimes(1);

      release();
      expect(await first).toEqual({ purged: 1, skipped: false });
    });
  });

  describe('privacy — a count is logged, never fact content', () => {
    it('logs the number without any fact text', async () => {
      const secret = 'prefers evening sessions and lives at 12 Example Street';
      await runCoachFactPurgeTick({ purge: vi.fn().mockResolvedValue({ purged: 7 }) });
      const logged = logSpy.info.mock.calls.map(([m]) => String(m)).join(' | ');
      expect(logged).toContain('7');
      expect(logged).not.toContain(secret);
      expect(logged).not.toContain('prefers evening');
    });

    it('exposes status as a copy carrying no content field', async () => {
      await runCoachFactPurgeTick({ now: new Date('2026-09-13T01:02:03.000Z'), purge: vi.fn().mockResolvedValue({ purged: 3 }) });
      const status = readCoachFactPurgeStatus();
      expect(status).toEqual({ purged: 3, at: '2026-09-13T01:02:03.000Z' });
      status.purged = 999;
      expect(readCoachFactPurgeStatus().purged).toBe(3);
    });
  });
});
