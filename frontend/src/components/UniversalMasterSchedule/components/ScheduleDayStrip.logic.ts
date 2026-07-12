/**
 * ============================================================================
 * SCHEDULE DAY STRIP — PURE LOGIC (no React, fully unit-testable)
 * ============================================================================
 * Builds the rolling day window for the MindBody-class date ribbon and the
 * per-day session-count badges. All comparisons are LOCAL dates (the strip
 * answers "what does my Tuesday look like", never UTC bucketing).
 * ============================================================================
 */

export interface DayChip {
  /** Local date key yyyy-mm-dd — stable id + badge lookup key */
  key: string;
  date: Date;
  /** Short weekday label, e.g. "Mon" */
  dow: string;
  /** Day of month, e.g. 14 */
  dayNumber: number;
  /** Short month label, shown on month boundaries + first chip */
  month: string;
  isToday: boolean;
  isMonthBoundary: boolean;
}

/** How far the ribbon reaches: one week back, three weeks forward. */
export const DAY_STRIP_LOOKBACK = 7;
export const DAY_STRIP_LOOKAHEAD = 21;

export const localDayKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const atMidnight = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/**
 * Rolling window anchored on TODAY (not the selected date) so the ribbon
 * is stable while the user browses days — selection moves, rails don't.
 */
export const buildDayWindow = (today: Date = new Date()): DayChip[] => {
  const anchor = atMidnight(today);
  const todayKey = localDayKey(anchor);
  const chips: DayChip[] = [];

  for (let offset = -DAY_STRIP_LOOKBACK; offset <= DAY_STRIP_LOOKAHEAD; offset += 1) {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + offset);
    const isFirst = offset === -DAY_STRIP_LOOKBACK;
    chips.push({
      key: localDayKey(date),
      date,
      dow: DOW[date.getDay()],
      dayNumber: date.getDate(),
      month: MONTHS[date.getMonth()],
      isToday: localDayKey(date) === todayKey,
      isMonthBoundary: isFirst || date.getDate() === 1,
    });
  }

  return chips;
};

/** Minimal shape the badge counter needs — mirrors the schedule's own
 *  date resolution (sessionDate || start || startTime). */
export interface DateBearingSession {
  sessionDate?: string | Date | null;
  start?: string | Date | null;
  startTime?: string | Date | null;
}

export const sessionDayKey = (session: DateBearingSession): string | null => {
  const raw = session.sessionDate || session.start || session.startTime;
  if (!raw) return null;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : localDayKey(parsed);
};

/** Per-local-day session counts for badge dots. */
export const countSessionsByDay = (
  sessions: readonly DateBearingSession[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const key = sessionDayKey(session);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

/** Badge label with a sane ceiling — "9+" keeps chips fixed-width. */
export const badgeLabel = (count: number): string =>
  count > 9 ? '9+' : String(count);
