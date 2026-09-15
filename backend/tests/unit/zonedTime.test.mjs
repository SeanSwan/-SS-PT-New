/**
 * zonedTime — DST correctness tests (SWA-74, gym-ops spine S0)
 *
 * These pin the one behaviour the whole class-scheduling design rests on: a recurring class
 * defined as "06:30 local" must remain 06:30 local across daylight-saving transitions. A naive
 * implementation that adds fixed UTC intervals passes every test written on a single date and
 * silently moves every class by an hour twice a year.
 *
 * NOTE ON RUNNING THESE: backend vitest does not currently execute on this Windows dev machine —
 * backend/node_modules/@rollup ships Linux-only binaries (reproduces on untouched test files, so
 * it is pre-existing and unrelated to this slice). These are written for CI. The same assertions
 * were executed locally with plain `node` and all passed; see the slice closeout.
 */

import { describe, it, expect } from 'vitest';
import { zonedWallClockToUtc, parseWallClock, nowInZone } from '../../utils/zonedTime.mjs';

const TZ = 'America/Los_Angeles';

/** Render a UTC instant as HH:mm in the target zone. */
const localHHmm = (date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

describe('zonedWallClockToUtc', () => {
  it('keeps a 06:30 local class at 06:30 local across the spring-forward boundary', () => {
    // US DST began 2026-03-08. One occurrence before, one on the day, one after.
    for (const day of [1, 8, 15]) {
      const utc = zonedWallClockToUtc({ year: 2026, month: 3, day, hour: 6, minute: 30 }, TZ);
      expect(localHHmm(utc)).toBe('06:30');
    }
  });

  it('keeps a 06:30 local class at 06:30 local across the fall-back boundary', () => {
    // US DST ended 2026-11-01.
    const dates = [
      { year: 2026, month: 10, day: 25 },
      { year: 2026, month: 11, day: 1 },
      { year: 2026, month: 11, day: 8 },
    ];
    for (const d of dates) {
      const utc = zonedWallClockToUtc({ ...d, hour: 6, minute: 30 }, TZ);
      expect(localHHmm(utc)).toBe('06:30');
    }
  });

  it('produces DIFFERENT UTC instants either side of a DST change (not a fixed offset)', () => {
    const before = zonedWallClockToUtc({ year: 2026, month: 3, day: 1, hour: 6, minute: 30 }, TZ);
    const after = zonedWallClockToUtc({ year: 2026, month: 3, day: 15, hour: 6, minute: 30 }, TZ);
    // PST is UTC-8 (06:30 -> 14:30Z); PDT is UTC-7 (06:30 -> 13:30Z).
    expect(before.getUTCHours()).toBe(14);
    expect(after.getUTCHours()).toBe(13);
  });

  it('handles midnight and a zone ahead of UTC', () => {
    const utc = zonedWallClockToUtc({ year: 2026, month: 6, day: 15, hour: 0, minute: 0 }, TZ);
    expect(localHHmm(utc)).toBe('00:00');

    const tokyo = zonedWallClockToUtc({ year: 2026, month: 6, day: 15, hour: 9, minute: 0 }, 'Asia/Tokyo');
    const tokyoLocal = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo', hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(tokyo);
    expect(tokyoLocal).toBe('09:00');
  });

  it('defaults hour and minute to zero when omitted', () => {
    const utc = zonedWallClockToUtc({ year: 2026, month: 6, day: 15 }, TZ);
    expect(localHHmm(utc)).toBe('00:00');
  });
});

describe('parseWallClock', () => {
  it('accepts valid HH:mm', () => {
    expect(parseWallClock('06:30')).toEqual({ hour: 6, minute: 30 });
    expect(parseWallClock('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseWallClock('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('rejects out-of-range, unpadded, and non-string input', () => {
    // Each of these must be null, not a coerced value — a bad hours string that silently becomes
    // midnight would make a door-access check pass at the wrong time.
    expect(parseWallClock('24:00')).toBeNull();
    expect(parseWallClock('06:60')).toBeNull();
    expect(parseWallClock('6:30')).toBeNull();
    expect(parseWallClock('')).toBeNull();
    expect(parseWallClock(null)).toBeNull();
    expect(parseWallClock(undefined)).toBeNull();
    expect(parseWallClock(630)).toBeNull();
  });
});

describe('nowInZone', () => {
  it('returns an in-range wall clock for a fixed instant', () => {
    // 2026-06-15T20:45:00Z is 13:45 PDT.
    const at = new Date('2026-06-15T20:45:00Z');
    expect(nowInZone(TZ, at)).toEqual({ hour: 13, minute: 45 });
  });
});
