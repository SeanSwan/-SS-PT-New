/**
 * aiRateLimiterStateHygiene.test.mjs
 * ==================================
 * S6 (2026-08-21). `services/ai/rateLimiter.mjs` is the AI-generation limiter,
 * keyed by userId. It is NOT the same limiter as `rateLimiter()` in
 * `middleware/authMiddleware.mjs`, which is keyed by req.ip and was hardened on
 * 2026-07-29 with a time sweep plus a `maxKeys` FIFO cap
 * (see rateLimiterStoreBounded.test.mjs). That hardening did not sweep sideways
 * to this sibling — same bug class, one fixed, one missed.
 *
 * SEVERITY, STATED HONESTLY: the IP-keyed limiter's growth was attacker-
 * amplifiable, because rotating source IPs mints unbounded keys. This one keys on
 * an authenticated userId, so growth is bounded by the number of real users. It is
 * a slow leak and a correctness bug, NOT an unbounded DoS vector. Do not quote it
 * as one.
 *
 * The concrete defect proven here: `resetAll()` documents itself as "Reset all
 * rate limit state" and clears four of the five state maps. `rateLimitHits` — the
 * suspicious-activity tracker — survives it, so state leaks between tests and the
 * detector cannot be tested in isolation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, releaseConcurrent, resetAll } from '../../services/ai/rateLimiter.mjs';
import logger from '../../utils/logger.mjs';

const USER = 90_001;

/** Drive the per-minute limit into rejection N times to generate suspicious hits. */
function provokeRateLimitHits(userId, times) {
  for (let i = 0; i < times; i += 1) {
    // 3 allowed per minute, so 4 calls guarantees at least one rejection.
    for (let j = 0; j < 4; j += 1) {
      checkRateLimit(userId);
      releaseConcurrent(userId);
    }
    advancePastMinuteWindow();
  }
}

/**
 * Move the clock past the per-minute window so the next burst can hit the limit
 * again. Named for what it does: an earlier version was called
 * `resetMinuteBudgetOnly(userId)` — it took a parameter its signature did not
 * declare, and it does not reset anything or touch only the minute budget. It
 * advances the whole clock, which ages every window at once.
 */
function advancePastMinuteWindow() {
  vi.setSystemTime(new Date(Date.now() + 61_000));
}

describe('AI rate limiter — state hygiene (S6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T00:00:00.000Z'));
    resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetAll();
  });

  it('S6-1: resetAll() clears the suspicious-hit tracker, not just the budgets', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    // Drive 3 separate rate-limit rejections. logSuspicious warns at >= 3 hits.
    provokeRateLimitHits(USER, 3);
    const warnsBeforeReset = warn.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Suspicious'),
    ).length;
    expect(warnsBeforeReset).toBeGreaterThan(0);

    warn.mockClear();
    resetAll();

    // ONE more rejection after resetAll(). If rateLimitHits survived the reset the
    // counter is already >= 3 and this single hit warns immediately — which is the
    // bug. After the fix, a single hit is hit #1 and must NOT warn.
    provokeRateLimitHits(USER, 1);
    const warnsAfterReset = warn.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Suspicious'),
    ).length;

    expect(warnsAfterReset).toBe(0);
  });

  it('S6-2: releasing a concurrent lock lets the same user through again', () => {
    // Guards the fix: whatever S6 changes about state cleanup must not break the
    // concurrent-lock contract, which is the limiter's only correctness-critical part.
    expect(checkRateLimit(USER).allowed).toBe(true);

    const second = checkRateLimit(USER);
    expect(second.allowed).toBe(false);
    expect(second.code).toBe('AI_CONCURRENT_LIMIT');

    releaseConcurrent(USER);
    expect(checkRateLimit(USER).allowed).toBe(true);
  });

  it('S6-4: the periodic sweep actually runs without throwing', async () => {
    // The sweep closure references `rateLimitHits`, which is declared ~145 lines
    // BELOW the setInterval that uses it. That is legal (the callback runs long
    // after module evaluation) but it is exactly the shape that produces a silent
    // ReferenceError if anything is ever reordered — and the timer only fires every
    // five minutes, so nothing would notice until well into a production process.
    //
    // Fake timers must be installed BEFORE the module evaluates, so the interval is
    // registered against them. Hence resetModules + dynamic import rather than the
    // top-level import the other tests use.
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T00:00:00.000Z'));

    const mod = await import('../../services/ai/rateLimiter.mjs');

    // Give the sweep something to prune in every map it touches.
    for (let i = 0; i < 5; i += 1) {
      mod.checkRateLimit(4242);
      mod.releaseConcurrent(4242);
    }
    mod.checkRateLimit(4243); // leaves a concurrent lock held, never released

    // Past both the cleanup interval and the concurrent-lock timeout.
    expect(() => vi.advanceTimersByTime(6 * 60 * 1000)).not.toThrow();

    mod.resetAll();
  });

  it('S6-5: the sweep EVICTS stale rateLimitHits and concurrentUsers keys', async () => {
    // MUTATION-VERIFIED: delete either sweep loop in rateLimiter.mjs and this fails.
    //
    // A behavioural version of this test was written first and was WRONG: it drove
    // the suspicious counter and asserted no warning fired after the sweep. It passed
    // with the sweep loop deleted, because logSuspicious() already filters stale hits
    // on every call — so eviction has no behavioural signature at all. Only the map
    // sizes distinguish "pruned" from "merely filtered", hence __inspectStateSizes().
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T00:00:00.000Z'));

    const mod = await import('../../services/ai/rateLimiter.mjs');

    // Arm both maps: user 7777 trips the limit (rateLimitHits), user 8888 takes a
    // concurrent lock and never releases it (concurrentUsers).
    for (let i = 0; i < 4; i += 1) {
      mod.checkRateLimit(7777);
      mod.releaseConcurrent(7777);
    }
    mod.checkRateLimit(8888);

    const armed = mod.__inspectStateSizes();
    expect(armed.suspicious).toBeGreaterThan(0);
    expect(armed.concurrent).toBeGreaterThan(0);

    // Past SUSPICIOUS_WINDOW_MS, past CONCURRENT_LOCK_TIMEOUT_MS, and past the
    // 5-minute cleanup interval so the sweep fires with everything stale.
    vi.advanceTimersByTime(11 * 60 * 1000);

    const swept = mod.__inspectStateSizes();
    expect(swept.suspicious).toBe(0);
    expect(swept.concurrent).toBe(0);

    mod.resetAll();
  });

  it('S6-3: a stuck concurrent lock auto-releases after the timeout', () => {
    expect(checkRateLimit(USER).allowed).toBe(true);
    // Never released — simulate a crashed request.
    expect(checkRateLimit(USER).code).toBe('AI_CONCURRENT_LIMIT');

    vi.setSystemTime(new Date(Date.now() + 36_000));
    expect(checkRateLimit(USER).allowed).toBe(true);
  });
});
