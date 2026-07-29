/**
 * Weekly-rings local-bucketing contract (Workout-OS C3).
 * The endpoint's TZ contract puts week math on the client — these tests pin
 * Monday-local weeks, the 4-week pace denominator, cold-start honesty, and
 * garbage-timestamp tolerance.
 */
import { describe, expect, it } from 'vitest';
import { bucketWeeklyRings, localWeeksAgo, startOfLocalWeek } from './clientWeeklyRings.logic';

// Wed 2026-07-29 local noon.
const NOW = new Date(2026, 6, 29, 12, 0, 0);

const session = (ts: string, volume = 1000, durationMinutes = 45) => ({
  ts,
  volume,
  durationMinutes,
  sets: 10,
});

describe('startOfLocalWeek / localWeeksAgo', () => {
  it('anchors weeks on local Monday 00:00', () => {
    const monday = startOfLocalWeek(NOW);
    expect(monday.getDay()).toBe(1);
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 6, 27]);
    expect(monday.getHours()).toBe(0);
  });

  it('buckets Sunday into the same week as the preceding Monday', () => {
    expect(localWeeksAgo(new Date(2026, 7, 2, 23, 59).toISOString(), NOW)).toBe(0);
    expect(localWeeksAgo(new Date(2026, 6, 26, 23, 59).toISOString(), NOW)).toBe(1);
  });

  it('returns null for garbage timestamps', () => {
    expect(localWeeksAgo('not-a-date', NOW)).toBeNull();
  });
});

describe('bucketWeeklyRings', () => {
  it('computes this week vs the prior-3-week pace', () => {
    const sessions = [
      // current week: 2 workouts, 2000 vol, 90 min
      session(new Date(2026, 6, 27, 9).toISOString()),
      session(new Date(2026, 6, 28, 9).toISOString()),
      // one workout in each of the prior 3 weeks → pace = 1/week
      session(new Date(2026, 6, 21, 9).toISOString()),
      session(new Date(2026, 6, 14, 9).toISOString()),
      session(new Date(2026, 6, 7, 9).toISOString()),
    ];

    const rings = bucketWeeklyRings(sessions, NOW);

    expect(rings.hasPace).toBe(true);
    expect(rings.workouts).toEqual({ value: 2, pace: 1, pct: 100 });
    expect(rings.volume.value).toBe(2000);
    expect(rings.minutes.value).toBe(90);
    expect(rings.volume.pct).toBe(100);
  });

  it('caps pct at 100 and floors partial pace honestly', () => {
    const sessions = [
      session(new Date(2026, 6, 27, 9).toISOString(), 500, 30),
      // prior weeks: 3 workouts in week-1 only → pace 1/week; volume pace 1000
      session(new Date(2026, 6, 20, 9).toISOString(), 1500),
      session(new Date(2026, 6, 21, 9).toISOString(), 1500),
      session(new Date(2026, 6, 22, 9).toISOString(), 0, 0),
    ];

    const rings = bucketWeeklyRings(sessions, NOW);

    expect(rings.workouts.pace).toBe(1);
    expect(rings.workouts.pct).toBe(100);
    expect(rings.volume.pace).toBe(1000);
    expect(rings.volume.pct).toBe(50);
  });

  it('cold start: no history → pct 100 when work exists this week, 0 when idle', () => {
    const active = bucketWeeklyRings([session(new Date(2026, 6, 28, 9).toISOString())], NOW);
    expect(active.hasPace).toBe(false);
    expect(active.workouts.pct).toBe(100);

    const idle = bucketWeeklyRings([], NOW);
    expect(idle.hasPace).toBe(false);
    expect(idle.workouts).toEqual({ value: 0, pace: 0, pct: 0 });
  });

  it('ignores sessions older than the 4-week window and future timestamps', () => {
    const rings = bucketWeeklyRings([
      session(new Date(2026, 5, 1, 9).toISOString()),
      session(new Date(2026, 7, 15, 9).toISOString()),
    ], NOW);

    expect(rings.workouts.value).toBe(0);
    expect(rings.hasPace).toBe(false);
  });
});
