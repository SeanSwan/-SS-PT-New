/**
 * acquisitionTelemetry.test.mjs — P0-4 (SWA-29) the security-critical core: the sanitizer.
 * Zero PII + allowlist + bucketed amounts + unknown-event drop. Pure/DB-free.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeMeta,
  bucketAmount,
  recordFunnelEvent,
  FUNNEL_EVENTS,
  AMOUNT_BUCKETS,
} from '../../services/acquisitionTelemetry.mjs';

describe('sanitizeMeta — zero-PII allowlist', () => {
  it('keeps ONLY allowlisted keys, drops everything else (incl. PII)', () => {
    const out = sanitizeMeta({
      source: 'prism',
      intent: 'consult',
      ref: 'ABC123',
      kind: 'store',
      email: 'a@b.com', // PII — must be dropped
      name: 'Jane Doe', // PII — must be dropped
      leadId: 4291, // raw id — must be dropped
      userId: 88,
    });
    expect(out).toEqual({ source: 'prism', intent: 'consult', ref: 'ABC123', kind: 'store' });
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('name');
    expect(out).not.toHaveProperty('leadId');
    expect(out).not.toHaveProperty('userId');
  });

  it('buckets a raw amount and NEVER stores the raw figure', () => {
    expect(sanitizeMeta({ amount: 8400 })).toEqual({ amount_bucket: '>5k' });
    expect(sanitizeMeta({ amount: 175 })).toEqual({ amount_bucket: '100-499' });
    expect(sanitizeMeta({ amount: 50 }).amount_bucket).toBe('<100');
    expect(sanitizeMeta({ amount: 8400 })).not.toHaveProperty('amount');
  });

  it('accepts a valid pre-bucketed amount, rejects a bogus one', () => {
    expect(sanitizeMeta({ amount_bucket: '1k-5k' })).toEqual({ amount_bucket: '1k-5k' });
    expect(sanitizeMeta({ amount_bucket: '$4,200' })).toEqual({}); // not an allowed bucket → dropped
  });

  it('length-caps allowed free-text values (defense in depth)', () => {
    const long = 'x'.repeat(500);
    expect(sanitizeMeta({ source: long }).source).toHaveLength(64);
  });

  it('handles null/garbage input without throwing', () => {
    expect(sanitizeMeta(null)).toEqual({});
    expect(sanitizeMeta(undefined)).toEqual({});
    expect(sanitizeMeta('nope')).toEqual({});
  });
});

describe('bucketAmount', () => {
  it('maps every band + rejects invalid', () => {
    expect(bucketAmount(99)).toBe('<100');
    expect(bucketAmount(100)).toBe('100-499');
    expect(bucketAmount(500)).toBe('500-999');
    expect(bucketAmount(1000)).toBe('1k-5k');
    expect(bucketAmount(5000)).toBe('>5k');
    expect(bucketAmount(-1)).toBeUndefined();
    expect(bucketAmount('nan')).toBeUndefined();
    AMOUNT_BUCKETS.forEach((b) => expect(typeof b).toBe('string'));
  });
});

describe('recordFunnelEvent — fail-soft + unknown-event drop', () => {
  it('drops an unknown event without touching the DB and never throws', async () => {
    const ok = await recordFunnelEvent('totally_made_up_event', { source: 'x' });
    expect(ok).toBe(false);
  });

  it('is a known canonical event set', () => {
    expect(FUNNEL_EVENTS.has('lead_captured')).toBe(true);
    expect(FUNNEL_EVENTS.has('converted')).toBe(true);
    expect(FUNNEL_EVENTS.has('purchase')).toBe(true);
  });
});
