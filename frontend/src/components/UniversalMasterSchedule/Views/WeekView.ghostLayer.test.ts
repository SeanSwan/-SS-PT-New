/**
 * Ghost layer (recent-history echo) — regression tests.
 *
 * The Universal Master Schedule week view shows a faded "ghost" of the most
 * recent client who held each slot within the last month, so trainers spot a
 * forgotten weekly/biweekly client before the slot gets double-booked away.
 * These tests lock the selection rules:
 *  - looks back up to GHOST_LOOKBACK_WEEKS (4) same-weekday weeks, nearest wins
 *  - only real bookings (scheduled/confirmed/completed) qualify
 *  - ghosts are suppressed when this week's slot is already occupied
 *  - each time range echoes at most once, tagged with how long ago it was
 *  - anonymous non-client rows never ghost
 */
import { describe, expect, it } from 'vitest';
import {
  GHOST_LOOKBACK_WEEKS,
  formatGhostAge,
  getGhostClientName,
  getGhostsForDay,
} from './WeekView.ghostLogic';
import { GHOST_FADE_FLOOR, ghostFade } from './WeekView.sessionStyles';

const day = new Date(2026, 6, 15); // Wed Jul 15 2026 (local)

function session(overrides: Record<string, any> = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    sessionDate: new Date(2026, 6, 8, 9, 0).toISOString(), // Wed Jul 8, 9:00am — 1 week back
    duration: 60,
    status: 'confirmed',
    clientName: 'Ron',
    ...overrides,
  };
}

describe('getGhostsForDay', () => {
  it('echoes last week\'s booking when this week\'s slot is empty', () => {
    const ghosts = getGhostsForDay([session()], day, []);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].weeksAgo).toBe(1);
    expect(getGhostClientName(ghosts[0].session)).toBe('Ron');
  });

  it('reaches a full month back — 2, 3, and 4 weeks all ghost', () => {
    const sessions = [2, 3, 4].map((weeksAgo) =>
      session({
        sessionDate: new Date(2026, 6, 15 - 7 * weeksAgo, 9 + weeksAgo, 0).toISOString(),
      })
    );
    const ghosts = getGhostsForDay(sessions, day, []);
    expect(ghosts.map((ghost) => ghost.weeksAgo).sort()).toEqual([2, 3, 4]);
  });

  it('ignores anything older than the lookback window (5 weeks back)', () => {
    const tooOld = session({ sessionDate: new Date(2026, 5, 10, 9, 0).toISOString() });
    expect(GHOST_LOOKBACK_WEEKS).toBe(4);
    expect(getGhostsForDay([tooOld], day, [])).toHaveLength(0);
  });

  it('only matches same-weekday weeks — not 6, 8, or 9 days back', () => {
    const sessions = [9, 7 + 1, 6].map((daysBack) =>
      session({ sessionDate: new Date(2026, 6, 15 - daysBack, 9, 0).toISOString() })
    );
    expect(getGhostsForDay(sessions, day, [])).toHaveLength(0);
  });

  it('keeps only the most recent occupant when the same slot repeats weekly', () => {
    const sessions = [1, 2, 3].map((weeksAgo) =>
      session({
        clientName: `Client-${weeksAgo}`,
        sessionDate: new Date(2026, 6, 15 - 7 * weeksAgo, 9, 0).toISOString(),
      })
    );
    const ghosts = getGhostsForDay(sessions, day, []);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].weeksAgo).toBe(1);
    expect(getGhostClientName(ghosts[0].session)).toBe('Client-1');
  });

  it('excludes non-booking statuses (available, blocked, cancelled, requested)', () => {
    const sessions = ['available', 'blocked', 'cancelled', 'requested'].map((status) =>
      session({ status })
    );
    expect(getGhostsForDay(sessions, day, [])).toHaveLength(0);
  });

  it('includes scheduled and completed bookings', () => {
    const sessions = [
      session({ status: 'scheduled', sessionDate: new Date(2026, 6, 8, 9, 0).toISOString() }),
      session({ status: 'completed', sessionDate: new Date(2026, 6, 1, 11, 0).toISOString() }),
    ];
    expect(getGhostsForDay(sessions, day, [])).toHaveLength(2);
  });

  it('suppresses the ghost when this week\'s same time range is occupied', () => {
    const lastWeek = session(); // 9:00-10:00
    const thisWeek = session({
      sessionDate: new Date(2026, 6, 15, 9, 30).toISOString(), // overlaps 9:00-10:00
    });
    expect(getGhostsForDay([lastWeek, thisWeek], day, [thisWeek])).toHaveLength(0);
  });

  it('keeps the ghost when this week\'s sessions are at other times', () => {
    const lastWeek = session();
    const thisWeek = session({ sessionDate: new Date(2026, 6, 15, 14, 0).toISOString() });
    expect(getGhostsForDay([lastWeek, thisWeek], day, [thisWeek])).toHaveLength(1);
  });

  it('drops rows with no client identity at all', () => {
    const anonymous = session({ clientName: '', client: undefined, userId: undefined });
    expect(getGhostsForDay([anonymous], day, [])).toHaveLength(0);
  });

  it('accepts userId-only rows and derives names from client objects', () => {
    const byId = session({ clientName: '', userId: 42 });
    const byObject = session({
      clientName: '',
      client: { firstName: 'Jesse', lastName: 'Q' },
      sessionDate: new Date(2026, 6, 8, 12, 0).toISOString(),
    });
    const ghosts = getGhostsForDay([byId, byObject], day, []);
    expect(ghosts).toHaveLength(2);
    expect(getGhostClientName(byObject)).toBe('Jesse Q');
  });
});

describe('formatGhostAge', () => {
  it('reads naturally at every supported age', () => {
    expect(formatGhostAge(1)).toBe('Last wk');
    expect(formatGhostAge(2)).toBe('2 wks ago');
    expect(formatGhostAge(4)).toBe('4 wks ago');
  });
});

describe('ghostFade', () => {
  it('dims with age but never below the WCAG-safe floor', () => {
    expect(ghostFade(1)).toBe(1);
    expect(ghostFade(2)).toBeLessThan(1);
    for (let weeksAgo = 1; weeksAgo <= GHOST_LOOKBACK_WEEKS; weeksAgo += 1) {
      expect(ghostFade(weeksAgo)).toBeGreaterThanOrEqual(GHOST_FADE_FLOOR);
    }
    expect(GHOST_FADE_FLOOR).toBeGreaterThanOrEqual(0.72);
  });
});
