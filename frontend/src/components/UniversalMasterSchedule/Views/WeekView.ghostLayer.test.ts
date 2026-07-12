/**
 * Ghost layer (last-week echo) — regression tests.
 *
 * The Universal Master Schedule week view shows a faded "ghost" of last
 * week's booking in any slot that is empty this week, so trainers can spot
 * a forgotten weekly client before the slot gets double-booked away.
 * These tests lock the selection rules:
 *  - only sessions dated exactly 7 days before the target day appear
 *  - only real bookings (scheduled/confirmed/completed) qualify
 *  - ghosts are suppressed when this week's slot is already occupied
 *  - anonymous non-client rows never ghost
 */
import { describe, expect, it } from 'vitest';
import { getGhostClientName, getGhostSessionsForDay } from './WeekView.logic';

const day = new Date(2026, 6, 15); // Wed Jul 15 2026 (local)

function session(overrides: Record<string, any> = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    sessionDate: new Date(2026, 6, 8, 9, 0).toISOString(), // Wed Jul 8, 9:00am
    duration: 60,
    status: 'confirmed',
    clientName: 'Ron',
    ...overrides,
  };
}

describe('getGhostSessionsForDay', () => {
  it('returns last week\'s booking when this week\'s slot is empty', () => {
    const ghosts = getGhostSessionsForDay([session()], day, []);
    expect(ghosts).toHaveLength(1);
    expect(getGhostClientName(ghosts[0])).toBe('Ron');
  });

  it('only matches sessions exactly 7 days prior — not 6, 8, or 14', () => {
    const sessions = [
      session({ sessionDate: new Date(2026, 6, 9, 9, 0).toISOString() }),
      session({ sessionDate: new Date(2026, 6, 7, 9, 0).toISOString() }),
      session({ sessionDate: new Date(2026, 6, 1, 9, 0).toISOString() }),
    ];
    expect(getGhostSessionsForDay(sessions, day, [])).toHaveLength(0);
  });

  it('excludes non-booking statuses (available, blocked, cancelled)', () => {
    const sessions = ['available', 'blocked', 'cancelled', 'requested'].map((status) =>
      session({ status })
    );
    expect(getGhostSessionsForDay(sessions, day, [])).toHaveLength(0);
  });

  it('includes scheduled and completed bookings', () => {
    const sessions = [
      session({ status: 'scheduled', sessionDate: new Date(2026, 6, 8, 9, 0).toISOString() }),
      session({ status: 'completed', sessionDate: new Date(2026, 6, 8, 11, 0).toISOString() }),
    ];
    expect(getGhostSessionsForDay(sessions, day, [])).toHaveLength(2);
  });

  it('suppresses the ghost when this week\'s same time range is occupied', () => {
    const lastWeek = session(); // 9:00-10:00 last Wed
    const thisWeek = session({
      sessionDate: new Date(2026, 6, 15, 9, 30).toISOString(), // overlaps 9:00-10:00
      duration: 60,
    });
    expect(getGhostSessionsForDay([lastWeek, thisWeek], day, [thisWeek])).toHaveLength(0);
  });

  it('keeps the ghost when this week\'s sessions are at other times', () => {
    const lastWeek = session();
    const thisWeek = session({
      sessionDate: new Date(2026, 6, 15, 14, 0).toISOString(),
    });
    expect(getGhostSessionsForDay([lastWeek, thisWeek], day, [thisWeek])).toHaveLength(1);
  });

  it('drops rows with no client identity at all', () => {
    const anonymous = session({ clientName: '', client: undefined, userId: undefined });
    expect(getGhostSessionsForDay([anonymous], day, [])).toHaveLength(0);
  });

  it('accepts userId-only rows and derives names from client objects', () => {
    const byId = session({ clientName: '', userId: 42 });
    const byObject = session({
      clientName: '',
      client: { firstName: 'Jesse', lastName: 'Q' },
      sessionDate: new Date(2026, 6, 8, 12, 0).toISOString(),
    });
    const ghosts = getGhostSessionsForDay([byId, byObject], day, []);
    expect(ghosts).toHaveLength(2);
    expect(getGhostClientName(byObject)).toBe('Jesse Q');
  });
});
