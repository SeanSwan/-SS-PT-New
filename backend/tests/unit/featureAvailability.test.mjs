/**
 * featureAvailability contract (SWA-101)
 * ======================================
 * Locks the distinction that makes "coming soon" honest: a MISSING TABLE degrades gracefully,
 * and everything else stays a real error.
 *
 * The bug this guards against is subtle and was live: the live-stream and creator routes caught
 * EVERY error and answered `status: 'coming_soon'`. A database outage, an auth failure, or a
 * genuine bug was therefore reported to the user as "this feature is coming soon" and logged as a
 * non-event. That is a Rule 75 violation (the message did not describe reality) and it makes real
 * incidents invisible.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  isMissingTableError,
  respondComingSoon,
  respondComingSoonWrite,
} from '../../routes/featureAvailability.mjs';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  vi.spyOn(res, 'json');
  return res;
};

describe('isMissingTableError', () => {
  it('detects the Postgres undefined_table code at every wrap depth Sequelize uses', () => {
    expect(isMissingTableError({ code: '42P01' })).toBe(true);
    expect(isMissingTableError({ parent: { code: '42P01' } })).toBe(true);
    expect(isMissingTableError({ original: { code: '42P01' } })).toBe(true);
  });

  it('falls back to the message when no driver code is present', () => {
    expect(isMissingTableError({ message: 'relation "LiveStreams" does not exist' })).toBe(true);
    expect(isMissingTableError({ parent: { message: 'relation "CreatorProfiles" does not exist' } })).toBe(true);
  });

  it('does NOT claim real failures are missing tables — the whole point of the rule', () => {
    expect(isMissingTableError({ code: '28P01', message: 'password authentication failed' })).toBe(false);
    expect(isMissingTableError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' })).toBe(false);
    expect(isMissingTableError({ message: 'column "foo" does not exist' })).toBe(false);
    expect(isMissingTableError(new TypeError("Cannot read properties of undefined (reading 'findAll')"))).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError(undefined)).toBe(false);
  });
});

describe('respondComingSoon (reads)', () => {
  it('answers 200 and PRESERVES the success response shape', () => {
    const res = mockRes();
    respondComingSoon(res, { streams: [] }, 'Live streaming coming soon');
    expect(res.statusCode).toBe(200);
    // A consumer destructuring `{ streams }` must not receive undefined.
    expect(res.body.streams).toEqual([]);
    expect(res.body.status).toBe('coming_soon');
    expect(res.body.message).toBe('Live streaming coming soon');
  });

  it('carries multi-key empty shapes through intact', () => {
    const res = mockRes();
    respondComingSoon(res, { profile: null, isCreator: false }, 'Creator economy coming soon');
    expect(res.body).toMatchObject({ profile: null, isCreator: false, status: 'coming_soon' });
  });

  it('emits `degraded: true` — the flag this codebase already uses and the frontend already reads', () => {
    // apiClientFactory maps `degraded` onto `apiError.isDegraded`. Without it these responses
    // would need every consumer to learn a second, parallel signal.
    const res = mockRes();
    respondComingSoon(res, { streams: [] }, 'x');
    expect(res.body.degraded).toBe(true);
  });
});

describe('respondComingSoonWrite (writes)', () => {
  it('answers 503 and success:false — never a 200 that implies the write landed', () => {
    const res = mockRes();
    respondComingSoonWrite(res, 'Live streaming coming soon');
    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('coming_soon');
  });

  it('does not emit a Retry-After — we cannot honestly predict a ship date', () => {
    const res = mockRes();
    respondComingSoonWrite(res, 'x');
    expect(res.body).not.toHaveProperty('retryAfter');
  });

  it('emits `degraded: true` so the existing frontend error handling recognises it', () => {
    const res = mockRes();
    respondComingSoonWrite(res, 'x');
    expect(res.body.degraded).toBe(true);
  });
});
