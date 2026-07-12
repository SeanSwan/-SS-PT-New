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

// Pick the first candidate that is a non-empty array. Empty arrays are
// truthy in JS, so a naive `a || b` chain treats `[]` as a valid hit and
// blocks fallback to a populated sibling. (Codex 2026-05-02 finding.)
const pickFirstNonEmptyArray = (...candidates) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
};

const findNumberedEntry = (entries, targetNumber, index, keys) => {
  const numberedMatch = entries.find((entry) => (
    entry && typeof entry === 'object' && keys.some((key) => Number(entry[key]) === targetNumber)
  ));
  const indexedMatch = entries[index];
  return numberedMatch || (indexedMatch && typeof indexedMatch === 'object' ? indexedMatch : null);
};

export const planDataToWorkoutDays = (planData, currentWeek = 1) => {
  const data = toPlainObject(planData) || {};
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];
  const weekNumber = toPositiveInteger(currentWeek, 1);
  const weekIndex = Math.max(weekNumber - 1, 0);
  const currentWeekData = findNumberedEntry(weeks, weekNumber, weekIndex, ['weekNumber', 'week'])
    || weeks[0]
    || null;

  const entries = pickFirstNonEmptyArray(
    currentWeekData?.days,
    currentWeekData?.sessions,
    data.days,
    data.sessions,
    data.weeklySchedule,
  );

  return entries.map((entry, index) => {
    const day = toPlainObject(entry) || {};
    const dayNumber = toPositiveInteger(day.dayNumber ?? day.day ?? index + 1, index + 1);
    const dayName = day.dayName || day.dayLabel || day.name || `Day ${dayNumber}`;
    const exercises = Array.isArray(day.exercises) ? day.exercises : [];
    const assignmentMetadata = {
      ...(day.dayType ? { dayType: day.dayType } : {}),
      ...(day.assignmentType ? { assignmentType: day.assignmentType } : {}),
      ...(day.sessionType ? { sessionType: day.sessionType } : {}),
      ...(typeof day.isBillable === 'boolean' ? { isBillable: day.isBillable } : {}),
      ...(typeof day.shouldDeductSession === 'boolean'
        ? { shouldDeductSession: day.shouldDeductSession }
        : {}),
    };

    return {
      id: day.id || `plan-day-${dayNumber}`,
      dayNumber,
      dayName,
      name: day.name || dayName,
      focus: day.focus || day.category || null,
      ...assignmentMetadata,
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
  const weekNumber = toPositiveInteger(planObj.currentWeek, 1);
  const dayNumber = toPositiveInteger(planObj.currentDay, 1);
  const weekIndex = weekNumber - 1;
  const dayIndex = dayNumber - 1;

  const buildSessionView = ({ session, weekFocus, totalSessionsThisWeek, totalWeeks, isLastWeek }) => {
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    return {
      weekNumber: planObj.currentWeek || 1,
      weekFocus: weekFocus || session.focus || null,
      dayNumber: planObj.currentDay || 1,
      dayLabel: session.dayLabel || session.name || `Day ${planObj.currentDay || 1}`,
      session,                              // legacy nested — preserved
      exercises,                            // C1 lift — top-level reference; future consumers use this
      totalWeeks,
      totalSessionsThisWeek,
      isLastSessionOfWeek: (planObj.currentDay || 1) >= totalSessionsThisWeek,
      isLastWeek,
    };
  };

  // Primary path: planData.weeks[].days/sessions[].
  // Empty-array-truthy guard: prefer the populated sibling. (Codex 2026-05-02.)
  // Precedence: days[] BEFORE sessions[] so this helper agrees with
  // planDataToWorkoutDays() and LongHorizonScheduleView when a week happens
  // to carry both populated arrays (Codex 2026-05-02 round-2 finding).
  if (Array.isArray(planData.weeks) && planData.weeks.length > 0) {
    const week = findNumberedEntry(planData.weeks, weekNumber, weekIndex, ['weekNumber', 'week']);
    if (week) {
      const entries = pickFirstNonEmptyArray(week.days, week.sessions);
      const session = findNumberedEntry(entries, dayNumber, dayIndex, ['dayNumber', 'sessionNumber', 'day']);
      if (session) {
        return buildSessionView({
          session,
          weekFocus: week.focus,
          totalSessionsThisWeek: entries.length,
          totalWeeks: planData.weeks.length,
          isLastWeek: (planObj.currentWeek || 1) >= planData.weeks.length,
        });
      }
    }
  }

  // Top-level fallback (Codex 2026-05-02 HIGH): planDataToWorkoutDays
  // accepts top-level `planData.days[]` / `planData.sessions[]` for legacy
  // single-week plans, so the cursor extractor must agree — otherwise an
  // active plan renders `days[]` correctly but reports `currentSession: null`.
  // Precedence: days[] BEFORE sessions[] to match planDataToWorkoutDays
  // (Codex 2026-05-02 round-3: a plan with both populated otherwise produced
  // mismatched cursor vs schedule output).
  const topLevelEntries = pickFirstNonEmptyArray(planData.days, planData.sessions);
  if (topLevelEntries.length > 0) {
    const session = findNumberedEntry(topLevelEntries, dayNumber, dayIndex, ['dayNumber', 'sessionNumber', 'day']);
    if (session) {
      return buildSessionView({
        session,
        weekFocus: null,
        totalSessionsThisWeek: topLevelEntries.length,
        totalWeeks: planObj.durationWeeks || 1,
        isLastWeek: (planObj.currentWeek || 1) >= (planObj.durationWeeks || 1),
      });
    }
  }

  // Backwards-compat path (R8 lock): legacy weeklySchedule[].
  // Synthesize ONLY when the matching entry has an exercises[] field.
  // Otherwise return null — the legacy weeklySchedule is just per-week
  // pattern (focus/category) without exercises and there's nothing to
  // extract as a "current session." Logger UI falls back to plan.days[].
  if (Array.isArray(planData.weeklySchedule)) {
    const legacyDay = findNumberedEntry(planData.weeklySchedule, dayNumber, dayIndex, ['dayNumber', 'day']);
    if (legacyDay && Array.isArray(legacyDay.exercises) && legacyDay.exercises.length > 0) {
      return buildSessionView({
        session: legacyDay,
        weekFocus: legacyDay.focus,
        totalSessionsThisWeek: planData.weeklySchedule.length,
        totalWeeks: planObj.durationWeeks || 1,
        isLastWeek: false,
      });
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

// ─────────────────────────────────────────────────────────────
// SECTION: Public — planDataToAllWeeks
// PURPOSE: flatten the ENTIRE plan (every week -> days -> exercises), not just
//   the current week. `planDataToWorkoutDays` intentionally returns only the
//   current week, so a client-facing full-plan view (the Plan Detail modal)
//   would otherwise show one week and call it "the plan".
//   Reuses the SAME parsers, so legacy weeklySchedule + weeks[].days[] /
//   weeks[].sessions[] shapes stay supported in one place.
// ─────────────────────────────────────────────────────────────
export const planDataToAllWeeks = (planData) => {
  const data = toPlainObject(planData) || {};
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];

  // Legacy/flat plans have no weeks[] — surface their days as a single week 1
  // so the consumer never has to branch on plan vintage.
  if (weeks.length === 0) {
    const days = planDataToWorkoutDays(data, 1);
    return days.length ? [{ weekNumber: 1, focus: data.focus || null, days }] : [];
  }

  return weeks.map((entry, index) => {
    const week = toPlainObject(entry) || {};
    const weekNumber = toPositiveInteger(week.weekNumber ?? week.week ?? index + 1, index + 1);
    const dayEntries = pickFirstNonEmptyArray(week.days, week.sessions);

    return {
      weekNumber,
      focus: week.focus || week.phaseName || null,
      // Reuse the day parser by handing it a one-week planData slice.
      days: planDataToWorkoutDays({ weeks: [{ weekNumber, days: dayEntries }] }, weekNumber),
    };
  });
};

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
