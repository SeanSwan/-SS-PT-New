/**
 * ============================================================================
 * FILE: HomeTabProofViewModel.ts
 * PURPOSE: Pure builders for the Home training-proof loop (workstream O3,
 *          extracted from HomeTabViewModel for the rule-4 cap). Everything
 *          derives from REAL logged workout sessions:
 *          - buildHomeTrainingProof — week counts/minutes, 4-week trend,
 *            week-over-week delta, last session, the shareable recap line,
 *            and the latest session id so shares post as REAL workout posts
 *            (type 'workout' + persisted workoutSessionId link).
 *          - assessStreakRisk — the streak-rescue signal: streak alive, no
 *            session logged today, evening approaching → Home escalates.
 * ============================================================================
 */
import { formatAgo } from './HomeTabLiveWidgetViewModel';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many whole calendar days back a timestamp falls, relative to the start of
 * today. Day-aligned on purpose: an instant-based `(now - t) / 7 days` window
 * slides by the hour, so a session 6 days and 20 hours old counted as "this
 * week" while the day grid beside it — which can only draw whole days — showed
 * nothing. Rounding absorbs DST's 23- and 25-hour days.
 */
const calendarDaysAgo = (timeMs: number, startOfTodayMs: number): number => {
  const sessionDay = new Date(timeMs);
  sessionDay.setHours(0, 0, 0, 0);
  return Math.round((startOfTodayMs - sessionDay.getTime()) / DAY_MS);
};
/** Hour of day (local) after which an unbroken-but-untrained streak is at risk. */
const STREAK_RISK_HOUR = 15;

export function isLoggedWorkoutSession(session: unknown): session is Record<string, unknown> {
  return !!session
    && typeof session === 'object'
    && (session as Record<string, unknown>).status === 'completed';
}

/** Real training proof from logged workout sessions — the Product Core Loop on Home. */
export interface HomeTrainingProof {
  thisWeekCount: number;
  minutesThisWeek: number;
  /** Last 4 weeks of logged-workout counts, oldest → current. REAL buckets. */
  weeklyCounts: number[];
  /** This week vs last week — null until there is any history to compare. */
  weekDelta: number | null;
  lastSession: { title: string; when: string } | null;
  /** Newest logged session id — attached to shares as workoutSessionId. */
  latestSessionId: string | null;
  /** Prefill for the composer — the smart-hashtag system types/tags it. */
  shareLine: string | null;
}

export function buildHomeTrainingProof(
  sessions: unknown[] | null | undefined,
  nowMs: number,
): HomeTrainingProof {
  const weeklyCounts = [0, 0, 0, 0];
  let minutesThisWeek = 0;
  let last: { timeMs: number; title: string; id: string | null } | null = null;

  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  for (const session of sessions || []) {
    if (!isLoggedWorkoutSession(session)) continue;
    const record = session;
    const rawDate = record.date ?? record.completedAt ?? record.createdAt;
    const timeMs = new Date(String(rawDate || '')).getTime();
    if (!Number.isFinite(timeMs) || timeMs > nowMs) continue;

    const weeksAgo = Math.floor(calendarDaysAgo(timeMs, startOfTodayMs) / 7);
    if (weeksAgo < 4) {
      weeklyCounts[3 - weeksAgo] += 1;
      if (weeksAgo === 0) {
        const duration = Number(record.duration);
        if (Number.isFinite(duration) && duration > 0) minutesThisWeek += Math.floor(duration);
      }
    }
    if (!last || timeMs > last.timeMs) {
      const title = typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : 'Workout';
      const rawId = record.id ?? record._id;
      const id = (typeof rawId === 'string' && rawId) || (typeof rawId === 'number' ? String(rawId) : null);
      last = { timeMs, title, id };
    }
  }

  const thisWeekCount = weeklyCounts[3];
  const lastWeekCount = weeklyCounts[2];
  const weekDelta = thisWeekCount === 0 && lastWeekCount === 0
    ? null
    : thisWeekCount - lastWeekCount;

  // The weekly recap line — outcome-framed, with the week-over-week win when
  // there is one (never shames a down week).
  let shareLine: string | null = null;
  if (thisWeekCount > 0) {
    const minutesPart = minutesThisWeek > 0 ? ` — ${minutesThisWeek} focused minutes` : '';
    const deltaPart = weekDelta !== null && weekDelta > 0 && lastWeekCount > 0
      ? `, up ${weekDelta} from last week`
      : weekDelta === 0 && lastWeekCount > 0
        ? ', matching last week'
        : '';
    shareLine = `Logged ${thisWeekCount} workout${thisWeekCount === 1 ? '' : 's'} this week${minutesPart}${deltaPart}. Progress you can see.`;
  }

  return {
    thisWeekCount,
    minutesThisWeek,
    weeklyCounts,
    weekDelta,
    lastSession: last ? { title: last.title, when: formatAgo(new Date(last.timeMs).toISOString(), nowMs) } : null,
    latestSessionId: last?.id ?? null,
    shareLine,
  };
}

