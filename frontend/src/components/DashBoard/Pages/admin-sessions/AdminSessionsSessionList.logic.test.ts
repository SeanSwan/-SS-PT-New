import { describe, expect, it } from 'vitest';
import type { Session } from './ViewSessionModal.types';
import {
  buildAdminSessionsCsv,
  calculateAdminSessionStats,
  filterAdminSessions,
  formatSessionDate,
  formatSessionTime,
  paginateAdminSessions,
  sortAdminSessions,
} from './AdminSessionsSessionList.logic';

const baseSession = (overrides: Partial<Session>): Session => ({
  id: overrides.id ?? 'session-1',
  sessionDate: overrides.sessionDate ?? '2026-05-20T17:00:00.000Z',
  duration: overrides.duration ?? 60,
  userId: overrides.userId ?? 'client-1',
  trainerId: overrides.trainerId ?? 'trainer-1',
  location: overrides.location ?? 'Main Studio',
  notes: overrides.notes,
  status: overrides.status ?? 'scheduled',
  client: overrides.client ?? {
    id: overrides.userId ?? 'client-1',
    firstName: 'Alex',
    lastName: 'Client',
    email: 'alex@example.test',
    availableSessions: 4,
  },
  trainer: overrides.trainer ?? {
    id: overrides.trainerId ?? 'trainer-1',
    firstName: 'Tara',
    lastName: 'Trainer',
    email: 'tara@example.test',
  },
});

describe('AdminSessionsSessionList logic', () => {
  it('filters sessions by real client presence, search, status, and date range', () => {
    const visibleCompleted = baseSession({
      id: 'visible-completed',
      sessionDate: '2026-05-22T15:00:00.000Z',
      status: 'completed',
      location: 'Crystalline Studio',
    });
    const availableSlot = baseSession({
      id: 'available-slot',
      sessionDate: '2026-05-23T15:00:00.000Z',
      status: 'available',
      userId: null,
      client: null,
    });
    const orphanScheduled = baseSession({
      id: 'orphan-scheduled',
      sessionDate: '2026-05-22T15:00:00.000Z',
      status: 'scheduled',
      userId: null,
      client: null,
    });

    const filtered = filterAdminSessions(
      [visibleCompleted, availableSlot, orphanScheduled],
      {
        searchTerm: 'crystalline',
        statusFilter: 'completed',
        startDate: '2026-05-21',
        endDate: '2026-05-22',
      },
    );

    expect(filtered.map((session) => session.id)).toEqual(['visible-completed']);
    expect(filterAdminSessions([availableSlot], {
      searchTerm: '',
      statusFilter: 'available',
      startDate: '',
      endDate: '',
    })).toHaveLength(1);
  });

  it('sorts by client, trainer, date, duration, location, and status without mutating input', () => {
    const alpha = baseSession({
      id: 'alpha',
      sessionDate: '2026-05-20T15:00:00.000Z',
      duration: 30,
      location: 'A Studio',
      status: 'confirmed',
      client: {
        id: 'client-a',
        firstName: 'Alpha',
        lastName: 'Client',
        email: 'alpha@example.test',
        availableSessions: 2,
      },
    });
    const beta = baseSession({
      id: 'beta',
      sessionDate: '2026-05-21T15:00:00.000Z',
      duration: 90,
      location: 'B Studio',
      status: 'scheduled',
      client: {
        id: 'client-b',
        firstName: 'Beta',
        lastName: 'Client',
        email: 'beta@example.test',
        availableSessions: 2,
      },
    });
    const source = [beta, alpha];

    expect(sortAdminSessions(source, { key: 'client', direction: 'ascending' }).map((s) => s.id)).toEqual(['alpha', 'beta']);
    expect(sortAdminSessions(source, { key: 'duration', direction: 'descending' }).map((s) => s.id)).toEqual(['beta', 'alpha']);
    expect(sortAdminSessions(source, { key: 'sessionDate', direction: 'ascending' }).map((s) => s.id)).toEqual(['alpha', 'beta']);
    expect(sortAdminSessions(source, { key: 'location', direction: 'descending' }).map((s) => s.id)).toEqual(['beta', 'alpha']);
    expect(sortAdminSessions(source, { key: 'status', direction: 'ascending' }).map((s) => s.id)).toEqual(['alpha', 'beta']);
    expect(source.map((s) => s.id)).toEqual(['beta', 'alpha']);
  });

  it('calculates proof-of-value admin session stats from real sessions', () => {
    const stats = calculateAdminSessionStats(
      [
        baseSession({ id: 'today-one', sessionDate: '2026-05-20T15:00:00.000Z', status: 'completed', duration: 75, trainerId: 'trainer-1' }),
        baseSession({ id: 'today-two', sessionDate: '2026-05-20T18:00:00.000Z', status: 'scheduled', trainerId: 'trainer-2' }),
        baseSession({ id: 'older', sessionDate: '2026-05-19T18:00:00.000Z', status: 'cancelled', trainerId: null }),
      ],
      new Date('2026-05-20T12:00:00.000Z'),
    );

    expect(stats).toEqual({
      todaySessions: 2,
      completedHours: 1.3,
      activeTrainers: 2,
      completionRate: 50,
    });
  });

  it('builds pagination and CSV output without losing comma or quote data', () => {
    const sessions = [
      baseSession({ id: 'row-1', location: 'Main, Studio' }),
      baseSession({ id: 'row-2', location: 'Coach "A" Bay' }),
      baseSession({ id: 'row-3', location: 'Recovery Wing' }),
    ];

    expect(paginateAdminSessions(sessions, 1, 2)).toEqual({
      paginatedSessions: [sessions[2]],
      totalPages: 2,
      displayStart: 3,
      displayEnd: 3,
    });

    const csv = buildAdminSessionsCsv(sessions, {
      formatDate: () => 'May 20, 2026',
      formatTime: () => '10:00 AM',
    });

    expect(csv).toContain('"Main, Studio"');
    expect(csv).toContain('"Coach ""A"" Bay"');
  });

  it('formats missing and invalid date values for defensive table display', () => {
    expect(formatSessionDate(null)).toBe('N/A');
    expect(formatSessionDate('not-a-date')).toBe('Invalid Date');
    expect(formatSessionTime(undefined)).toBe('N/A');
    expect(formatSessionTime('not-a-date')).toBe('Invalid Time');
  });
});
