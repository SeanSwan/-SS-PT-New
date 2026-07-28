import {
  convertAIWorkoutExercisesToEntries,
  coerceToNumericId,
  currentWorkoutAssignmentMatchesRouteIntent,
  getCurrentWorkoutCursorSession,
  hasIncompleteWorkoutSets,
  isCurrentWorkoutAssignmentLoggable,
  normalizeWorkoutDate,
  planAssignmentPickerItemToContext,
  planAssignmentPickerItemToEntries,
  planAssignmentPickerItemToSubmitAssignment,
  plannedExerciseToEntry,
} from './WorkoutLogger.helpers';

describe('WorkoutLogger helpers', () => {
  it('coerces finite numeric ids and rejects invalid ids', () => {
    expect(coerceToNumericId(7)).toBe(7);
    expect(coerceToNumericId('42')).toBe(42);
    expect(coerceToNumericId('')).toBeUndefined();
    expect(coerceToNumericId('abc')).toBeUndefined();
    expect(coerceToNumericId(Number.NaN)).toBeUndefined();
    expect(coerceToNumericId(0)).toBeUndefined();
    expect(coerceToNumericId(-1)).toBeUndefined();
    expect(coerceToNumericId(42.5)).toBeUndefined();
    expect(coerceToNumericId('42.5')).toBeUndefined();
    expect(coerceToNumericId('42junk')).toBeUndefined();
  });

  it('normalizes scheduled workout dates with a deterministic fallback', () => {
    expect(normalizeWorkoutDate('2026-05-24T20:30:00.000Z', new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-24');
    expect(normalizeWorkoutDate(null, new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-30');
    expect(normalizeWorkoutDate('not-a-date', new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-30');
  });

  it('maps planned exercises into null-honest workout logger entries', () => {
    const entry = plannedExerciseToEntry(
      {
        id: 'plan-1',
        exerciseName: 'Goblet Squat',
        sets: '2',
        weight: '35',
        targetReps: '10',
        tempo: '3-1-1',
        restSeconds: '75',
      },
      () => 'fallback-id',
    );

    expect(entry.exerciseId).toBe('plan-1');
    expect(entry.exerciseName).toBe('Goblet Squat');
    expect(entry.sets).toHaveLength(2);
    expect(entry.sets[0]).toMatchObject({
      setNumber: 1,
      weight: 35,
      reps: 10,
      rpe: null,
      formQuality: null,
      tempo: '3-1-1',
      restTime: 75,
    });
    expect(entry.formRating).toBeNull();
  });

  it('reads currentSession from every backend-compatible response location', () => {
    const session = { exercises: [{ name: 'Pushup' }] };
    expect(getCurrentWorkoutCursorSession({ currentSession: session })).toBe(session);
    expect(getCurrentWorkoutCursorSession({ data: { currentSession: session } })).toBe(session);
    expect(getCurrentWorkoutCursorSession({ plan: { currentSession: session } })).toBe(session);
  });

  it('blocks current-workout prefill for completed or non-loggable assignments', () => {
    expect(isCurrentWorkoutAssignmentLoggable(null)).toBe(true);
    expect(isCurrentWorkoutAssignmentLoggable({ assignmentType: 'homework', isLoggable: true })).toBe(true);
    expect(isCurrentWorkoutAssignmentLoggable({ assignmentType: 'homework', status: 'completed', isLoggable: false })).toBe(false);
    expect(isCurrentWorkoutAssignmentLoggable({ assignmentType: 'rest', isLoggable: false })).toBe(false);
    expect(isCurrentWorkoutAssignmentLoggable({ assignmentType: 'trainer_session', isLoggable: true })).toBe(false);
    expect(isCurrentWorkoutAssignmentLoggable(
      { assignmentType: 'trainer_session', isLoggable: false },
      { hasScheduledSession: true },
    )).toBe(true);
  });

  it('matches route assignment intent by assignment key and type', () => {
    const assignment = {
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'homework',
      isLoggable: true,
    };

    expect(currentWorkoutAssignmentMatchesRouteIntent(assignment)).toBe(true);
    expect(currentWorkoutAssignmentMatchesRouteIntent(assignment, {
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'HOMEWORK',
    })).toBe(true);
    expect(currentWorkoutAssignmentMatchesRouteIntent(assignment, {
      assignmentKey: 'plan-6m:w4:d3:homework',
      assignmentType: 'homework',
    })).toBe(false);
    expect(currentWorkoutAssignmentMatchesRouteIntent(assignment, {
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'active_recovery',
    })).toBe(false);
    expect(currentWorkoutAssignmentMatchesRouteIntent(null, {
      assignmentKey: 'plan-6m:w4:d2:homework',
    })).toBe(false);
  });

  it('converts AI workout exercises into null-honest logger rows', () => {
    let nextId = 0;
    const makeLocalId = (prefix: string) => `${prefix}-${nextId += 1}`;

    const [entry] = convertAIWorkoutExercisesToEntries(
      [{
        exerciseName: 'AI Goblet Squat',
        sets: 2,
        weight: 40,
        reps: 8,
        tempo: '3-1-1',
        restTime: 75,
        notes: 'Keep chest tall',
      }],
      makeLocalId,
    );

    expect(entry).toMatchObject({
      loggerExerciseId: 'exercise-1',
      exerciseId: 'ai-2',
      exerciseName: 'AI Goblet Squat',
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    });
    expect(entry.sets).toEqual([
      {
        loggerSetId: 'set-3',
        setNumber: 1,
        weight: 40,
        reps: 8,
        rpe: null,
        tempo: '3-1-1',
        restTime: 75,
        formQuality: null,
        notes: 'Keep chest tall',
      },
      {
        loggerSetId: 'set-4',
        setNumber: 2,
        weight: 40,
        reps: 8,
        rpe: null,
        tempo: '3-1-1',
        restTime: 75,
        formQuality: null,
        notes: 'Keep chest tall',
      },
    ]);
  });


  it('loads generated picker days as logger rows while only current items submit assignment metadata', () => {
    let nextId = 0;
    const makeLocalId = (prefix: string) => `${prefix}-${nextId += 1}`;
    const pickerItem = {
      id: 'plan-6m:w1:d2:homework',
      assignmentKey: 'plan-6m:w1:d2:homework',
      planId: 'plan-6m',
      planTitle: 'Six Month Arc',
      assignmentType: 'homework',
      canSubmitPlannedAssignment: true,
      isLoadable: true,
      title: 'Upper Strength',
      weekNumber: 1,
      dayNumber: 2,
      dayLabel: 'Upper',
      exerciseCount: 1,
      firstExerciseName: 'Row',
      exercises: [{ exerciseId: 'row', exerciseName: 'Row', sets: 3, reps: 8 }],
    };

    expect(planAssignmentPickerItemToEntries(pickerItem, makeLocalId)[0]).toMatchObject({
      exerciseId: 'row',
      exerciseName: 'Row',
      sets: expect.arrayContaining([expect.objectContaining({ reps: 8, rpe: null })]),
    });
    expect(planAssignmentPickerItemToContext(pickerItem)).toMatchObject({
      assignmentKey: 'plan-6m:w1:d2:homework',
      planId: 'plan-6m',
      source: 'workout_plan',
      title: 'Upper Strength',
    });
    expect(planAssignmentPickerItemToSubmitAssignment(pickerItem)).toMatchObject({
      assignmentKey: 'plan-6m:w1:d2:homework',
    });

    expect(planAssignmentPickerItemToSubmitAssignment({
      ...pickerItem,
      id: 'plan-6m:w1:d4:homework',
      assignmentKey: 'plan-6m:w1:d4:homework',
      canSubmitPlannedAssignment: false,
      submitMode: 'draft_only',
    })).toBeNull();
  });

  it('keeps coach duration rows review-only instead of inventing reps', () => {
    let nextId = 0;
    const makeLocalId = (prefix: string) => `${prefix}-${nextId += 1}`;

    const [entry] = convertAIWorkoutExercisesToEntries(
      [{
        exerciseName: 'Incline walk',
        sets: 1,
        reps: 0,
        notes: '5 minutes',
      }],
      makeLocalId,
    );

    expect(entry.sets).toEqual([
      expect.objectContaining({
        reps: 0,
        weight: 0,
        notes: '5 minutes',
      }),
    ]);
    expect(hasIncompleteWorkoutSets([entry])).toBe(true);
  });

  it('detects sets that are not ready for workout save or summary generation', () => {
    expect(hasIncompleteWorkoutSets([])).toBe(false);
    expect(hasIncompleteWorkoutSets([{
      exerciseId: 'pushup',
      exerciseName: 'Push-up',
      sets: [],
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    }])).toBe(true);
    expect(hasIncompleteWorkoutSets([{
      exerciseId: 'pushup',
      exerciseName: 'Push-up',
      sets: [{ setNumber: 1, weight: 0, reps: 0, rpe: null, tempo: '', restTime: 60, formQuality: null, notes: '' }],
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    }])).toBe(true);
    expect(hasIncompleteWorkoutSets([{
      exerciseId: 'pushup',
      exerciseName: 'Push-up',
      sets: [{ setNumber: 1, weight: 0, reps: 12, rpe: null, tempo: '', restTime: 60, formQuality: null, notes: '' }],
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    }])).toBe(false);
  });
});
