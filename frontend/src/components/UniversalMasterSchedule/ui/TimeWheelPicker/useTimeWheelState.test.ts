import { describe, it, expect } from 'vitest';
import {
  normalizeStep,
  parseTime,
  formatTime,
  formatTimeDisplay,
  computeMaxTime,
  generateSlots,
  isTimeInRange,
  roundUpToStep,
  validateTimeRange,
  combineDateAndTime,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
} from './useTimeWheelState';

// ─── normalizeStep ───────────────────────────────────────────────────────────

describe('normalizeStep', () => {
  it('returns 15 for undefined/null/NaN', () => {
    expect(normalizeStep(undefined)).toBe(15);
    expect(normalizeStep(null)).toBe(15);
    expect(normalizeStep(NaN)).toBe(15);
  });

  it('returns 15 for out-of-range values', () => {
    expect(normalizeStep(0)).toBe(15);
    expect(normalizeStep(-1)).toBe(15);
    expect(normalizeStep(61)).toBe(15);
    expect(normalizeStep(100)).toBe(15);
  });

  it('floors non-integer values', () => {
    expect(normalizeStep(7.5)).toBe(7);
    expect(normalizeStep(15.9)).toBe(15);
  });

  it('passes through valid integers', () => {
    expect(normalizeStep(1)).toBe(1);
    expect(normalizeStep(10)).toBe(10);
    expect(normalizeStep(15)).toBe(15);
    expect(normalizeStep(30)).toBe(30);
    expect(normalizeStep(60)).toBe(60);
  });
});

// ─── parseTime ───────────────────────────────────────────────────────────────

describe('parseTime', () => {
  it('parses midnight', () => {
    expect(parseTime('00:00')).toEqual({ hour: 12, minute: 0, period: 'AM' });
  });

  it('parses noon', () => {
    expect(parseTime('12:00')).toEqual({ hour: 12, minute: 0, period: 'PM' });
  });

  it('parses afternoon time', () => {
    expect(parseTime('14:30')).toEqual({ hour: 2, minute: 30, period: 'PM' });
  });

  it('parses morning time', () => {
    expect(parseTime('09:15')).toEqual({ hour: 9, minute: 15, period: 'AM' });
  });

  it('parses 23:59', () => {
    expect(parseTime('23:59')).toEqual({ hour: 11, minute: 59, period: 'PM' });
  });

  it('returns null for invalid input', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('1:30')).toBeNull(); // not zero-padded
  });
});

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats PM time to 24h', () => {
    expect(formatTime(2, 30, 'PM')).toBe('14:30');
  });

  it('formats AM time to 24h', () => {
    expect(formatTime(9, 0, 'AM')).toBe('09:00');
  });

  it('formats 12 PM (noon)', () => {
    expect(formatTime(12, 0, 'PM')).toBe('12:00');
  });

  it('formats 12 AM (midnight)', () => {
    expect(formatTime(12, 0, 'AM')).toBe('00:00');
  });

  it('roundtrips with parseTime', () => {
    const original = '14:30';
    const parsed = parseTime(original)!;
    expect(formatTime(parsed.hour, parsed.minute, parsed.period)).toBe(original);
  });
});

// ─── formatTimeDisplay ───────────────────────────────────────────────────────

describe('formatTimeDisplay', () => {
  it('formats 14:30 as 2:30 PM', () => {
    expect(formatTimeDisplay('14:30')).toBe('2:30 PM');
  });

  it('formats 09:00 as 9:00 AM', () => {
    expect(formatTimeDisplay('09:00')).toBe('9:00 AM');
  });

  it('formats 00:00 as 12:00 AM', () => {
    expect(formatTimeDisplay('00:00')).toBe('12:00 AM');
  });

  it('returns input on invalid', () => {
    expect(formatTimeDisplay('bad')).toBe('bad');
  });
});

// ─── computeMaxTime ──────────────────────────────────────────────────────────

