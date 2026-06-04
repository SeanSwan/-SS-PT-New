import { describe, expect, it } from 'vitest';

import {
  formatWorkoutHistoryDate,
  formatWorkoutHistoryVolume,
} from './workoutHistoryFormatters';

describe('workoutHistoryFormatters', () => {
  it('formats workout dates with the panel month-day-year presentation', () => {
    expect(formatWorkoutHistoryDate('2026-05-20T12:00:00Z')).toBe('May 20, 2026');
  });

  it('returns an empty date label when the date is missing', () => {
    expect(formatWorkoutHistoryDate('')).toBe('');
  });

  it('rounds and localizes workout volume labels', () => {
    expect(formatWorkoutHistoryVolume(12345.6)).toBe('12,346 lbs');
  });
});
