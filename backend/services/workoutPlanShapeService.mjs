/**
 * Workout Plan Shape Service
 * ==========================
 *
 * Pure-function shared module for workout-plan shape transformations.
 * Single source of truth for two transformations that were previously
 * duplicated across two route files:
 *
 *   1. extractCurrentSession(plan)
 *      Returns the "what's next" view of an active plan: which week, which
 *      day, the day's session object, and the day's exercises.
 *      Migrated from backend/routes/workoutPlanRoutes.mjs (was private).
 *      L1 REV 3 (C1 lift): exercises array is ALSO available at the top
 *      level alongside the legacy `session.exercises` path.
 *
 *   2. planDataToWorkoutDays(planData, currentWeek)
 *      Adapter that flattens the JSONB planData shape into a list of
 *      WorkoutDay rows for UI rendering. Handles legacy weeklySchedule[]
 *      AND the new long-horizon weeks[].days[] / weeks[].sessions[] shape.
 *      Migrated from backend/routes/clientWorkoutRoutes.mjs.
 *
 *   3. toCurrentWorkoutPlanResponse(plan)
 *      Convenience wrapper that produces the shape consumed by the
 *      `/api/workouts/:userId/current` endpoint. Embeds `currentSession`
 *      into the response so the L1 endpoint (and its consumers) always
 *      see the cursor session at every consumer's chosen field path.
 *
 * No DB access, no model imports, no route imports — pure shape logic.
 * That is intentional: the receipt H-pre-2 risk requires this module to
 * be import-cycle-free.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Internal helpers (pure)
// ─────────────────────────────────────────────────────────────

const toPlainObject = (value) => (value?.toJSON ? value.toJSON() : value);

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toExerciseName = (entry) => (
  entry?.exerciseName
  || entry?.name
  || entry?.exercise?.name
  || entry?.exercise?.exerciseName
  || 'Unknown Exercise'
);

const toCurrentPlanExercise = (entry, index) => {
  const exercise = toPlainObject(entry) || {};
  const name = toExerciseName(exercise);

  return {
    id: exercise.id || exercise.exerciseId || `plan-exercise-${index + 1}`,
    exerciseId: exercise.exerciseId || exercise.id || null,
    name,
    exerciseName: name,
    sets: exercise.sets ?? exercise.setScheme ?? 3,
    reps: exercise.reps ?? exercise.targetReps ?? exercise.repGoal ?? '10',
    targetReps: exercise.targetReps ?? exercise.reps ?? exercise.repGoal ?? '10',
    restSeconds: exercise.restSeconds ?? exercise.restTime ?? exercise.restPeriod ?? null,
    restTime: exercise.restTime ?? exercise.restSeconds ?? exercise.restPeriod ?? 60,
    tempo: exercise.tempo || '',
    notes: exercise.notes || '',
    videoUrl: exercise.videoUrl || exercise.exercise?.videoUrl || null,
  };
};

// ─────────────────────────────────────────────────────────────
// SECTION: Public — planDataToWorkoutDays
// PURPOSE: flatten JSONB planData into a list of WorkoutDay rows.
//   Handles legacy weeklySchedule + new weeks[].days[] / weeks[].sessions[].
// ─────────────────────────────────────────────────────────────

export const planDataToWorkoutDays = (planData, currentWeek = 1) => {
  const data = toPlainObject(planData) || {};
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];
  const weekIndex = Math.max(toPositiveInteger(currentWeek, 1) - 1, 0);
  const currentWeekData = weeks[weekIndex] || weeks[0] || null;

  const entries = (
    (currentWeekData && (currentWeekData.days || currentWeekData.sessions))
    || data.days
    || data.sessions
    || data.weeklySchedule
    || []
  );

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry, index) => {
    const day = toPlainObject(entry) || {};
    const dayNumber = toPositiveInteger(day.dayNumber ?? day.day ?? index + 1, index + 1);
    const dayName = day.dayName || day.dayLabel || day.name || `Day ${dayNumber}`;
    const exercises = Array.isArray(day.exercises) ? day.exercises : [];

    return {
      id: day.id || `plan-day-${dayNumber}`,
      dayNumber,
      dayName,
      name: day.name || dayName,
      focus: day.focus || day.category || null,
      exercises: exercises.map(toCurrentPlanExercise),
    };
  });
};

// ─────────────────────────────────────────────────────────────
// SECTION: Public — extractCurrentSession
// PURPOSE: read planData.weeks[currentWeek-1].days/sessions[currentDay-1].
//   L1 REV 3 (C1 lift): also exposes `exercises` at top level for new
//   consumers that don't want to traverse `session.exercises`.
// ─────────────────────────────────────────────────────────────

export const extractCurrentSession = (plan) => {
  const planObj = toPlainObject(plan) || {};
  const planData = planObj.planData || planObj.plan_data || { weeks: [] };
  const weekIndex = (planObj.currentWeek || 1) - 1;
  const dayIndex = (planObj.currentDay || 1) - 1;

  // Primary path: weeks[].days/sessions[]
  if (planData.weeks && planData.weeks[weekIndex]) {
    const week = planData.weeks[weekIndex];
    const entries = week.sessions || week.days || [];
    const session = entries[dayIndex] || null;
    if (session) {
      const exercises = Array.isArray(session.exercises) ? session.exercises : [];
      return {
        weekNumber: planObj.currentWeek || 1,
        weekFocus: week.focus || session.focus || null,
        dayNumber: planObj.currentDay || 1,
        dayLabel: session.dayLabel || session.name || `Day ${planObj.currentDay || 1}`,
        session,                              // legacy nested — preserved
        exercises,                            // C1 lift — top-level reference; future consumers use this
        totalWeeks: planData.weeks.length,
        totalSessionsThisWeek: entries.length,
        isLastSessionOfWeek: (planObj.currentDay || 1) >= entries.length,
        isLastWeek: (planObj.currentWeek || 1) >= planData.weeks.length,
      };
    }
  }

  // Backwards-compat path (R8 lock): legacy weeklySchedule[].
  // Synthesize ONLY when the matching entry has an exercises[] field.
  // Otherwise return null — the legacy weeklySchedule is just per-week
  // pattern (focus/category) without exercises and there's nothing to
  // extract as a "current session." Logger UI falls back to plan.days[].
  if (Array.isArray(planData.weeklySchedule)) {
    const legacyDay = planData.weeklySchedule[dayIndex] || null;
    if (legacyDay && Array.isArray(legacyDay.exercises) && legacyDay.exercises.length > 0) {
      const exercises = legacyDay.exercises;
      return {
        weekNumber: planObj.currentWeek || 1,
        weekFocus: legacyDay.focus || null,
        dayNumber: planObj.currentDay || 1,
        dayLabel: legacyDay.dayLabel || legacyDay.name || `Day ${planObj.currentDay || 1}`,
        session: legacyDay,                   // legacy nested — preserved
        exercises,                            // C1 lift
        totalWeeks: planObj.durationWeeks || 1,
        totalSessionsThisWeek: planData.weeklySchedule.length,
        isLastSessionOfWeek: (planObj.currentDay || 1) >= planData.weeklySchedule.length,
        isLastWeek: false,
      };
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Public — toCurrentWorkoutPlanResponse
// PURPOSE: build the shape consumed by /api/workouts/:userId/current.
//   L1 REV 3 (C4): embeds currentSession into the formatted plan so
//   data.currentSession AND plan.currentSession both have it (the route
//   handler also adds it at top level for direct access).
// ─────────────────────────────────────────────────────────────

export const toCurrentWorkoutPlanResponse = (plan) => {
  const raw = toPlainObject(plan) || {};
  const planData = raw.planData || raw.plan_data || { weeks: [] };
  const days = planDataToWorkoutDays(planData, raw.currentWeek);

  // Compute currentSession for embedding at every consumer's chosen path.
  const currentSession = extractCurrentSession(raw);

  return {
    id: raw.id,
    name: raw.title,
    title: raw.title,
    description: raw.description,
    createdAt: raw.createdAt,
    durationWeeks: raw.durationWeeks,
    difficulty: raw.difficulty,
    tags: raw.tags || [],
    currentWeek: raw.currentWeek,
    currentDay: raw.currentDay,
    planData,
    days,
    currentSession,                            // C4: embedded inside data/plan
    frequency: `${raw.durationWeeks || 0} weeks`,
    duration: days.length ? `${days.length} days/week` : 'Custom',
  };
};
