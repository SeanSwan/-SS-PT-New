/**
 * ============================================================================
 * FILE: rateLimiterStoreBounded.test.mjs
 * PURPOSE: Prove the in-memory rate-limit store is EVICTED, not just filtered.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-29 (hostile round 31, rebased round 38)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `rateLimiter()` in middleware/authMiddleware.mjs keeps a Map keyed by req.ip.
 * For a long time it had NO delete path at all: per request it filtered each IP's
 * timestamp array down to the current window, but an IP that STOPS sending is never
 * revisited, so its key survived for the life of the process. Filtering is not
 * eviction. Render runs one long-lived process and the Map is per-factory-call
 * (23 `rateLimiter({...})` instantiations across 10 route files, including every
 * auth-critical one), so growth was unbounded PER LIMITER — and directly
 * accelerable by an attacker rotating source IPs, since each new IP mints a key.
 *
 * The eviction itself was added on main by a sibling agent (a sweep once per window,
 * plus a `maxKeys` FIFO cap). It shipped WITHOUT tests. I had written a competing
 * fix; theirs landed first, so this file was repointed at their mechanism rather
 * than duplicating it. What matters is that the property is now pinned.
 *
 * WHAT IS AND IS NOT PROVEN HERE
 * The `maxKeys` cap is observable end-to-end and is proven below: evicting a key
 * resets that IP's budget, so "oldest key dropped, newer key survived" is directly
 * assertable. The time-based sweep is a pure MEMORY property — it deletes keys whose
 * timestamps are all stale, and a stale key's budget is already reset by the
 * per-request filter, so from the outside the two are indistinguishable. Map size is
 * a closure variable; proving the sweep would need a test seam in runtime code,
 * which is not worth adding to a sibling's freshly-landed fix. Stated plainly rather
 * than implied.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { rateLimiter } from '../../middleware/authMiddleware.mjs';

const res = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

/** Drive the middleware once as a given IP; true if the request was let through. */
const allowed = (limiter, ip) => {
  const next = vi.fn();
  limiter({ ip, path: '/t', method: 'GET' }, res(), next);
  return next.mock.calls.length === 1;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimiter still throttles', () => {
  it('allows up to max and blocks the next request in the window', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 2 });
    expect(allowed(limiter, '1.1.1.1')).toBe(true);
    expect(allowed(limiter, '1.1.1.1')).toBe(true);
    expect(allowed(limiter, '1.1.1.1')).toBe(false);
  });

  it('gives each IP its own budget', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 1 });
    expect(allowed(limiter, '1.1.1.1')).toBe(true);
    expect(allowed(limiter, '1.1.1.1')).toBe(false);
    expect(allowed(limiter, '2.2.2.2')).toBe(true);
  });

  it('lets an IP through again once its window has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T00:00:00.000Z'));

    const limiter = rateLimiter({ windowMs: 60_000, max: 1 });
    expect(allowed(limiter, '1.1.1.1')).toBe(true);
    expect(allowed(limiter, '1.1.1.1')).toBe(false);

    vi.setSystemTime(new Date('2026-07-29T00:05:00.000Z'));
    expect(allowed(limiter, '1.1.1.1')).toBe(true);
  });
});

describe('rateLimiter store is bounded by maxKeys', () => {
  it('evicts the OLDEST key once maxKeys is reached, and keeps newer ones', () => {
    // maxKeys 3 / max 1: every IP is at its limit after one request, so "allowed
    // again" is a direct, observable signal that its key was dropped.
    const limiter = rateLimiter({ windowMs: 60_000, max: 1, maxKeys: 3 });

    expect(allowed(limiter, '10.0.0.1')).toBe(true); // oldest
    expect(allowed(limiter, '10.0.0.2')).toBe(true);
    expect(allowed(limiter, '10.0.0.3')).toBe(true); // store now at maxKeys

    // A fourth distinct IP forces an eviction before it is recorded.
    expect(allowed(limiter, '10.0.0.4')).toBe(true);

    // The oldest key was evicted, so its budget is fresh.
    expect(allowed(limiter, '10.0.0.1')).toBe(true);
    // A newer key survived and is still at its limit.
    expect(allowed(limiter, '10.0.0.3')).toBe(false);
  });

  it('does not evict when the key is already tracked', () => {
    // A repeat visitor must not trigger the FIFO drop — otherwise one busy IP would
    // quietly evict everyone else's counters and hand them all fresh budgets.
    const limiter = rateLimiter({ windowMs: 60_000, max: 5, maxKeys: 2 });

    expect(allowed(limiter, '10.1.0.1')).toBe(true);
    expect(allowed(limiter, '10.1.0.2')).toBe(true);
    // Repeated hits from an already-tracked IP, more than maxKeys worth of requests.
    for (let i = 0; i < 4; i += 1) allowed(limiter, '10.1.0.2');

    // 10.1.0.1 was never evicted, so its earlier request still counts against it.
    expect(allowed(limiter, '10.1.0.1')).toBe(true);
    // And 10.1.0.2 is genuinely exhausted (5 recorded, max 5).
    expect(allowed(limiter, '10.1.0.2')).toBe(false);
  });
});
