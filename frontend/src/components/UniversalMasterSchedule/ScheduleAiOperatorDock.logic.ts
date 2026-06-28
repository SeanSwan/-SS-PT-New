export type ScheduleAiDockMode = 'admin' | 'trainer' | 'client';

export interface ScheduleAiContextInput {
  mode: ScheduleAiDockMode;
  activeView: string;
  currentDate: Date;
  sessions: Array<Record<string, unknown>>;
  selectedTrainerId?: string | number | null;
  adminViewScope?: 'my' | 'global';
}

export interface ScheduleAiSafeSessionContext {
  id: string;
  status: string;
  sessionDate?: string;
  endDate?: string;
  duration?: number;
  trainerId?: string;
  userId?: string;
  recurringGroupId?: string;
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
  recurringGroupId?: string;
  recurringSeries?: ScheduleAiSafeSessionContext[];
  comparisonSessions?: ScheduleAiSafeSessionContext[];
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

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

function safeSessionContext(session: Record<string, unknown>): ScheduleAiSafeSessionContext | null {
  const id = sessionIdFor(session);
  if (!id) return null;

  const safeSession: ScheduleAiSafeSessionContext = {
    id,
    status: statusFor(session),
  };

  const sessionDate = safeString(session.sessionDate ?? session.startTime ?? session.start);
  const endDate = safeString(session.endDate ?? session.endTime ?? session.end);
  const duration = safeNumber(session.duration);
  const trainerId = safeString(session.trainerId);
  const userId = safeString(session.userId ?? session.clientId);
  const recurringGroupId = safeString(session.recurringGroupId);

  if (sessionDate) safeSession.sessionDate = sessionDate;
  if (endDate) safeSession.endDate = endDate;
  if (duration) safeSession.duration = duration;
  if (trainerId) safeSession.trainerId = trainerId;
  if (userId) safeSession.userId = userId;
  if (recurringGroupId) safeSession.recurringGroupId = recurringGroupId;

  return safeSession;
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
  const comparisonSessions = safeSessions
    .map(safeSessionContext)
    .filter((session): session is ScheduleAiSafeSessionContext => Boolean(session))
    .slice(0, 24);
  const recurringSeries = comparisonSessions
    .filter((session) => Boolean(session.recurringGroupId))
    .slice(0, 24);
  const recurringGroupIds = Array.from(new Set(recurringSeries.map((session) => session.recurringGroupId).filter(Boolean)));
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
  if (comparisonSessions.length > 0) context.comparisonSessions = comparisonSessions;
  if (recurringSeries.length > 0) context.recurringSeries = recurringSeries;
  if (recurringGroupIds.length === 1 && recurringGroupIds[0]) context.recurringGroupId = recurringGroupIds[0];

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
