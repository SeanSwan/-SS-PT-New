import { describe, expect, it } from 'vitest';
import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from './nutritionDate';

describe('nutritionDate', () => {
  it('formats the local calendar date instead of the UTC calendar day', () => {
    expect(formatLocalCalendarDate(new Date(2026, 0, 5, 23, 45))).toBe('2026-01-05');
  });

  it('walks backward by local calendar days for week ranges', () => {
    expect(getLocalCalendarDateDaysAgo(6, new Date(2026, 5, 20, 12, 0))).toBe('2026-06-14');
  });
});