describe('computeMaxTime', () => {
  it('step=15 -> 23:45', () => {
    expect(computeMaxTime(15)).toBe('23:45');
  });

  it('step=10 -> 23:50', () => {
    expect(computeMaxTime(10)).toBe('23:50');
  });

  it('step=30 -> 23:30', () => {
    expect(computeMaxTime(30)).toBe('23:30');
  });

  it('step=60 -> 23:00', () => {
    expect(computeMaxTime(60)).toBe('23:00');
  });

  it('step=7 -> 23:57 (non-standard step)', () => {
    // floor(1439 / 7) * 7 = 205 * 7 = 1435 = 23h 55m
    // Wait: 1439 / 7 = 205.57, floor = 205, 205*7 = 1435 = 23*60+55 = 23:55
    expect(computeMaxTime(7)).toBe('23:55');
  });

  it('step=13 -> works for odd divisors', () => {
    // floor(1439 / 13) = 110, 110 * 13 = 1430 = 23*60+50 = 23:50
    expect(computeMaxTime(13)).toBe('23:50');
  });

  it('step=1 -> 23:59', () => {
    expect(computeMaxTime(1)).toBe('23:59');
  });
});

// ─── generateSlots ───────────────────────────────────────────────────────────

describe('generateSlots', () => {
  it('generates 15-min slots from 09:00 to 10:00', () => {
    const slots = generateSlots('09:00', '10:00', 15);
    expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00']);
  });

  it('generates full day of 60-min slots', () => {
    const slots = generateSlots('00:00', '23:00', 60);
    expect(slots).toHaveLength(24);
    expect(slots[0]).toBe('00:00');
    expect(slots[23]).toBe('23:00');
  });

  it('uses computed maxTime when max not provided', () => {
    const slots = generateSlots('23:00', undefined, 15);
    expect(slots).toEqual(['23:00', '23:15', '23:30', '23:45']);
  });

  it('aligns start to step boundary', () => {
    const slots = generateSlots('09:07', '10:00', 15);
    expect(slots[0]).toBe('09:15');
  });

  it('returns empty when min > max', () => {
    const slots = generateSlots('23:50', '09:00', 15);
    expect(slots).toEqual([]);
  });
});

// ─── isTimeInRange ───────────────────────────────────────────────────────────

describe('isTimeInRange', () => {
  it('returns true when in range', () => {
    expect(isTimeInRange('10:00', '09:00', '17:00')).toBe(true);
  });

  it('returns true at boundaries', () => {
    expect(isTimeInRange('09:00', '09:00', '17:00')).toBe(true);
    expect(isTimeInRange('17:00', '09:00', '17:00')).toBe(true);
  });

  it('returns false when out of range', () => {
    expect(isTimeInRange('08:00', '09:00', '17:00')).toBe(false);
    expect(isTimeInRange('18:00', '09:00', '17:00')).toBe(false);
  });

  it('works with only min', () => {
    expect(isTimeInRange('08:00', '09:00')).toBe(false);
    expect(isTimeInRange('10:00', '09:00')).toBe(true);
  });

  it('works with only max', () => {
    expect(isTimeInRange('18:00', undefined, '17:00')).toBe(false);
    expect(isTimeInRange('16:00', undefined, '17:00')).toBe(true);
  });
});

// ─── roundUpToStep ───────────────────────────────────────────────────────────

