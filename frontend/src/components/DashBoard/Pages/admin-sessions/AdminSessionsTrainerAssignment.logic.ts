import type { Session } from './ViewSessionModal.types';

export type AssignmentMode = 'single' | 'bulk';

export interface AssignmentStatistics {
  sessionSummary?: {
    assigned?: number;
    available?: number;
  };
  assignmentRate?: number;
  trainerWorkload?: unknown[];
}

export const getAssignmentErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }
  return fallback;
};

export const getUnassignedSessions = (sessions: Session[], selectedClient: string): Session[] =>
  sessions.filter(session =>
    session.status === 'available' &&
    session.trainerId === null &&
    (!selectedClient || session.userId === selectedClient)
  );

export const getAssignSessionIds = (
  assignmentMode: AssignmentMode,
  selectedSessions: string[],
): string[] => (assignmentMode === 'bulk' ? [...selectedSessions] : []);

export const getAssignedSessionIdsForRemoval = (sessions: Session[]): string[] =>
  sessions
    .filter(session => session.trainerId && session.status === 'assigned')
    .map(session => session.id);

export const toggleSelectedSession = (selectedSessions: string[], sessionId: string): string[] =>
  selectedSessions.includes(sessionId)
    ? selectedSessions.filter(id => id !== sessionId)
    : [...selectedSessions, sessionId];

export const buildAssignmentReport = (
  assignmentStats: AssignmentStatistics | null,
  timestamp = new Date().toISOString(),
) => ({
  assignmentStats,
  trainerWorkload: assignmentStats?.trainerWorkload || [],
  timestamp,
});

export const buildAssignmentReportFileName = (date = new Date()): string =>
  `trainer-assignments-${date.toISOString().split('T')[0]}.json`;
