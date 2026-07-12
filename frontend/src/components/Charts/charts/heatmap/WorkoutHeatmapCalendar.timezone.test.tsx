/**
 * WorkoutHeatmapCalendar.timezone.test.tsx
 * ========================================
 * Regression for the heatmap timezone bug (hostile review, 2026-07-11).
 *
 * workout_sessions.date is a TIMESTAMP and the DB session runs in UTC, so the server's
 * `x` label ('MM/DD') is the UTC calendar day. The grid walk builds its labels in the
 * BROWSER'S LOCAL time. Keying the counts on `x` therefore mis-filed every evening
 * workout:
 *
 *   A client in UTC-7 trains SUNDAY 22:00 local  ==  MONDAY 05:00 UTC
 *     -> server emits Monday's 'MM/DD'
 *     -> the local-Monday cell matched it  => rendered on MONDAY (wrong DAY)
 *     -> and because columns are Monday-aligned (Sunday is the LAST cell of the
 *        PREVIOUS column), it also jumped a WEEK column.
 *
 * The fix buckets on the raw timestamp converted to the user's LOCAL day. These tests
 * pin the Sunday-evening case, which is exactly where the old code broke.
 * (Sean's ruling 2026-07-12: user-local wins over the interim UTC-bucketing
 * approach — a calendar of "did I train that day" shows the user's own day.)
 */
import { describe, expect, it } from 'vitest';
import { buildHeatmapGridFromSessions } from './WorkoutHeatmapCalendar';

// Row index in the grid: Monday=0 ... Sunday=6.
const SUNDAY_ROW = 6;
const MONDAY_ROW = 0;

describe('WorkoutHeatmapCalendar — local-day bucketing (timezone regression)', () => {
  it('files a Sunday-evening workout on SUNDAY, even when its UTC label says Monday', () => {
    // Anchor "today" to a fixed local Wednesday so the grid geometry is deterministic.
    const today = new Date(2026, 6, 15, 12, 0, 0); // Wed 2026-07-15 12:00 LOCAL

    // The session happened Sunday 2026-07-12 at 22:00 LOCAL.
    const sundayLocal = new Date(2026, 6, 12, 22, 0, 0);
    // Its UTC calendar day may well be Monday the 13th (true for any UTC-negative offset).
    // Reproduce the server's behavior exactly: x = the UTC 'MM/DD', ts = the real instant.
    const utcLabel = `${String(sundayLocal.getUTCMonth() + 1).padStart(2, '0')}/${String(
      sundayLocal.getUTCDate(),
    ).padStart(2, '0')}`;

    const grid = buildHeatmapGridFromSessions(
      [{ x: utcLabel, ts: sundayLocal.toISOString() }],
      today,
    );

    expect(grid).not.toBeNull();
    const rowTotal = (row: number) => grid![row].reduce((a, b) => a + b, 0);

    // The workout must land on SUNDAY — the day the client actually trained.
    expect(rowTotal(SUNDAY_ROW)).toBe(1);
    // ...and must NOT bleed onto Monday, which is what the UTC label used to cause.
    expect(rowTotal(MONDAY_ROW)).toBe(0);
  });

  it('still counts a midday workout correctly (no regression for the easy case)', () => {
    const today = new Date(2026, 6, 15, 12, 0, 0);       // Wed 2026-07-15 LOCAL
    const tuesdayNoon = new Date(2026, 6, 14, 12, 0, 0); // Tue 2026-07-14 12:00 LOCAL

    const grid = buildHeatmapGridFromSessions(
      [{ x: '07/14', ts: tuesdayNoon.toISOString() }],
      today,
    );
    const TUESDAY_ROW = 1;
    expect(grid![TUESDAY_ROW].reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('falls back to the x label when ts is absent (older/cached responses)', () => {
    const today = new Date(2026, 6, 15, 12, 0, 0);
    const grid = buildHeatmapGridFromSessions([{ x: '07/14' }], today);
    const TUESDAY_ROW = 1;
    expect(grid![TUESDAY_ROW].reduce((a, b) => a + b, 0)).toBe(1);
  });
});