/** One tile of the Home left-rail trailing-7-day creator-streak grid. */
export interface WeekTrainingDay {
  /** Weekday initial for this tile's actual date. */
  label: string;
  /** Full weekday name, for the screen-reader label. */
  dayName: string;
  /** True only when a real session was logged on that calendar day. */
  trained: boolean;
  /** The last tile — today. */
  isToday: boolean;
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TRAILING_DAYS = 7;

/**
 * The trailing seven days ending today, each marked from real logged sessions.
 *
 * Two things this must NOT do, both of which were live defects:
 *  - derive tiles from the streak COUNT (`index < streakDays`), which named
 *    days the member trained without reading a single session date;
 *  - use a calendar Mon..Sun window while `buildHomeTrainingProof` counts a
 *    ROLLING 7 days (`weeksAgo === 0` above). Two definitions of "this week"
 *    rendered side by side disagree — on a Thursday, a session logged last
 *    Saturday counts as "This Week: 1" while every calendar tile is dark.
 *    This window is deliberately the same rolling one, so they always agree.
 */
export function buildWeekTrainingDays(
  sessions: unknown[] | null | undefined,
  nowMs: number,
): WeekTrainingDay[] {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);

  // Eight boundaries: the start of each of the 7 days, plus tomorrow's start.
  // Derived with setDate so a DST transition (a 23- or 25-hour day) cannot
  // shift a session into the neighbouring tile the way a fixed +24h would.
  const dayBounds = Array.from({ length: TRAILING_DAYS + 1 }, (_, index) => {
    const boundary = new Date(startOfToday);
    boundary.setDate(boundary.getDate() - (TRAILING_DAYS - 1) + index);
    return boundary.getTime();
  });

  const trained = Array.from({ length: TRAILING_DAYS }, () => false);

  for (const session of sessions || []) {
    // Same completeness filter as buildHomeTrainingProof. Without it the two
    // builders drift apart again: a PLANNED session would light a tile while
    // the "This Week" count beside it ignored the row — the exact
    // two-definitions-of-one-week defect the agreement tests below exist to
    // catch, and which they caught when this filter arrived upstream.
    if (!isLoggedWorkoutSession(session)) continue;
    const record = session;
    const rawDate = record.date ?? record.completedAt ?? record.createdAt;
    const timeMs = new Date(String(rawDate || '')).getTime();
    // Future-dated rows are never proof of a completed session.
    if (!Number.isFinite(timeMs) || timeMs > nowMs) continue;

    for (let index = 0; index < TRAILING_DAYS; index += 1) {
      if (timeMs >= dayBounds[index] && timeMs < dayBounds[index + 1]) {
        trained[index] = true;
        break;
      }
    }
  }

  return trained.map((didTrain, index) => {
    const weekday = new Date(dayBounds[index]).getDay();
    return {
      label: DAY_INITIALS[weekday],
      dayName: DAY_NAMES[weekday],
      trained: didTrain,
      isToday: index === TRAILING_DAYS - 1,
    };
  });
}

/**
 * Streak rescue (workstream O3): true when the user has a live streak, has
 * NOT logged a session today, and the local evening window has started —
 * Home's Next Best Action escalates so the streak survives.
 */
export function assessStreakRisk(
  sessions: unknown[] | null | undefined,
  streakDays: number | null | undefined,
  nowMs: number,
): boolean {
  if (!streakDays || streakDays <= 0) return false;

  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const trainedToday = (sessions || []).some((session) => {
    if (!isLoggedWorkoutSession(session)) return false;
    const record = session;
    const rawDate = record.date ?? record.completedAt ?? record.createdAt;
    const timeMs = new Date(String(rawDate || '')).getTime();
    return Number.isFinite(timeMs) && timeMs >= startOfToday.getTime() && timeMs <= nowMs;
  });
  if (trainedToday) return false;

  return new Date(nowMs).getHours() >= STREAK_RISK_HOUR;
}
