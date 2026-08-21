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
    resetMinuteBudgetOnly(userId);
  }
}

/**
 * Clear only the per-minute budget so the next burst can hit the limit again,
 * WITHOUT touching rateLimitHits — which is the state under test.
 */
function resetMinuteBudgetOnly() {
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

  it('S6-3: a stuck concurrent lock auto-releases after the timeout', () => {
    expect(checkRateLimit(USER).allowed).toBe(true);
    // Never released — simulate a crashed request.
    expect(checkRateLimit(USER).code).toBe('AI_CONCURRENT_LIMIT');

    vi.setSystemTime(new Date(Date.now() + 36_000));
    expect(checkRateLimit(USER).allowed).toBe(true);
  });
});
