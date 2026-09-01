/**
 * availabilityWindows — pure window arithmetic (SWA-214 step 1).
 *
 * These are the rules the cancellation backfill will depend on to decide who gets offered a
 * freed slot. They are tested without a database on purpose: the DST behaviour below is the
 * kind of defect that otherwise surfaces once a year, in production, at 2am on a Sunday.
 */
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TIME_ZONE,
  normalizeTime,
  normalizeWeek,
  normalizeWindow,
  sessionSlot,
  windowCovers,
} from '../../utils/availabilityWindows.mjs';

describe('normalizeTime', () => {
  it('canonicalises the forms a UI actually sends', () => {
    expect(normalizeTime('09:00')).toBe('09:00:00');
    expect(normalizeTime('09:00:30')).toBe('09:00:30');
    expect(normalizeTime(' 23:59 ')).toBe('23:59:00');
    expect(normalizeTime('00:00')).toBe('00:00:00');
  });

  it('rejects anything that is not a real 24-hour time', () => {
    for (const bad of ['24:00', '9:00', '09:60', '', 'morning', null, undefined, 900, {}]) {
      expect(normalizeTime(bad)).toBeNull();
    }
  });
});

describe('normalizeWindow', () => {
  it('accepts a well-formed window', () => {
    expect(normalizeWindow({ dayOfWeek: 2, startTime: '09:00', endTime: '11:30' })).toEqual({
      dayOfWeek: 2,
      startTime: '09:00:00',
      endTime: '11:30:00',
    });
  });

  it('REJECTS a zero-width or inverted window rather than repairing it', () => {
    // A window that matches nothing presents as "I set my availability and nobody ever offers
    // me anything" — much worse than failing loudly at save time.
    expect(normalizeWindow({ dayOfWeek: 1, startTime: '09:00', endTime: '09:00' })).toBeNull();
    expect(normalizeWindow({ dayOfWeek: 1, startTime: '11:00', endTime: '09:00' })).toBeNull();
  });

  it('rejects an out-of-range or missing day', () => {
    for (const dayOfWeek of [-1, 7, 1.5, null, undefined, 'Tuesday']) {
      expect(normalizeWindow({ dayOfWeek, startTime: '09:00', endTime: '10:00' })).toBeNull();
    }
  });
});

