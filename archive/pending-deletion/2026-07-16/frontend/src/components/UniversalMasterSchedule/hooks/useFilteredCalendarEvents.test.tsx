import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFilteredCalendarEvents } from './useFilteredCalendarEvents';
import type { FilterOptions, Session } from '../types';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  sessionDate: '2026-06-07T16:00:00.000Z',
  start: '2026-06-07T16:00:00.000Z',
  end: '2026-06-07T17:00:00.000Z',
  duration: 60,
  userId: '155',
  trainerId: '9',
  status: 'confirmed',
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z',
  client: {
    id: '155',
    firstName: 'Serialized',
    lastName: 'Client',
    email: 'serialized.client@example.test',
    availableSessions: 4,
    role: 'client',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  trainer: {
    id: '9',
    firstName: 'Assigned',
    lastName: 'Trainer',
    email: 'assigned.trainer@example.test',
    role: 'trainer',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  ...overrides,
});

const baseFilters: FilterOptions = {
  status: 'all',
  dateRange: 'all',
};

describe('useFilteredCalendarEvents', () => {
  it('matches numeric trainer and client filters against serialized session IDs', () => {
    const { result } = renderHook(() =>
      useFilteredCalendarEvents({
        sessions: [makeSession()],
        filterOptions: {
          ...baseFilters,
          trainerId: 9,
          clientId: 155,
        },
      })
    );

    expect(result.current.calendarEvents).toHaveLength(1);
    expect(result.current.calendarEvents[0]).toMatchObject({
      id: 'session-1',
      trainerId: '9',
      userId: '155',
    });
  });
});
