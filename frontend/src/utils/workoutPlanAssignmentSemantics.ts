/**
 * Workout plan assignment semantics
 * =================================
 *
 * Shared frontend contract for coach-built plans saved to the Plan Vault.
 * Trainer-created training days are trainer-led assignments, while session
 * deduction stays controlled by the scheduled workout-log flow.
 */

export const TRAINER_SESSION_ASSIGNMENT_DEFAULTS = {
  defaultAssignmentType: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  shouldDeductSession: false,
} as const;

export const TRAINER_SESSION_DAY_SEMANTICS = {
  assignmentType: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  shouldDeductSession: false,
} as const;

export const TRAINER_SESSION_METADATA = {
  assignmentDefault: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  defaultShouldDeductSession: false,
} as const;

const normalizeKey = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';

const NON_TRAINER_ASSIGNMENTS = new Set(['homework', 'active_recovery', 'rest', 'assessment']);

export const withTrainerSessionDaySemantics = <Day extends Record<string, unknown>>(day: Day): Day => {
  const assignmentType = normalizeKey(day.assignmentType);
  const dayType = normalizeKey(day.dayType);

  if (NON_TRAINER_ASSIGNMENTS.has(assignmentType) || NON_TRAINER_ASSIGNMENTS.has(dayType)) {
    return day;
  }

  if (assignmentType === 'trainer_session' || assignmentType === 'trainer_led' || dayType === 'training' || !dayType) {
    return { ...day, ...TRAINER_SESSION_DAY_SEMANTICS };
  }

  return day;
};

export const withTrainerSessionWeekSemantics = <Week extends Record<string, unknown>>(week: Week): Week => {
  const nextWeek: Record<string, unknown> = { ...week };

  if (Array.isArray(week.days)) {
    nextWeek.days = week.days.map(day => (day && typeof day === 'object'
      ? withTrainerSessionDaySemantics(day as Record<string, unknown>)
      : day));
  }

  if (Array.isArray(week.sessions)) {
    nextWeek.sessions = week.sessions.map(session => (session && typeof session === 'object'
      ? withTrainerSessionDaySemantics(session as Record<string, unknown>)
      : session));
  }

  return nextWeek as Week;
};

export const withTrainerSessionPlanWeeks = (weeks: unknown): unknown[] => (
  Array.isArray(weeks)
    ? weeks.map(week => (week && typeof week === 'object'
      ? withTrainerSessionWeekSemantics(week as Record<string, unknown>)
      : week))
    : []
);
