/**
 * Creator-streak weekday grid — data-truth regression.
 *
 * The Home left rail renders a Mon..Sun tile grid under the "Creator Streak"
 * heading. It used to fill left-to-right from the streak COUNT
 * (`index < Math.min(streakDays, 7)`), so a Wed/Thu/Fri streak lit up
 * Mon/Tue/Wed — a direct assertion about which days the member trained, made
 * without ever looking at a session date.
 *
 * buildWeekTrainingDays derives each tile from real logged session dates.
 */
import { describe, expect, it } from 'vitest';
import { buildWeekTrainingDays } from './HomeTabProofViewModel';

/** Thursday 2026-08-06, 10:00 local. */
const THURSDAY = new Date(2026, 7, 6, 10, 0, 0).getTime();
const at = (year: number, monthIndex: number, day: number, hour = 9) =>
  new Date(year, monthIndex, day, hour).toISOString();

describe('buildWeekTrainingDays', () => {
  it('labels the week Monday through Sunday', () => {
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('fills the days actually trained, not the first N days', () => {
    // Wednesday + Thursday of the current week — a 2-day streak.
    const sessions = [
      { date: at(2026, 7, 5) },
      { date: at(2026, 7, 6) },
    ];

    const days = buildWeekTrainingDays(sessions, THURSDAY);

    expect(days.map((day) => day.trained)).toEqual([
      false, false, true, true, false, false, false,
    ]);
  });

  it('does not mark days trained just because a streak exists', () => {
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(days.every((day) => day.trained === false)).toBe(true);
  });

  it('marks today and never marks a future day as missed', () => {
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(days.map((day) => day.isToday)).toEqual([
      false, false, false, true, false, false, false,
    ]);
    // Mon-Wed are past, Thursday is today, Fri-Sun are still upcoming.
    expect(days.map((day) => day.isUpcoming)).toEqual([
      false, false, false, false, true, true, true,
    ]);
  });

  it('ignores sessions outside the current week', () => {
    // The week containing Thursday 2026-08-06 starts Monday 2026-08-03.
    const sessions = [
      { date: at(2026, 7, 2) }, // Sunday, the day before this week began
      { date: at(2026, 6, 27) }, // previous week
    ];

    const days = buildWeekTrainingDays(sessions, THURSDAY);

    expect(days.every((day) => day.trained === false)).toBe(true);
  });

  it('counts a Sunday session on Sunday, not Monday', () => {
    // Sunday 2026-08-09 is the last tile of the week containing THURSDAY.
    const sunday = new Date(2026, 7, 9, 12, 0, 0).getTime();
    const days = buildWeekTrainingDays([{ date: at(2026, 7, 9) }], sunday);

    expect(days[6].trained).toBe(true);
    expect(days[0].trained).toBe(false);
  });

  it('tolerates malformed and future-dated sessions', () => {
    const sessions = [
      null,
      'not-a-session',
      { date: 'nonsense' },
      { date: at(2026, 7, 8) }, // Saturday, still in the future at THURSDAY
    ];

    const days = buildWeekTrainingDays(sessions as unknown[], THURSDAY);

    expect(days.every((day) => day.trained === false)).toBe(true);
  });

  it('reads the same date fields as the rest of the proof loop', () => {
    expect(buildWeekTrainingDays([{ completedAt: at(2026, 7, 5) }], THURSDAY)[2].trained).toBe(true);
    expect(buildWeekTrainingDays([{ createdAt: at(2026, 7, 5) }], THURSDAY)[2].trained).toBe(true);
  });
});
