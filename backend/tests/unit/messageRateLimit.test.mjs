/**
 * Message send throttle (launch audit S9, 2026-07-28, SWA-75).
 *
 * THE GAP THIS CLOSES
 * Auth, registration, password reset, uploads and the AI endpoints were all
 * rate-limited. Message send was not — on EITHER path (REST sendMessage or
 * socket 'send_message'). With a 5,000-char cap and no throttle, one
 * authenticated account could flood a conversation as fast as the network
 * allowed. On a platform serving minors that is a harassment vector.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkMessageRate,
  __resetMessageRateLimit,
  BURST_MAX,
  BURST_WINDOW_MS,
  HOURLY_MAX,
  HOURLY_WINDOW_MS,
} from '../../services/messaging/messageRateLimit.mjs';

const USER = 42;
const OTHER = 43;

beforeEach(() => __resetMessageRateLimit());

describe('checkMessageRate — burst window', () => {
  it('allows sends up to the burst limit', () => {
    const now = 1_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) {
      expect(checkMessageRate(USER, now + i).allowed).toBe(true);
    }
  });

  it('blocks the send that exceeds the burst limit', () => {
    const now = 1_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) checkMessageRate(USER, now + i);
    const result = checkMessageRate(USER, now + BURST_MAX);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('burst');
  });

  it('reports a positive retryAfterMs when throttled', () => {
    const now = 1_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) checkMessageRate(USER, now + i);
    const result = checkMessageRate(USER, now + BURST_MAX);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(BURST_WINDOW_MS);
  });

  it('recovers once the burst window has passed', () => {
    const now = 1_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) checkMessageRate(USER, now + i);
    expect(checkMessageRate(USER, now + BURST_MAX).allowed).toBe(false);
    expect(checkMessageRate(USER, now + BURST_WINDOW_MS + 10).allowed).toBe(true);
  });

  // Keyed by user, not IP: a gym's shared wifi must not throttle clients
  // against each other.
  it('tracks users independently', () => {
    const now = 1_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) checkMessageRate(USER, now + i);
    expect(checkMessageRate(USER, now + BURST_MAX).allowed).toBe(false);
    expect(checkMessageRate(OTHER, now + BURST_MAX).allowed).toBe(true);
  });
});

describe('checkMessageRate — hourly ceiling', () => {
  it('blocks once the hourly ceiling is reached, even when spread out', () => {
    const start = 5_000_000;
    // Spread sends so the burst window is never the binding constraint.
    const spacing = Math.floor(HOURLY_WINDOW_MS / (HOURLY_MAX + 5));
    for (let i = 0; i < HOURLY_MAX; i += 1) {
      const r = checkMessageRate(USER, start + i * spacing);
      expect(r.allowed).toBe(true);
    }
    const blocked = checkMessageRate(USER, start + HOURLY_MAX * spacing);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('hourly');
  });

  it('forgets sends older than the hourly window', () => {
    const start = 5_000_000;
    checkMessageRate(USER, start);
    // Far beyond the window — the old entry must not count against the user.
    expect(checkMessageRate(USER, start + HOURLY_WINDOW_MS + 1).allowed).toBe(true);
  });
});

describe('checkMessageRate — safety posture', () => {
  // A throttle must never be the reason messaging is down.
  it.each([['undefined', undefined], ['null', null], ['non-numeric', 'abc'], ['zero', 0], ['negative', -1]])(
    'ALLOWS (fail-open) for a %s user id', (_label, bad) => {
      expect(checkMessageRate(bad).allowed).toBe(true);
    }
  );

  it('does not throw on repeated calls at the same instant', () => {
    const now = 2_000_000;
    expect(() => {
      for (let i = 0; i < BURST_MAX + 5; i += 1) checkMessageRate(USER, now);
    }).not.toThrow();
  });

  it('accepts a numeric-string user id as the same user', () => {
    const now = 3_000_000;
    for (let i = 0; i < BURST_MAX; i += 1) checkMessageRate(USER, now + i);
    // '42' must resolve to the same bucket as 42, not a fresh one.
    expect(checkMessageRate(String(USER), now + BURST_MAX).allowed).toBe(false);
  });
});

describe('wiring — both send paths are throttled', () => {
  it('REST sendMessage calls the throttle', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../controllers/messaging/messageController.mjs'),
      'utf8'
    );
    expect(src).toContain('checkMessageRate(senderId)');
    expect(src).toContain('429');
  });

  // A REST-only limiter would be bypassed by emitting over the websocket.
  it('socket send_message calls the throttle', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../socket/socket.mjs'),
      'utf8'
    );
    expect(src).toContain('checkMessageRate(socket.user.id)');
  });
});
