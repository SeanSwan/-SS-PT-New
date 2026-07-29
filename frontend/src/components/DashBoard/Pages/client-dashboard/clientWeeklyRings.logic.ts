/**
 * Blueprint: clientWeeklyRings.logic
 * Purpose: pure local-week bucketing for the Apex weekly rings (Workout-OS
 * C3). The ring-weekly-source endpoint ships RAW timestamps and never
 * truncates a week (its TZ contract) — the CLIENT owns local bucketing.
 * Semantics: Monday-start LOCAL weeks; ring pct = this week vs the average
 * of the prior three weeks ("your pace") — self-referential truth, never an
 * invented goal. No history → pct is 100 when any work exists, else 0.
 */

export interface RingSourceSession {
  ts: string;
  durationMinutes: number | null;
  volume: number | null;
  sets: number | null;
}

export interface RingMetric {
  /** This local week's total. */
  value: number;
  /** Average of the prior 3 local weeks (0 when no history). */
  pace: number;
  /** 0-100, value vs pace, capped. */
  pct: number;
}

export interface WeeklyRings {
  workouts: RingMetric;
  volume: RingMetric;
  minutes: RingMetric;
  /** False when the prior-3-week window contains zero sessions. */
  hasPace: boolean;
}

/** Monday 00:00 LOCAL of the week containing `d`. */
export const startOfLocalWeek = (d: Date): Date => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 0 = current local week, 1..n = weeks back. Math.round absorbs DST hour shifts. */
export const localWeeksAgo = (ts: string, now: Date): number | null => {
  const when = new Date(ts);
  if (Number.isNaN(when.getTime())) return null;
  const diff = startOfLocalWeek(now).getTime() - startOfLocalWeek(when).getTime();
  return Math.round(diff / WEEK_MS);
};

const metric = (value: number, pace: number): RingMetric => ({
  value,
  pace,
  pct: pace > 0 ? Math.min(100, Math.round((value / pace) * 100)) : (value > 0 ? 100 : 0),
});

export function bucketWeeklyRings(sessions: RingSourceSession[], now: Date = new Date()): WeeklyRings {
  const weeks = [0, 1, 2, 3].map(() => ({ workouts: 0, volume: 0, minutes: 0 }));

  for (const session of sessions ?? []) {
    const ago = localWeeksAgo(session.ts, now);
    if (ago === null || ago < 0 || ago > 3) continue;
    weeks[ago].workouts += 1;
    weeks[ago].volume += Number(session.volume) || 0;
    weeks[ago].minutes += Number(session.durationMinutes) || 0;
  }

  const prior = weeks.slice(1);
  const priorWorkouts = prior.reduce((sum, w) => sum + w.workouts, 0);
  const pace = {
    workouts: priorWorkouts / 3,
    volume: prior.reduce((sum, w) => sum + w.volume, 0) / 3,
    minutes: prior.reduce((sum, w) => sum + w.minutes, 0) / 3,
  };

  return {
    workouts: metric(weeks[0].workouts, pace.workouts),
    volume: metric(weeks[0].volume, pace.volume),
    minutes: metric(weeks[0].minutes, pace.minutes),
    hasPace: priorWorkouts > 0,
  };
}
