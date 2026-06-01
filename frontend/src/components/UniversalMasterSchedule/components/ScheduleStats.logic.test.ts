import { describe, expect, it } from 'vitest';
import { getScheduleSessionRowKey } from './ScheduleStats.logic';

describe('ScheduleStats session row identity', () => {
  it('keeps unsaved schedule drilldown rows keyed by session identity instead of row order', () => {
    const session = {
      status: 'scheduled',
      sessionDate: '2026-06-01T15:00:00.000Z',
      endDate: '2026-06-01T16:00:00.000Z',
      duration: 60,
      trainerId: 24,
      userId: 51,
      location: 'Main Studio',
      clientName: 'Client Alpha',
    };

    const reorderedSession = { ...session };
    const nextSlot = {
      ...session,
      sessionDate: '2026-06-02T15:00:00.000Z',
    };

    expect(getScheduleSessionRowKey(session)).toBe(getScheduleSessionRowKey(reorderedSession));
    expect(getScheduleSessionRowKey(session)).not.toBe(getScheduleSessionRowKey(nextSlot));
  });

  it('prefers persisted session ids when the backend provides them', () => {
    expect(getScheduleSessionRowKey({ id: 72, sessionDate: '2026-06-01T15:00:00.000Z' })).toBe('schedule-session|id|72');
  });
});
