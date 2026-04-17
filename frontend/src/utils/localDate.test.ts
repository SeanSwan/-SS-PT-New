/**
 * localDate — local-calendar date-only helper unit tests
 * =======================================================
 * Phase 13.1 (2026-04-15): locks the local-date semantics the Coach
 * Assistant transcript intake depends on. These helpers replaced the
 * `new Date().toISOString().split('T')[0]` UTC shortcut that silently
 * drifted to tomorrow for PDT users after ~5pm local.
 */
import { describe, expect, it } from 'vitest';
import {
  getLocalIsoDate,
  parseLocalIsoDate,
  isFutureLocalDate,
} from './localDate';

describe('getLocalIsoDate', () => {
  it('returns YYYY-MM-DD for a given Date using LOCAL components', () => {
    // Construct with explicit local components — the output must match
    // those components verbatim regardless of the host timezone. If the
    // implementation accidentally routes through toISOString(), this test
    // breaks in any non-UTC zone.
    const d = new Date(2026, 3, 15); // 2026-04-15 local midnight
    expect(getLocalIsoDate(d)).toBe('2026-04-15');
  });

  it('zero-pads month and day', () => {
    const d = new Date(2026, 0, 5); // 2026-01-05
    expect(getLocalIsoDate(d)).toBe('2026-01-05');
  });

  it('returns 10-character output', () => {
    expect(getLocalIsoDate(new Date(2026, 3, 15))).toHaveLength(10);
  });

  it('handles year boundary correctly (Dec 31 local)', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(getLocalIsoDate(d)).toBe('2026-12-31');
  });

  it('handles year boundary correctly (Jan 1 local)', () => {
    const d = new Date(2027, 0, 1, 0, 0, 0);
    expect(getLocalIsoDate(d)).toBe('2027-01-01');
  });

  it('defaults to now when called with no argument', () => {
    const out = getLocalIsoDate();
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('round-trips with parseLocalIsoDate without drift', () => {
    const original = new Date(2026, 3, 15); // local 2026-04-15 00:00
    const iso = getLocalIsoDate(original);
    const parsed = parseLocalIsoDate(iso);
    expect(parsed).not.toBeNull();
    expect(getLocalIsoDate(parsed!)).toBe(iso);
  });

  it('ANTI-REGRESSION: does NOT use toISOString().split (UTC drift risk)', () => {
    // This is enforced by a source-level check in
    // SwanCoachAssistantPage.transcriptIntake.test.ts. We also lock it
    // here at the unit level: feed a date whose LOCAL day differs from
    // its UTC day and confirm the local day wins.
    //
    // Construct a moment "right before UTC midnight but well after local
    // midnight" in a Western-hemisphere-style zone. On a PDT (UTC-7)
    // runner, 2026-04-15 20:00 local is 2026-04-16 03:00 UTC — the UTC
    // day has already ticked over. On a UTC runner, the two agree and
    // the test is still valid (just not discriminating).
    const d = new Date(2026, 3, 15, 20, 0, 0); // 8 PM local
    // Regardless of runner zone, the LOCAL calendar day is 2026-04-15.
    expect(getLocalIsoDate(d)).toBe('2026-04-15');
  });
});

describe('parseLocalIsoDate', () => {
  it('parses a valid YYYY-MM-DD to local midnight', () => {
    const out = parseLocalIsoDate('2026-04-15');
    expect(out).not.toBeNull();
    expect(out!.getFullYear()).toBe(2026);
    expect(out!.getMonth()).toBe(3); // April (0-indexed)
    expect(out!.getDate()).toBe(15);
    // Critical: the resulting Date must have LOCAL midnight, not UTC midnight.
    expect(out!.getHours()).toBe(0);
    expect(out!.getMinutes()).toBe(0);
    expect(out!.getSeconds()).toBe(0);
  });

  it('returns null for unparseable inputs', () => {
    expect(parseLocalIsoDate('')).toBeNull();
    expect(parseLocalIsoDate('2026')).toBeNull();
    expect(parseLocalIsoDate('2026-04')).toBeNull();
    expect(parseLocalIsoDate('not a date')).toBeNull();
    expect(parseLocalIsoDate('2026/04/15')).toBeNull();
    expect(parseLocalIsoDate(null)).toBeNull();
    expect(parseLocalIsoDate(undefined)).toBeNull();
  });

  it('returns null for out-of-range month or day', () => {
    expect(parseLocalIsoDate('2026-13-01')).toBeNull();
    expect(parseLocalIsoDate('2026-00-15')).toBeNull();
    expect(parseLocalIsoDate('2026-04-32')).toBeNull();
    expect(parseLocalIsoDate('2026-04-00')).toBeNull();
  });

  it('returns null for calendar-overflow inputs (Feb 30)', () => {
    // new Date(2026, 1, 30) silently rolls to March 2. The helper must
    // catch that and return null — otherwise the round-trip contract
    // with getLocalIsoDate would break.
    expect(parseLocalIsoDate('2026-02-30')).toBeNull();
  });

  it('does NOT use `new Date("YYYY-MM-DD")` UTC parsing', () => {
    // `new Date('2026-04-15')` parses as UTC midnight. In PDT that is
    // 2026-04-14 17:00 local — the .getDate() would return 14, not 15.
    // Lock that our helper returns 15 even on a non-UTC runner.
    const out = parseLocalIsoDate('2026-04-15');
    expect(out!.getDate()).toBe(15);
  });
});

describe('isFutureLocalDate', () => {
  it('returns false for today', () => {
    const now = new Date(2026, 3, 15, 12, 0, 0);
    const today = getLocalIsoDate(now);
    expect(isFutureLocalDate(today, now)).toBe(false);
  });

  it('returns false for yesterday', () => {
    const now = new Date(2026, 3, 15, 12, 0, 0);
    expect(isFutureLocalDate('2026-04-14', now)).toBe(false);
  });

  it('returns true for tomorrow', () => {
    const now = new Date(2026, 3, 15, 12, 0, 0);
    expect(isFutureLocalDate('2026-04-16', now)).toBe(true);
  });

  it('is time-of-day invariant — late-evening "now" still sees today as today', () => {
    // The bug this file exists to fix: at 8 PM PDT, the UTC clock is
    // already on the next day. The guard must still accept today.
    const lateNow = new Date(2026, 3, 15, 23, 30, 0); // 11:30 PM local
    expect(isFutureLocalDate('2026-04-15', lateNow)).toBe(false);
    expect(isFutureLocalDate('2026-04-16', lateNow)).toBe(true);
  });

  it('returns false for unparseable candidate (fail-open)', () => {
    const now = new Date(2026, 3, 15, 12, 0, 0);
    expect(isFutureLocalDate('not a date', now)).toBe(false);
    expect(isFutureLocalDate('', now)).toBe(false);
  });

  it('handles year rollover', () => {
    const dec31 = new Date(2026, 11, 31, 12, 0, 0);
    expect(isFutureLocalDate('2026-12-31', dec31)).toBe(false);
    expect(isFutureLocalDate('2027-01-01', dec31)).toBe(true);
  });
});