describe('normalizeWeek — the grid is painted, so it must be merged', () => {
  it('merges overlapping windows on the same day', () => {
    expect(
      normalizeWeek([
        { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
      ]),
    ).toEqual([{ dayOfWeek: 2, startTime: '09:00:00', endTime: '12:00:00' }]);
  });

  it('merges TOUCHING windows — two gestures, one intention', () => {
    // Painting 09-10 then 10-11 must match a 09:30-10:30 slot. Stored as two rows it matches
    // neither, which is the whole reason merging happens before write.
    expect(
      normalizeWeek([
        { dayOfWeek: 3, startTime: '10:00', endTime: '11:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '10:00' },
      ]),
    ).toEqual([{ dayOfWeek: 3, startTime: '09:00:00', endTime: '11:00:00' }]);
  });

  it('keeps a genuine gap on the same day as two windows', () => {
    expect(
      normalizeWeek([
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
      ]),
    ).toHaveLength(2);
  });

  it('never merges across days, and returns days in order', () => {
    const week = normalizeWeek([
      { dayOfWeek: 5, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 5, startTime: '09:30', endTime: '11:00' },
    ]);
    expect(week.map((w) => w.dayOfWeek)).toEqual([0, 5]);
    expect(week[1]).toEqual({ dayOfWeek: 5, startTime: '09:00:00', endTime: '11:00:00' });
  });

  it('drops invalid windows instead of failing the whole save', () => {
    expect(
      normalizeWeek([
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 9, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 2, startTime: 'nonsense', endTime: '10:00' },
      ]),
    ).toEqual([{ dayOfWeek: 2, startTime: '09:00:00', endTime: '10:00:00' }]);
  });

  it('is idempotent and tolerates junk input', () => {
    const once = normalizeWeek([
      { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
    ]);
    expect(normalizeWeek(once)).toEqual(once);
    for (const junk of [null, undefined, 'nope', 42, {}]) expect(normalizeWeek(junk)).toEqual([]);
  });
});

describe('windowCovers — start inclusive, end exclusive', () => {
  const w = { dayOfWeek: 2, startTime: '09:00:00', endTime: '11:00:00' };

  it('covers the start instant but NOT the end instant', () => {
    expect(windowCovers(w, 2, '09:00:00')).toBe(true);
    expect(windowCovers(w, 2, '10:59:59')).toBe(true);
    expect(windowCovers(w, 2, '11:00:00')).toBe(false); // back-to-back windows must not double-match
  });

  it('does not cover another day at the same time', () => {
    expect(windowCovers(w, 3, '09:30:00')).toBe(false);
  });
});

describe('sessionSlot — the ONLY bridge from an instant to a business-local slot', () => {
  it('resolves a UTC instant into business-local day and time', () => {
    // 2026-08-27T17:30:00Z is 10:30 Thursday in America/Los_Angeles (PDT, UTC-7).
    expect(sessionSlot(new Date('2026-08-27T17:30:00Z'))).toEqual({ dayOfWeek: 4, timeOfDay: '10:30:00' });
  });

  it('rolls the DAY back when UTC has already ticked over but the gym has not', () => {
    // 2026-08-28T03:00:00Z is Friday in UTC but still 20:00 THURSDAY in Los Angeles. Using the
    // UTC weekday here would offer a Friday-evening slot to clients who declared Thursdays.
    expect(sessionSlot(new Date('2026-08-28T03:00:00Z'))).toEqual({ dayOfWeek: 4, timeOfDay: '20:00:00' });
  });

  it('honours DST: the same UTC hour is a different local hour in winter and summer', () => {
    const summer = sessionSlot(new Date('2026-07-01T17:00:00Z')); // PDT, UTC-7
    const winter = sessionSlot(new Date('2026-01-01T17:00:00Z')); // PST, UTC-8
    expect(summer.timeOfDay).toBe('10:00:00');
    expect(winter.timeOfDay).toBe('09:00:00');
    // A naive UTC-offset constant would report these as the same local time and mis-match one.
    expect(summer.timeOfDay).not.toBe(winter.timeOfDay);
  });

  it('renders local midnight as 00, never 24', () => {
    // Some ICU versions emit hour '24' under hour12:false; '24:00:00' would sort ABOVE every
    // window end and silently match nothing.
    const midnight = sessionSlot(new Date('2026-08-27T07:00:00Z')); // 00:00 PDT
    expect(midnight.timeOfDay.startsWith('24')).toBe(false);
    expect(midnight.timeOfDay).toBe('00:00:00');
  });

  it('returns null for an unusable instant rather than a plausible wrong slot', () => {
    for (const bad of [new Date('nope'), 'not-a-date', null, undefined]) {
      expect(sessionSlot(bad)).toBeNull();
    }
  });

  it('is wired to the business timezone, not the host machine', () => {
    expect(BUSINESS_TIME_ZONE).toBe(process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles');
  });
});

describe('end-to-end: a freed slot matches the right standing windows', () => {
  it('matches a Thursday-morning client to a Thursday 10:30 cancellation', () => {
    const week = normalizeWeek([
      { dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '12:00' }, // touching -> merged to 09:00-12:00
      { dayOfWeek: 1, startTime: '18:00', endTime: '20:00' },
    ]);
    const slot = sessionSlot(new Date('2026-08-27T17:30:00Z')); // Thu 10:30 local

    expect(week.filter((w) => windowCovers(w, slot.dayOfWeek, slot.timeOfDay))).toEqual([
      { dayOfWeek: 4, startTime: '09:00:00', endTime: '12:00:00' },
    ]);
  });

  it('does not match a client whose window ends exactly at the slot', () => {
    const week = normalizeWeek([{ dayOfWeek: 4, startTime: '09:00', endTime: '10:30' }]);
    const slot = sessionSlot(new Date('2026-08-27T17:30:00Z')); // Thu 10:30 local
    expect(week.filter((w) => windowCovers(w, slot.dayOfWeek, slot.timeOfDay))).toEqual([]);
  });
});
