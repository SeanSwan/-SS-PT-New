/**
 * Client Workout History Row Service
 * ==================================
 *
 * Maps canonical WorkoutSession rows into the legacy-compatible client
 * dashboard workout-history shape.
 */

const toPlainObject = (session) => (typeof session?.toJSON === 'function' ? session.toJSON() : session);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const parseFormData = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const genericWorkoutTitle = (title) => {
  const value = compactString(title);
  if (!value) return true;
  return value === 'Workout' || /^Personal Training Session\s*-/i.test(value);
};

const sanitizePlannedAssignment = (value) => {
  const raw = parseFormData(value);
  const assignmentKey = compactString(raw?.assignmentKey || raw?.assignmentId);
  if (!assignmentKey) return null;

  const assignment = { assignmentKey };
  const assignmentType = compactString(raw.assignmentType);
  const title = compactString(raw.title);
  const dayLabel = compactString(raw.dayLabel);
  const firstExerciseName = compactString(raw.firstExerciseName);
  const weekNumber = toPositiveInteger(raw.weekNumber);
  const dayNumber = toPositiveInteger(raw.dayNumber);

  if (assignmentType) assignment.assignmentType = assignmentType;
  if (title) assignment.title = title;
  if (weekNumber) assignment.weekNumber = weekNumber;
  if (dayNumber) assignment.dayNumber = dayNumber;
  if (dayLabel) assignment.dayLabel = dayLabel;
  if (firstExerciseName) assignment.firstExerciseName = firstExerciseName;
  return assignment;
};

export const toClientWorkoutHistoryRow = (session) => {
  const raw = toPlainObject(session);
  const duration = Number.isFinite(raw?.duration) ? raw.duration : null;
  const totalSets = Number.isFinite(raw?.totalSets) ? raw.totalSets : 0;
  const dateValue = raw?.completedAt || raw?.date || raw?.createdAt || null;
  let exerciseCount = null;
  let exerciseNames = null;
  let plannedAssignment = null;
  const forms = raw?.dailyForms;

  if (Array.isArray(forms) && forms.length > 0) {
    const formData = parseFormData(forms[0]?.formData);
    plannedAssignment = sanitizePlannedAssignment(formData?.plannedAssignment);
    if (formData && Array.isArray(formData.exercises)) {
      exerciseCount = formData.exercises.length;
      const names = [];
      for (const ex of formData.exercises) {
        const candidate = (typeof ex?.exerciseName === 'string' && ex.exerciseName.trim())
          || (typeof ex?.name === 'string' && ex.name.trim())
          || null;
        if (candidate) names.push(candidate);
      }
      exerciseNames = names;
    }
  }

  const sessionTitle = compactString(raw?.title);
  const plannedTitle = compactString(plannedAssignment?.title);
  const row = {
    id: raw?.id,
    name: genericWorkoutTitle(sessionTitle) && plannedTitle ? plannedTitle : (sessionTitle || 'Workout'),
    date: dateValue,
    duration: duration && duration > 0 ? `${duration} min` : null,
    setsCount: totalSets,
    exerciseCount,
    exerciseNames,
    exercises: exerciseCount ?? totalSets,
  };
  if (plannedAssignment) row.plannedAssignment = plannedAssignment;
  return row;
};
