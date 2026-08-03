/**
 * ============================================================================
 * HOOK: useDayBoundary
 * PURPOSE: Return a value that changes when the LOCAL calendar day rolls over,
 *          so day-derived views recompute instead of going stale.
 * ----------------------------------------------------------------------------
 * Why this exists: Home derives its trailing-7-day grid and the "today" marker
 * from `Date.now()` captured inside a `useMemo` keyed on the session data. The
 * dashboard does not poll and does not refetch on focus, so a tab left open
 * across midnight kept yesterday's window and the "(today)" ring sat on the
 * previous day. Rendering `isToday` turned that latent staleness into an
 * on-screen claim, so it has to be corrected at the source.
 *
 * SCOPE — read this before relying on it. This hook re-keys the DAY, not the
 * DATA. On its own it slides the window and moves the today-marker; it does
 * NOT make a workout logged after midnight appear, because nothing here
 * refetches. HomeTab pairs it with an explicit refetch on rollover to get
 * that, and any other consumer must do the same or make no such promise.
 *
 * Known limits, deliberately not solved here: a timer delayed by tab
 * throttling, page freezing or OS suspend fires late, so the value can lag
 * until it does (it self-corrects on fire, because the new day is read from
 * the clock rather than incremented). It also does not re-arm on an OS
 * timezone change. Neither affects correctness of what is displayed once the
 * timer fires; both would need a visibilitychange resync to close.
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
 *          day, so it is safe as a `useMemo` dependency — and, unlike a bare
 *          `Date.now()` inside the memo, it is a REAL dependency, so
 *          `react-hooks/exhaustive-deps` does not tell the next developer to
 *          delete it. Pass it to `dayClock()` to get a timestamp to compute
 *          with.
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

/**
 * The current instant, for a computation that is re-keyed on `dayStart`.
 *
 * Takes `dayStart` purely so the call site has a genuine reactive dependency
 * to list: `useMemo(() => build(data, dayClock(dayStart)), [data, dayStart])`
 * is both lint-clean and honest, where an inline `Date.now()` was neither.
 * Returns the real clock, because callers still need the hour of day and must
 * reject future-dated rows.
 */
export function dayClock(_dayStart: number): number {
  return Date.now();
}

export default useDayBoundary;
