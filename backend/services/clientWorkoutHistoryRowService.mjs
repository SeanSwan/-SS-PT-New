/**
 * Client Workout History Row Service
 * ==================================
 *
 * Maps canonical WorkoutSession rows into the legacy-compatible client
 * dashboard workout-history shape.
 */

const toPlainObject = (session) => (typeof session?.toJSON === 'function' ? session.toJSON() : session);
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

export const toClientWorkoutHistoryRow = (session) => {
  const raw = toPlainObject(session);
  const duration = Number.isFinite(raw?.duration) ? raw.duration : null;
  const totalSets = Number.isFinite(raw?.totalSets) ? raw.totalSets : 0;
  const dateValue = raw?.completedAt || raw?.date || raw?.createdAt || null;
  let exerciseCount = null;
  let exerciseNames = null;
  const forms = raw?.dailyForms;

  if (Array.isArray(forms) && forms.length > 0) {
    const formData = parseFormData(forms[0]?.formData);
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

  return {
    id: raw?.id,
    name: (raw?.title && String(raw.title).trim()) || 'Workout',
    date: dateValue,
    duration: duration && duration > 0 ? `${duration} min` : null,
    setsCount: totalSets,
    exerciseCount,
    exerciseNames,
    exercises: exerciseCount ?? totalSets,
  };
};
