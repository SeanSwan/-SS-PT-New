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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
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

  for (const session of sessions || []) {
    if (!isLoggedWorkoutSession(session)) continue;
    const record = session;
    const rawDate = record.date ?? record.completedAt ?? record.createdAt;
    const timeMs = new Date(String(rawDate || '')).getTime();
    if (!Number.isFinite(timeMs) || timeMs > nowMs) continue;

    const weeksAgo = Math.floor((nowMs - timeMs) / WEEK_MS);
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
