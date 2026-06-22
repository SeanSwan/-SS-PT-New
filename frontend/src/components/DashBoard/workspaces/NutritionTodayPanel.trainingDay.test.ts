import { describe, expect, it } from 'vitest';
import { formatLocalCalendarDate } from './clients-team/nutritionDate';
import { hasWorkoutLoggedOnDate } from './NutritionTodayPanel.trainingDay';

describe('NutritionTodayPanel training-day truth', () => {
  it('detects a logged workout on the same local calendar date', () => {
    const sessionDate = new Date(2026, 5, 20, 18, 30);
    const today = formatLocalCalendarDate(sessionDate);

    expect(hasWorkoutLoggedOnDate([
      { id: 'old', date: new Date(2026, 5, 19, 8, 0).toISOString() },
      { id: 'today', completedAt: sessionDate.toISOString() },
    ], today)).toBe(true);
  });

  it('does not treat metadata timestamps or malformed rows as training truth', () => {
    expect(hasWorkoutLoggedOnDate([
      { id: 'metadata-only', createdAt: '2026-06-20T12:00:00.000Z' },
      { id: 'bad', date: 'not-a-date' },
      null,
    ], '2026-06-20')).toBe(false);
  });

  it('treats date-only workout rows as local calendar dates, not UTC timestamps', () => {
    expect(hasWorkoutLoggedOnDate([{ id: 'date-only', date: '2026-06-20' }], '2026-06-20')).toBe(true);
  });
});
