/**
 * workoutLogService — parseWorkoutLogDate unit tests
 * ===================================================
 * Phase 13.1 (2026-04-15): locks the server-side behavior for `YYYY-MM-DD`
 * date-only inputs that the Coach Assistant transcript intake and other
 * admin/trainer surfaces now send.
 *
 * The bug this helper fixes: `new Date('2026-04-15')` parses as UTC
 * midnight. On a UTC-hosted server (Render) that gets stored as
 * 2026-04-15T00:00:00Z — but when a PDT user refetches, the frontend
 * renders 2026-04-14 (5pm the prior day local). The duplicate-date
 * guard then bounds its WHERE clause by server-local calendar day,
 * which splits the difference inconsistently.
 *
 * The fix: when the input matches `YYYY-MM-DD`, construct the Date from
 * numeric components at server-local NOON of that calendar day. Noon is
 * robust against ±12h timezone drift. Full ISO timestamps (which carry
 * their own TZ anchor) keep their prior behavior untouched.
 */
import { describe, expect, it } from 'vitest';
import { parseWorkoutLogDate } from '../../services/workout/workoutLogService.mjs';

describe('parseWorkoutLogDate — date-only YYYY-MM-DD', () => {
  it('parses a valid YYYY-MM-DD to server-local noon of that calendar day', () => {
    const out = parseWorkoutLogDate('2026-04-15');
    expect(out).toBeInstanceOf(Date);
    expect(Number.isNaN(out.getTime())).toBe(false);
    // Server-local calendar components must match the input exactly.
    // This is the critical guarantee: the stored instant lives on the
    // user's intended calendar day regardless of server timezone.
    expect(out.getFullYear()).toBe(2026);
    expect(out.getMonth()).toBe(3); // April (0-indexed)
    expect(out.getDate()).toBe(15);
    // Noon anchor — gives >=12h safety against timezone drift.
    expect(out.getHours()).toBe(12);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
  });

  it('zero-padded single-digit months and days parse correctly', () => {
    const out = parseWorkoutLogDate('2026-01-05');
    expect(out.getFullYear()).toBe(2026);
    expect(out.getMonth()).toBe(0); // January
    expect(out.getDate()).toBe(5);
  });

  it('trims surrounding whitespace on date-only strings', () => {
    const out = parseWorkoutLogDate('  2026-04-15  ');
    expect(out.getFullYear()).toBe(2026);
    expect(out.getDate()).toBe(15);
  });

  it('rejects calendar-overflow inputs (Feb 30) as invalid', () => {
    const out = parseWorkoutLogDate('2026-02-30');
    expect(Number.isNaN(out.getTime())).toBe(true);
  });

  it('rejects out-of-range month/day values', () => {
    expect(Number.isNaN(parseWorkoutLogDate('2026-13-01').getTime())).toBe(true);
    expect(Number.isNaN(parseWorkoutLogDate('2026-00-15').getTime())).toBe(true);
    expect(Number.isNaN(parseWorkoutLogDate('2026-04-32').getTime())).toBe(true);
  });

  it('ANTI-REGRESSION: does NOT parse as UTC midnight', () => {
    // `new Date('2026-04-15')` is 2026-04-15T00:00:00Z. On a UTC server
    // that has getHours()===0. Our helper must anchor at NOON (12),
    // so hours must never be 0 for a date-only input.
    const out = parseWorkoutLogDate('2026-04-15');
    expect(out.getHours()).toBe(12);
    expect(out.getHours()).not.toBe(0);
  });
});

describe('parseWorkoutLogDate — full ISO timestamp pass-through', () => {
  it('parses a full ISO string with Z suffix (UTC) unchanged', () => {
    const iso = '2026-04-15T18:30:00.000Z';
    const out = parseWorkoutLogDate(iso);
    expect(out.toISOString()).toBe(iso);
  });

  it('parses a full ISO string with offset unchanged', () => {
    // 2026-04-15 12:00 in PDT (UTC-7) is 2026-04-15 19:00 UTC
    const iso = '2026-04-15T12:00:00-07:00';
    const out = parseWorkoutLogDate(iso);
    expect(out.toISOString()).toBe('2026-04-15T19:00:00.000Z');
  });
});

describe('parseWorkoutLogDate — edge cases', () => {
  it('returns a Date wrapper for an existing Date argument', () => {
    const existing = new Date(2026, 3, 15, 8, 30, 0);
    const out = parseWorkoutLogDate(existing);
    expect(out).toBe(existing);
  });

  it('returns Invalid Date for non-string non-Date input', () => {
    expect(Number.isNaN(parseWorkoutLogDate(null).getTime())).toBe(true);
    expect(Number.isNaN(parseWorkoutLogDate(undefined).getTime())).toBe(true);
    expect(Number.isNaN(parseWorkoutLogDate(12345).getTime())).toBe(true);
  });

  it('returns Invalid Date for unparseable strings', () => {
    expect(Number.isNaN(parseWorkoutLogDate('not a date').getTime())).toBe(true);
    expect(Number.isNaN(parseWorkoutLogDate('').getTime())).toBe(true);
  });
});
