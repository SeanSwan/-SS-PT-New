/**
 * ============================================================================
 * HOOK: useDayBoundary
 * PURPOSE: Return a value that changes when the LOCAL calendar day rolls over,
 *          so day-derived views recompute instead of going stale.
 * ----------------------------------------------------------------------------
 * Why this exists: Home derives its trailing-7-day grid, the "today" marker and
 * the streak-risk signal from `Date.now()` captured inside a `useMemo` keyed on
 * the session data. The dashboard does not poll and does not refetch on focus,
 * so a tab left open across midnight kept yesterday's window: the "(today)"
 * ring and screen-reader label sat on the previous day, and a workout logged
 * after midnight lit no tile. Rendering `isToday` turned that latent staleness
 * into an on-screen claim, so it has to be corrected at the source.
 *
 * Schedules a single timeout to the next local midnight (plus a one-second
 * cushion) rather than polling, and re-arms after each rollover. DST-safe: the
 * next boundary is recomputed from the clock each time, never by adding 24h.
 * ============================================================================
 */
import { useEffect, useState } from 'react';

const startOfLocalDay = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const nextLocalMidnight = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.getTime();
};

/**
 * @returns the epoch ms of the start of the current local day. Stable within a
 *          day, so it is safe as a `useMemo` dependency.
 */
export function useDayBoundary(): number {
  const [dayStart, setDayStart] = useState(() => startOfLocalDay(Date.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const arm = () => {
      const now = Date.now();
      // +1s cushion so the timer never fires a hair before the boundary and
      // re-reads the same day.
      const delay = Math.max(1000, nextLocalMidnight(now) - now + 1000);
      timer = setTimeout(() => {
        setDayStart(startOfLocalDay(Date.now()));
        arm();
      }, delay);
    };

    arm();
    return () => clearTimeout(timer);
  }, []);

  return dayStart;
}

export default useDayBoundary;
