/**
 * Creator-streak day grid — data-truth regression.
 *
 * The Home left rail renders a 7-tile grid under "Creator Streak". It used to
 * fill left-to-right from the streak COUNT (`index < Math.min(streakDays, 7)`),
 * so a Wed/Thu/Fri streak lit up Mon/Tue/Wed — a direct assertion about which
 * days the member trained, made without ever reading a session date.
 *
 * buildWeekTrainingDays derives each tile from real logged session dates over
 * the TRAILING 7 days ending today — deliberately the same rolling window
 * buildHomeTrainingProof counts, so the grid and the "This Week" number can
 * never contradict each other on screen.
 */
import { describe, expect, it } from 'vitest';
import { buildHomeTrainingProof, buildWeekTrainingDays } from './HomeTabProofViewModel';

/** Thursday 2026-08-06, 10:00 local. */
const THURSDAY = new Date(2026, 7, 6, 10, 0, 0).getTime();
const at = (year: number, monthIndex: number, day: number, hour = 9) =>
  new Date(year, monthIndex, day, hour).toISOString();

describe('buildWeekTrainingDays', () => {
  it('covers the trailing seven days, ending today', () => {
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(days).toHaveLength(7);
    // Thursday back through the previous Friday.
    expect(days.map((day) => day.dayName)).toEqual([
      'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    ]);
    expect(days.map((day) => day.label)).toEqual(['F', 'S', 'S', 'M', 'T', 'W', 'T']);
  });

  it('fills the days actually trained, not the first N days', () => {
    // Wednesday + Thursday — a 2-day streak, the last two tiles.
    const days = buildWeekTrainingDays(
      [{ date: at(2026, 7, 5) }, { date: at(2026, 7, 6) }],
      THURSDAY,
    );

    expect(days.map((day) => day.trained)).toEqual([
      false, false, false, false, false, true, true,
    ]);
  });

  it('does not mark days trained just because a streak exists', () => {
    expect(buildWeekTrainingDays([], THURSDAY).every((day) => day.trained === false)).toBe(true);
  });

  it('marks today as the final tile', () => {
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(days.map((day) => day.isToday)).toEqual([
      false, false, false, false, false, false, true,
    ]);
    expect(days[6].dayName).toBe('Thursday');
  });

  it('ignores sessions older than the trailing window', () => {
    const days = buildWeekTrainingDays(
      [
        { date: at(2026, 6, 30) }, // 7+ days back
        { date: at(2026, 6, 20) },
      ],
      THURSDAY,
    );

    expect(days.every((day) => day.trained === false)).toBe(true);
  });

  it('buckets correctly across a DST transition', () => {
    // US DST ends Sunday 2026-11-01. Adding a fixed 24h to a day start would
    // overshoot into the next tile on the 25-hour day.
    const wednesday = new Date(2026, 10, 4, 12, 0, 0).getTime();
    const days = buildWeekTrainingDays(
      [
        { date: at(2026, 10, 2, 23) }, // Monday late evening
        { date: at(2026, 10, 3, 1) }, // Tuesday just after midnight
      ],
      wednesday,
    );

    const monday = days.find((day) => day.dayName === 'Monday');
    const tuesday = days.find((day) => day.dayName === 'Tuesday');
    expect(monday?.trained).toBe(true);
    expect(tuesday?.trained).toBe(true);
    expect(days.filter((day) => day.trained)).toHaveLength(2);
  });

  it('tolerates malformed and future-dated sessions', () => {
    const days = buildWeekTrainingDays(
      [null, 'not-a-session', { date: 'nonsense' }, { date: at(2026, 7, 8) }] as unknown[],
      THURSDAY,
    );

    expect(days.every((day) => day.trained === false)).toBe(true);
  });

  it('reads the same date fields as the rest of the proof loop', () => {
    expect(buildWeekTrainingDays([{ completedAt: at(2026, 7, 5) }], THURSDAY)[5].trained).toBe(true);
    expect(buildWeekTrainingDays([{ createdAt: at(2026, 7, 5) }], THURSDAY)[5].trained).toBe(true);
  });

  it('treats an absent session list as no data, not as seven missed days', () => {
    // The caller must gate on the fetch error; the builder itself simply
    // reports nothing trained, which is why the outage gate exists upstream.
    expect(buildWeekTrainingDays(undefined, THURSDAY).every((day) => !day.trained)).toBe(true);
  });
});

describe('the grid and the "This Week" count share one definition', () => {
  it('agrees with buildHomeTrainingProof for a session earlier in the trailing week', () => {
    // Last Saturday, 5 days before Thursday: inside the rolling 7-day window
    // but BEFORE the calendar Monday. A calendar-week grid showed zero tiles
    // while the proof card said "1 this week".
    const sessions = [{ date: at(2026, 8 - 1, 1) }];
    const proof = buildHomeTrainingProof(sessions, THURSDAY);
    const days = buildWeekTrainingDays(sessions, THURSDAY);

    expect(proof.thisWeekCount).toBe(1);
    expect(days.filter((day) => day.trained)).toHaveLength(1);
  });

  it('agrees when there is nothing logged', () => {
    const proof = buildHomeTrainingProof([], THURSDAY);
    const days = buildWeekTrainingDays([], THURSDAY);

    expect(proof.thisWeekCount).toBe(0);
    expect(days.filter((day) => day.trained)).toHaveLength(0);
  });

  it('agrees on a multi-session week', () => {
    const sessions = [
      { date: at(2026, 7, 2) },
      { date: at(2026, 7, 4) },
      { date: at(2026, 7, 6) },
    ];
    const proof = buildHomeTrainingProof(sessions, THURSDAY);
    const days = buildWeekTrainingDays(sessions, THURSDAY);

    expect(proof.thisWeekCount).toBe(3);
    expect(days.filter((day) => day.trained)).toHaveLength(3);
  });
});