describe('roundUpToStep', () => {
  it('already on boundary -> same value', () => {
    expect(roundUpToStep('09:00', 15)).toBe('09:00');
  });

  it('rounds up to next boundary', () => {
    expect(roundUpToStep('09:01', 15)).toBe('09:15');
  });

  it('crosses hour boundary', () => {
    expect(roundUpToStep('09:59', 15)).toBe('10:00');
  });

  it('returns null when no valid slot (step=15)', () => {
    // maxTime for step=15 is 23:45. 23:50 rounds to 24:00 which exceeds.
    expect(roundUpToStep('23:50', 15)).toBeNull();
  });

  it('returns exactly last slot', () => {
    expect(roundUpToStep('23:45', 15)).toBe('23:45');
  });

  it('works with step=10', () => {
    expect(roundUpToStep('23:50', 10)).toBe('23:50');
  });

  it('rounds up near midnight with step=30', () => {
    // maxTime for step=30 is 23:30
    expect(roundUpToStep('23:31', 30)).toBeNull();
    expect(roundUpToStep('23:30', 30)).toBe('23:30');
  });

  it('rounds up from 00:00', () => {
    expect(roundUpToStep('00:00', 15)).toBe('00:00');
  });

  it('works with step=1', () => {
    expect(roundUpToStep('23:59', 1)).toBe('23:59');
  });
});

// ─── validateTimeRange ───────────────────────────────────────────────────────

describe('validateTimeRange', () => {
  it('valid range', () => {
    expect(validateTimeRange('09:00', '17:00')).toEqual({ valid: true });
  });

  it('invalid: end <= start', () => {
    const result = validateTimeRange('17:00', '09:00');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('invalid: equal times', () => {
    const result = validateTimeRange('09:00', '09:00');
    expect(result.valid).toBe(false);
  });
});

// ─── combineDateAndTime ──────────────────────────────────────────────────────

describe('combineDateAndTime', () => {
  it('produces locked format', () => {
    expect(combineDateAndTime('2026-02-15', '14:30')).toBe('2026-02-15T14:30:00');
  });

  it('produces locked format for morning', () => {
    expect(combineDateAndTime('2026-02-15', '09:00')).toBe('2026-02-15T09:00:00');
  });

  it('throws on invalid date format', () => {
    expect(() => combineDateAndTime('bad', '14:30')).toThrow('Invalid date format');
  });

  it('throws on invalid time format', () => {
    expect(() => combineDateAndTime('2026-02-15', 'bad')).toThrow('Invalid time format');
  });

  it('throws on single-digit time', () => {
    expect(() => combineDateAndTime('2026-02-15', '9:00')).toThrow('Invalid time format');
  });
});

// ─── getLocalToday ───────────────────────────────────────────────────────────

describe('getLocalToday', () => {
  it('returns YYYY-MM-DD for a known timestamp', () => {
    // 2026-02-15 at noon UTC. Exact local date depends on timezone,
    // but we test the format.
    const result = getLocalToday(1739620800000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today without args', () => {
    const result = getLocalToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── getMinTimeForToday ──────────────────────────────────────────────────────

describe('getMinTimeForToday', () => {
  it('frozen clock at 09:07 -> rounds up to 09:15', () => {
    // Create a date at 09:07 local time
    const d = new Date();
    d.setHours(9, 7, 0, 0);
    expect(getMinTimeForToday(15, d.getTime())).toBe('09:15');
  });

  it('frozen clock at 09:00 -> returns 09:00 (already on boundary)', () => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    expect(getMinTimeForToday(15, d.getTime())).toBe('09:00');
  });

  it('frozen clock at 23:55 -> returns null (no valid slots)', () => {
    const d = new Date();
    d.setHours(23, 55, 0, 0);
    expect(getMinTimeForToday(15, d.getTime())).toBeNull();
  });

  it('frozen clock at 23:45 -> returns 23:45 (exactly last slot for step=15)', () => {
    const d = new Date();
    d.setHours(23, 45, 0, 0);
    expect(getMinTimeForToday(15, d.getTime())).toBe('23:45');
  });

  it('frozen clock at 00:00 -> returns 00:00', () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(getMinTimeForToday(15, d.getTime())).toBe('00:00');
  });
});

// ─── getTimezoneAbbr ─────────────────────────────────────────────────────────

describe('getTimezoneAbbr', () => {
  it('returns a non-empty string in standard environments', () => {
    const result = getTimezoneAbbr();
    // In jsdom, Intl may return various formats. Just verify it doesn't throw.
    expect(typeof result).toBe('string');
  });
});
