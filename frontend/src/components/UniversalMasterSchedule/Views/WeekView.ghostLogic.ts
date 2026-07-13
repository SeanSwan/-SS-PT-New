/**
 * Ghost layer selection rules — the schedule's short-term memory.
 *
 * For any slot that is empty this week, we echo the most recent client who
 * occupied that same weekday/time within the last month (4 weeks). This
 * surfaces weekly regulars, every-other-week clients, and anyone who missed
 * a week — so a trainer never books over someone's standing slot or forgets
 * a client who has drifted. Ghosts reserve nothing; they are memory only.
 */
import { getDayKey, getWeekSessionDisplay } from './WeekView.logic';

/** One month of lookback. Nearest week wins when the same slot repeats. */
export const GHOST_LOOKBACK_WEEKS = 4;

/** Statuses that represent a real client booking worth echoing forward. */
const GHOST_ELIGIBLE_STATUSES = new Set(['scheduled', 'confirmed', 'completed']);

export interface GhostEntry {
  session: any;
  weeksAgo: number;
}

export function getGhostClientName(session: any): string {
  return (
    session.clientName ||
    (session.client
      ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim()
      : '')
  );
}

export function formatGhostAge(weeksAgo: number): string {
  return weeksAgo === 1 ? 'Last wk' : `${weeksAgo} wks ago`;
}

function toRange(session: any): { top: number; bottom: number } | null {
  const display = getWeekSessionDisplay(session);
  if (!display) return null;
  return { top: display.top, bottom: display.top + display.height };
}

function isGhostEligible(session: any): boolean {
  if (!GHOST_ELIGIBLE_STATUSES.has(session.status)) return false;
  return Boolean(getGhostClientName(session) || session.userId);
}

function overlaps(range: { top: number; bottom: number }, taken: { top: number; bottom: number }[]) {
  return taken.some((other) => range.top < other.bottom && range.bottom > other.top);
}

/**
 * Ghosts for one day: candidates are the same weekday in each of the previous
 * GHOST_LOOKBACK_WEEKS weeks, considered nearest-week-first. A slot already
 * filled this week — or already claimed by a nearer ghost — is skipped, so
 * each time range echoes at most once and always shows its most recent
 * occupant. Single pass over `sessions` (the week view fetches an unbounded
 * range, so this list can be large — don't re-scan it per lookback week).
 */
export function getGhostsForDay(sessions: any[], day: Date, daySessions: any[]): GhostEntry[] {
  const weeksAgoByDayKey = new Map<string, number>();
  for (let weeksAgo = 1; weeksAgo <= GHOST_LOOKBACK_WEEKS; weeksAgo += 1) {
    const priorDay = new Date(day);
    priorDay.setDate(priorDay.getDate() - 7 * weeksAgo);
    weeksAgoByDayKey.set(getDayKey(priorDay), weeksAgo);
  }

  const candidates: GhostEntry[] = [];
  sessions.forEach((session) => {
    if (!isGhostEligible(session)) return;
    const weeksAgo = weeksAgoByDayKey.get(getDayKey(new Date(session.sessionDate)));
    if (weeksAgo === undefined) return;
    candidates.push({ session, weeksAgo });
  });
  candidates.sort((a, b) => a.weeksAgo - b.weeksAgo);

  const taken = daySessions.map(toRange).filter(Boolean) as { top: number; bottom: number }[];
  const ghosts: GhostEntry[] = [];

  candidates.forEach((candidate) => {
    const range = toRange(candidate.session);
    if (!range || overlaps(range, taken)) return;
    taken.push(range);
    ghosts.push(candidate);
  });

  return ghosts;
}

export function buildGhostsByDay(
  sessions: any[],
  weekDays: Date[],
  sessionsByDay: Map<string, any[]>
): Map<string, GhostEntry[]> {
  const map = new Map<string, GhostEntry[]>();
  weekDays.forEach((day) => {
    const key = getDayKey(day);
    map.set(key, getGhostsForDay(sessions, day, sessionsByDay.get(key) || []));
  });
  return map;
}
