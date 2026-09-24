/** Cryptographic pagination boundary: tuples never grant access or reveal tails. */
import { describe, it, expect, afterEach } from 'vitest';
import { encodeCoachIntentCursor, decodeCoachIntentCursor } from '../../services/ai/coachIntentCursor.mjs';
const originalKey = process.env.OPERATION_SIGNING_KEY;
afterEach(() => { process.env.OPERATION_SIGNING_KEY = originalKey; });
const scope = { actorId: 7, role: 'trainer', targetClientId: null };
const row = { id: '11111111-1111-4111-8111-111111111111', createdAt: new Date('2026-09-04T20:00:00Z') };
const now = Date.parse('2026-09-06T10:00:00Z');
describe('Coach receipt cursor', () => {
  it('roundtrips privately and randomizes equal tuples', () => {
    const token = encodeCoachIntentCursor(row, scope, now);
    expect(decodeCoachIntentCursor(token, scope, now)).toEqual(row);
    expect(encodeCoachIntentCursor(row, scope, now)).not.toBe(token);
    expect(Buffer.from(token, 'base64url').toString()).not.toContain(row.id);
    expect(Buffer.from(token, 'base64url').toString()).not.toContain('createdAt');
  });
  it('refuses modified, expired and cross-scope continuations', () => {
    const token = encodeCoachIntentCursor(row, scope, now);
    const bytes = Buffer.from(token, 'base64url');
    bytes[40] ^= 1;
    expect(decodeCoachIntentCursor(bytes.toString('base64url'), scope, now)).toBeNull();
    expect(decodeCoachIntentCursor(token, scope, now + 86400000)).toBeNull();
    for (const changed of [{ actorId: 8 }, { role: 'admin' }, { targetClientId: 55 }])
      expect(decodeCoachIntentCursor(token, { ...scope, ...changed }, now)).toBeNull();
  });
  it('fails closed across key rotation and missing server configuration', () => {
    const token = encodeCoachIntentCursor(row, scope, now);
    process.env.OPERATION_SIGNING_KEY = 'synthetic-rotated-cursor-key-0123456789';
    expect(decodeCoachIntentCursor(token, scope, now)).toBeNull();
    delete process.env.OPERATION_SIGNING_KEY;
    expect(() => encodeCoachIntentCursor(row, scope, now)).toThrow('unavailable');
    expect(() => decodeCoachIntentCursor(token, scope, now)).toThrow('unavailable');
  });
  it('refuses oversized and noncanonical tokens before decryption', () => {
    for (const value of [[], {}, '', 'x'.repeat(513), '%%%'])
      expect(decodeCoachIntentCursor(value, scope, now)).toBeNull();
  });
});
