import { describe, expect, it } from 'vitest';
import { getMonthViewSessionOrbKey } from './MonthView.logic';

describe('MonthView session orb identity', () => {
  it('uses persisted ids for schedule month status orbs', () => {
    expect(getMonthViewSessionOrbKey('2026-06-01', { id: 42, status: 'scheduled' })).toBe('month-session-orb|id|42');
  });

  it('keeps idless status orbs keyed by session identity instead of display order', () => {
    const session = {
      sessionDate: '2026-06-01T15:00:00.000Z',
      endDate: '2026-06-01T16:00:00.000Z',
      status: 'confirmed',
      duration: 60,
      trainerId: 11,
      userId: 22,
      location: 'Main Studio',
    };

    expect(getMonthViewSessionOrbKey('2026-06-01', session)).toBe(getMonthViewSessionOrbKey('2026-06-01', { ...session }));
    expect(getMonthViewSessionOrbKey('2026-06-01', session)).not.toBe(
      getMonthViewSessionOrbKey('2026-06-02', { ...session, sessionDate: '2026-06-02T15:00:00.000Z' })
    );
  });
});
