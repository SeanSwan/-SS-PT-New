export type ScheduleAiDockMode = 'admin' | 'trainer' | 'client';

export interface ScheduleAiContextInput {
  mode: ScheduleAiDockMode;
  activeView: string;
  currentDate: Date;
  sessions: Array<Record<string, unknown>>;
  selectedTrainerId?: string | number | null;
  adminViewScope?: 'my' | 'global';
}

export interface ScheduleAiDockContext {
  surface: 'universal_master_schedule';
  mode: ScheduleAiDockMode;
  activeView: string;
  currentDate: string;
  sessionCount: number;
  visibleSessionIds: string[];
  statusCounts: Record<string, number>;
  selectedTrainerId?: string;
  adminViewScope?: 'my' | 'global';
  expectedScheduleVersion: string;
  currentScheduleVersion: string;
}

function safeString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function sessionIdFor(session: Record<string, unknown>): string | null {
  return safeString(session.id ?? session.sessionId);
}

function statusFor(session: Record<string, unknown>): string {
  return safeString(session.status)?.toLowerCase() || 'unknown';
}

function dateToIso(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function buildScheduleVersion(sessions: Array<Record<string, unknown>>): string {
  const parts = sessions
    .map((session) => [
      sessionIdFor(session) || 'unknown',
      statusFor(session),
      safeString(session.updatedAt ?? session.sessionDate ?? session.start) || 'undated',
    ].join(':'))
    .sort();

  return parts.length > 0 ? parts.join('|') : 'empty';
}

function countStatuses(sessions: Array<Record<string, unknown>>): Record<string, number> {
  return sessions.reduce<Record<string, number>>((counts, session) => {
    const status = statusFor(session);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

export function buildScheduleAiDockContext({
  mode,
  activeView,
  currentDate,
  sessions,
  selectedTrainerId,
  adminViewScope,
}: ScheduleAiContextInput): ScheduleAiDockContext {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const version = buildScheduleVersion(safeSessions);
  const context: ScheduleAiDockContext = {
    surface: 'universal_master_schedule',
    mode,
    activeView,
    currentDate: dateToIso(currentDate),
    sessionCount: safeSessions.length,
    visibleSessionIds: safeSessions
      .map(sessionIdFor)
      .filter((id): id is string => Boolean(id))
      .slice(0, 12),
    statusCounts: countStatuses(safeSessions),
    expectedScheduleVersion: version,
    currentScheduleVersion: version,
  };

  const trainerId = safeString(selectedTrainerId);
  if (trainerId) context.selectedTrainerId = trainerId;
  if (mode === 'admin' && adminViewScope) context.adminViewScope = adminViewScope;

  return context;
}

export function formatScheduleAiAction(action?: string | null): string {
  const clean = safeString(action);
  if (!clean) return 'Schedule review';

  return clean
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
