import { describe, expect, it } from 'vitest';
import type { Session } from './ViewSessionModal.types';
import {
  buildAssignmentReport,
  buildAssignmentReportFileName,
  getAssignedSessionIdsForRemoval,
  getAssignSessionIds,
  getAssignmentErrorMessage,
  getUnassignedSessions,
  toggleSelectedSession,
} from './AdminSessionsTrainerAssignment.logic';

const session = (overrides: Partial<Session>): Session => ({
  id: overrides.id ?? 'session-1',
  sessionDate: overrides.sessionDate ?? '2026-05-20T17:00:00.000Z',
  duration: overrides.duration ?? 60,
  userId: overrides.userId ?? 'client-1',
  trainerId: overrides.trainerId ?? null,
  location: overrides.location,
  notes: overrides.notes,
  status: overrides.status ?? 'available',
  client: overrides.client,
  trainer: overrides.trainer,
});

describe('AdminSessionsTrainerAssignment logic', () => {
  it('filters only available unassigned sessions for the selected client', () => {
    const sessions = [
      session({ id: 'client-1-open', userId: 'client-1' }),
      session({ id: 'client-2-open', userId: 'client-2' }),
      session({ id: 'assigned', userId: 'client-1', trainerId: 'trainer-1' }),
      session({ id: 'scheduled', userId: 'client-1', status: 'scheduled' }),
    ];

    expect(getUnassignedSessions(sessions, 'client-1').map((item) => item.id)).toEqual(['client-1-open']);
    expect(getUnassignedSessions(sessions, '').map((item) => item.id)).toEqual(['client-1-open', 'client-2-open']);
  });

  it('builds assignment and removal ID lists without leaking stale selection', () => {
    expect(getAssignSessionIds('single', ['a', 'b'])).toEqual([]);
    expect(getAssignSessionIds('bulk', ['a', 'b'])).toEqual(['a', 'b']);

    expect(getAssignedSessionIdsForRemoval([
      session({ id: 'assigned', trainerId: 'trainer-1', status: 'assigned' }),
      session({ id: 'scheduled-with-trainer', trainerId: 'trainer-1', status: 'scheduled' }),
      session({ id: 'open', trainerId: null, status: 'available' }),
    ])).toEqual(['assigned']);
  });

  it('toggles selected session IDs without mutating the existing list', () => {
    const selected = ['first', 'second'];

    expect(toggleSelectedSession(selected, 'third')).toEqual(['first', 'second', 'third']);
    expect(toggleSelectedSession(selected, 'first')).toEqual(['second']);
    expect(selected).toEqual(['first', 'second']);
  });

  it('normalizes API errors and deterministic export metadata', () => {
    const error = { response: { data: { message: 'Trainer already assigned' } } };
    const stats = {
      sessionSummary: { assigned: 2, available: 3 },
      assignmentRate: 40,
      trainerWorkload: [{ trainerId: 'trainer-1', assigned: 2 }],
    };

    expect(getAssignmentErrorMessage(error, 'Fallback')).toBe('Trainer already assigned');
    expect(getAssignmentErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down');
    expect(getAssignmentErrorMessage({}, 'Fallback')).toBe('Fallback');
    expect(buildAssignmentReport(stats, '2026-05-31T12:00:00.000Z')).toEqual({
      assignmentStats: stats,
      trainerWorkload: stats.trainerWorkload,
      timestamp: '2026-05-31T12:00:00.000Z',
    });
    expect(buildAssignmentReportFileName(new Date('2026-05-31T12:00:00.000Z'))).toBe('trainer-assignments-2026-05-31.json');
  });
});
