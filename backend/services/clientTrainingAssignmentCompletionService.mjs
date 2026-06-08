/**
 * Client Training Assignment Completion Service
 * =============================================
 *
 * Helpers for reading and overlaying completed DailyWorkoutForm planned-
 * assignment logs onto the client training read model.
 */

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const DAILY_FORM_COMPLETION_ATTRIBUTES = ['id', 'formData', 'submittedAt', 'updatedAt'];
const DAILY_FORM_RECENT_COMPLETION_ATTRIBUTES = ['id', 'date', 'formData', 'submittedAt', 'updatedAt'];
const DAILY_FORM_COMPLETION_ORDER = [['submittedAt', 'DESC'], ['updatedAt', 'DESC']];

const parseJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? value : null;
};

const buildPlannedAssignmentCompletionFromDailyForm = (dailyForm) => {
  const raw = toPlainObject(dailyForm) || null;
  if (!raw) return null;
  const formData = parseJsonObject(raw.formData);
  const plannedAssignment = parseJsonObject(formData?.plannedAssignment);
  const assignmentKey = compactString(plannedAssignment?.assignmentKey || plannedAssignment?.assignmentId);
  if (!assignmentKey) return null;

  return {
    assignmentKey,
    assignmentType: compactString(plannedAssignment?.assignmentType),
    title: compactString(plannedAssignment?.title),
    weekNumber: toPositiveInteger(plannedAssignment?.weekNumber),
    dayNumber: toPositiveInteger(plannedAssignment?.dayNumber),
    dayLabel: compactString(plannedAssignment?.dayLabel),
    exerciseCount: toPositiveInteger(plannedAssignment?.exerciseCount) || 0,
    firstExerciseName: compactString(plannedAssignment?.firstExerciseName),
    scheduledDate: raw.date ?? null,
    formId: raw.id ?? null,
    completedAt: raw.submittedAt ?? raw.updatedAt ?? raw.createdAt ?? null,
  };
};

const readDailyWorkoutFormsForCompletion = async (DailyWorkoutForm, clientId, date) => {
  const query = {
    where: { clientId, date },
    attributes: DAILY_FORM_COMPLETION_ATTRIBUTES,
    order: DAILY_FORM_COMPLETION_ORDER,
  };
  if (typeof DailyWorkoutForm.findAll === 'function') {
    return DailyWorkoutForm.findAll({ ...query, limit: 20 });
  }

  const dailyForm = await DailyWorkoutForm.findOne(query);
  return dailyForm ? [dailyForm] : [];
};

const buildCompletionList = (dailyForms) => (
  (Array.isArray(dailyForms) ? dailyForms : [])
    .map(buildPlannedAssignmentCompletionFromDailyForm)
    .filter(Boolean)
);

export const findPlannedAssignmentCompletionsForDate = async (
  DailyWorkoutForm,
  { clientId, date, onLookupError } = {},
) => {
  const hasReader = DailyWorkoutForm?.findAll || DailyWorkoutForm?.findOne;
  if (!hasReader || !clientId || !date) return [];

  try {
    const dailyForms = await readDailyWorkoutFormsForCompletion(DailyWorkoutForm, clientId, date);
    return buildCompletionList(dailyForms);
  } catch (error) {
    if (typeof onLookupError === 'function') onLookupError(error);
    return [];
  }
};

export const findRecentPlannedAssignmentCompletions = async (
  DailyWorkoutForm,
  { clientId, limit = 12, onLookupError } = {},
) => {
  if (!DailyWorkoutForm?.findAll || !clientId) return [];

  try {
    const dailyForms = await DailyWorkoutForm.findAll({
      where: { clientId },
      attributes: DAILY_FORM_RECENT_COMPLETION_ATTRIBUTES,
      order: DAILY_FORM_COMPLETION_ORDER,
      limit: Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12)),
    });
    return buildCompletionList(dailyForms);
  } catch (error) {
    if (typeof onLookupError === 'function') onLookupError(error);
    return [];
  }
};

const completionForAssignment = (assignmentKey, assignmentCompletions = []) => {
  if (!assignmentKey || !Array.isArray(assignmentCompletions)) return null;
  return assignmentCompletions.find((completion) => (
    compactString(completion?.assignmentKey || completion?.assignmentId) === assignmentKey
  )) || null;
};

export const applyAssignmentCompletion = (assignment, assignmentCompletions) => {
  if (!assignment || typeof assignment !== 'object') return assignment;
  const completion = completionForAssignment(assignment.assignmentKey, assignmentCompletions);
  if (!completion) return assignment;

  return {
    ...assignment,
    status: 'completed',
    isLoggable: false,
    ctaLabel: 'Review Workout',
    completion: {
      source: 'daily_workout_form',
      formId: completion.formId ?? completion.id ?? null,
      completedAt: completion.completedAt ?? completion.submittedAt ?? null,
    },
  };
};
