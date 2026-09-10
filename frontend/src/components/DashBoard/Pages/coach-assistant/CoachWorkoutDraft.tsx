/**
 * FILE: CoachWorkoutDraft.tsx
 * PURPOSE: Editable canonical workout-draft surface (S6 "CoachWorkoutDraft"). Renders the
 *          draft owner's `content` (CoachWorkoutDraftContent) as editable exercise
 *          instances/sets and reports validation errors. Every semantic change is pushed
 *          back through onContentChange — the desk folds that into the G04a owner's
 *          edit(scopeToken, expectedRevision, { content }) so the owner bumps the revision
 *          and mints a fresh requestKey (this component never mutates owner state).
 *
 *          Rules (contract-bound, doc 38): bodyweight requires explicit zero load; kg input
 *          stays unsupported-for-save (the library resolver refuses kg with
 *          UNIT_MAPPING_REQUIRED — do not invent conversion); exercise instance UUIDs are
 *          client-generated and identify instances, not library exercises.
 *
 *          Floor Mode: renders one exercise at a time with large set rows; the transcript
 *          remains reachable via Talk (desk-level).
 */
import React, { useMemo } from 'react';
import {
  type CoachWorkoutDraftContent,
  type CoachWorkoutExerciseDraft,
  type CoachWorkoutSetDraft,
  type CoachWorkoutUnit,
  validateCoachWorkoutContent,
} from './coachWorkoutDraftContract';

export interface CoachWorkoutDraftProps {
  /** Current draft content from the shell owner (frozen). */
  content: CoachWorkoutDraftContent;
  /** Draft editing disabled (review preview / frozen submitted snapshot). */
  disabled?: boolean;
  floorMode?: boolean;
  activeFloorExerciseId?: string | null;
  onFloorExerciseSelect?: (exerciseInstanceId: string) => void;
  /** Semantic content edit — desk folds this into owner edit() with the current revision. */
  onContentChange: (next: CoachWorkoutDraftContent) => void;
  /** 'draft' allows incomplete rows (allowIncomplete); 'review' validates strictly. */
  validationMode?: 'draft' | 'review';
}

export interface CoachWorkoutDraftValidation {
  ok: boolean;
  content: CoachWorkoutDraftContent | null;
  errors: ReadonlyArray<{ code: string; message: string }>;
}

const createInstanceId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  throw new Error('UUID_FACTORY_UNAVAILABLE');
};

const toNumeric = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

export const validateDraftForDesk = (content: unknown, mode: 'draft' | 'review'): CoachWorkoutDraftValidation => {
  const allowIncomplete = mode === 'draft';
  try {
    const validated = validateCoachWorkoutContent(content, { allowIncomplete });
    return { ok: true, content: validated, errors: [] };
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
      const code = (error as { code: string }).code;
      const message = error.message;
      // A thrown code is always a real error (draft mode only swallows *incomplete*
      // per-set values, which return through the success path with empty errors).
      return { ok: false, content: null, errors: [{ code, message }] };
    }
    return { ok: false, content: null, errors: [{ code: 'CONTENT_REQUIRED', message: 'Workout draft content is required.' }] };
  }
};

const buildEmptyExercise = (library: { exerciseId?: string | null; exerciseKey?: string | null; name: string; unit?: CoachWorkoutUnit } = { name: '' }): CoachWorkoutExerciseDraft => ({
  exerciseInstanceId: createInstanceId(),
  exerciseId: library.exerciseId ?? undefined,
  exerciseKey: library.exerciseKey ?? undefined,
  exerciseName: library.name,
  unit: (library.unit as CoachWorkoutUnit | undefined) ?? 'lb',
  sets: [],
});

const CoachWorkoutDraft: React.FC<CoachWorkoutDraftProps> = ({
  content,
  disabled = false,
  floorMode = false,
  activeFloorExerciseId = null,
  onFloorExerciseSelect,
  onContentChange,
  validationMode = 'draft',
}) => {
  const exercises = Array.isArray(content?.exercises) ? content.exercises : [];
  const validation = useMemo(
    () => validateDraftForDesk(content, validationMode),
    [content, validationMode],
  );

  const patchContent = (next: CoachWorkoutDraftContent) => onContentChange(next);

  const changeMeta = (field: 'date' | 'title' | 'notes', value: string | null) => {
    patchContent({ ...content, [field]: value });
  };

  const setExercise = (index: number, next: CoachWorkoutExerciseDraft) => {
    const copy = content.exercises.slice();
    copy[index] = next;
    patchContent({ ...content, exercises: copy });
  };

  const addExercise = (library?: { exerciseId?: string | null; exerciseKey?: string | null; name?: string; unit?: CoachWorkoutUnit }) => {
    const exercise = buildEmptyExercise(
      library && (library.name || library.exerciseId || library.exerciseKey)
        ? { exerciseId: library.exerciseId ?? null, exerciseKey: library.exerciseKey ?? null, name: library.name ?? '', unit: library.unit }
        : { name: '' },
    );
    patchContent({ ...content, exercises: [...content.exercises, exercise] });
  };

  const removeExercise = (index: number) => {
    const copy = content.exercises.slice();
    copy.splice(index, 1);
    patchContent({ ...content, exercises: copy });
  };

  const setUnit = (index: number, unit: CoachWorkoutUnit) => {
    const exercise = content.exercises[index];
    const sets =
      unit === 'bodyweight'
        ? exercise.sets.map((set) => ({ ...set, weight: 0 }))
        : exercise.sets.map((set) => ({ ...set, weight: set.weight ?? 0 }));
    setExercise(index, { ...exercise, unit, sets });
  };

  const addSet = (index: number) => {
    const exercise = content.exercises[index];
    const nextSetNumber = exercise.sets.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1;
    const newSet: CoachWorkoutSetDraft = { setNumber: nextSetNumber, reps: null, weight: exercise.unit === 'bodyweight' ? 0 : null };
    setExercise(index, { ...exercise, sets: [...exercise.sets, newSet] });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = content.exercises[exerciseIndex];
    const sets = exercise.sets.slice();
    sets.splice(setIndex, 1);
    setExercise(exerciseIndex, { ...exercise, sets });
  };

  const patchSet = (exerciseIndex: number, setIndex: number, patch: Partial<CoachWorkoutSetDraft>) => {
    const exercise = content.exercises[exerciseIndex];
    const sets = exercise.sets.slice();
    sets[setIndex] = { ...sets[setIndex], ...patch };
    if (exercise.unit === 'bodyweight' && patch.weight !== undefined && patch.weight !== 0) {
      sets[setIndex] = { ...sets[setIndex], weight: 0 };
    }
    setExercise(exerciseIndex, { ...exercise, sets });
  };

  const visibleExercises = useMemo(() => {
    if (!floorMode) return exercises.map((exercise, index) => ({ exercise, index }));
    const active = exercises.findIndex((exercise) => exercise.exerciseInstanceId === activeFloorExerciseId);
    const single = active >= 0 ? [active] : [0];
    return single.map((index) => ({ exercise: exercises[index], index }));
  }, [exercises, floorMode, activeFloorExerciseId]);

  const floorNavigation = floorMode && exercises.length > 1;
  const floorActiveIndex = floorMode ? Math.max(exercises.findIndex((exercise) => exercise.exerciseInstanceId === activeFloorExerciseId), 0) : 0;
  const floorPrevious = floorNavigation && floorActiveIndex > 0 ? exercises[floorActiveIndex - 1] : null;
  const floorNext = floorNavigation && floorActiveIndex < exercises.length - 1 ? exercises[floorActiveIndex + 1] : null;

  return (
    <form
      className={`coach-workout-draft${floorMode ? ' coach-workout-draft--floor' : ''}`}
      data-testid="coach-workout-draft"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => event.preventDefault()}
      aria-busy={disabled || undefined}
    >
      <div className="coach-workout-draft-meta">
        <label className="coach-workout-draft-field">
          <span>Date</span>
          <input
            type="date"
            data-testid="coach-workout-draft-date"
            value={content.date ?? ''}
            disabled={disabled}
            onChange={(event) => changeMeta('date', event.target.value || null)}
          />
        </label>
        <label className="coach-workout-draft-field">
          <span>Title</span>
          <input
            type="text"
            data-testid="coach-workout-draft-title"
            value={content.title ?? ''}
            disabled={disabled}
            onChange={(event) => changeMeta('title', event.target.value || null)}
          />
        </label>
        <label className="coach-workout-draft-field">
          <span>Notes</span>
          <textarea
            data-testid="coach-workout-draft-notes"
            value={content.notes ?? ''}
            disabled={disabled}
            onChange={(event) => changeMeta('notes', event.target.value || null)}
            rows={2}
          />
        </label>
      </div>

      <ul className="coach-workout-draft-exercises" role="list">
        {visibleExercises.map(({ exercise, index }) => (
          <li
            key={exercise.exerciseInstanceId || `exercise-${index}`}
            className="coach-workout-draft-exercise"
            data-testid={`coach-workout-exercise-${exercise.exerciseInstanceId || index}`}
          >
            <div className="coach-workout-draft-exercise-head">
              <input
                type="text"
                aria-label={`Exercise ${index + 1} canonical name`}
                data-testid={`coach-workout-exercise-name-${index}`}
                value={exercise.exerciseName}
                placeholder="Exercise (resolve from library)"
                disabled={disabled}
                onChange={(event) => setExercise(index, { ...exercise, exerciseName: event.target.value })}
              />
              <select
                aria-label={`Exercise ${index + 1} load unit`}
                data-testid={`coach-workout-exercise-unit-${index}`}
                value={exercise.unit}
                disabled={disabled}
                onChange={(event) => setUnit(index, event.target.value as CoachWorkoutUnit)}
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
                <option value="bodyweight">bodyweight</option>
              </select>
              {exercise.unit === 'kg' ? (
                <span className="coach-workout-draft-kg-hint" data-testid="coach-workout-kg-hint">
                  kg input is not yet save-able
                </span>
              ) : null}
              {!disabled && !floorMode ? (
                <button
                  type="button"
                  className="coach-workout-draft-remove-exercise"
                  data-testid={`coach-workout-remove-exercise-${index}`}
                  onClick={() => removeExercise(index)}
                >
                  Remove exercise
                </button>
              ) : null}
            </div>

            <div className="coach-workout-draft-sets">
              <table className="coach-workout-draft-set-table" data-testid={`coach-workout-sets-${index}`}>
                <thead>
                  <tr>
                    <th scope="col">Set</th>
                    <th scope="col">Reps</th>
                    <th scope="col">{exercise.unit === 'bodyweight' ? 'Load (0)' : 'Load'}</th>
                    <th scope="col" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set, setIndex) => (
                    <tr key={`${exercise.exerciseInstanceId}-${set.setNumber}`} data-testid={`coach-workout-set-${index}-${set.setNumber}`}>
                      <td>{set.setNumber}</td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Set ${set.setNumber} reps`}
                          data-testid={`coach-workout-set-reps-${index}-${set.setNumber}`}
                          value={set.reps === null ? '' : String(set.reps)}
                          disabled={disabled}
                          onChange={(event) => patchSet(index, setIndex, { reps: toNumeric(event.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Set ${set.setNumber} ${exercise.unit}`}
                          data-testid={`coach-workout-set-weight-${index}-${set.setNumber}`}
                          value={set.weight === null ? '' : String(set.weight)}
                          disabled={disabled || exercise.unit === 'bodyweight'}
                          onChange={(event) => patchSet(index, setIndex, { weight: toNumeric(event.target.value) })}
                        />
                      </td>
                      <td>
                        {!disabled ? (
                          <button
                            type="button"
                            className="coach-workout-draft-remove-set"
                            data-testid={`coach-workout-remove-set-${index}-${set.setNumber}`}
                            onClick={() => removeSet(index, setIndex)}
                          >
                            Remove set
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!disabled ? (
                <button
                  type="button"
                  className="coach-workout-draft-add-set"
                  data-testid={`coach-workout-add-set-${index}`}
                  onClick={() => addSet(index)}
                >
                  Add set
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!disabled && !floorMode ? (
        <button type="button" className="coach-workout-draft-add-exercise" data-testid="coach-workout-add-exercise" onClick={() => addExercise()}>
          Add exercise
        </button>
      ) : null}

      {floorNavigation ? (
        <nav className="coach-workout-draft-floor-nav" aria-label="Floor mode exercise navigation">
          {floorPrevious ? (
            <button
              type="button"
              data-testid="coach-workout-floor-previous"
              onClick={() => onFloorExerciseSelect?.(floorPrevious.exerciseInstanceId)}
            >
              ← {floorPrevious.exerciseName || 'Previous exercise'}
            </button>
          ) : null}
          <span className="coach-workout-draft-floor-progress" data-testid="coach-workout-floor-progress">
            Exercise {floorActiveIndex + 1} of {exercises.length}
          </span>
          {floorNext ? (
            <button
              type="button"
              data-testid="coach-workout-floor-next"
              onClick={() => onFloorExerciseSelect?.(floorNext.exerciseInstanceId)}
            >
              {floorNext.exerciseName || 'Next exercise'} →
            </button>
          ) : null}
        </nav>
      ) : null}

      <div className="coach-workout-draft-validation" data-testid="coach-workout-draft-validation" aria-live="polite">
        {validationMode === 'review' && !validation.ok
          ? validation.errors.map((error) => (
              <p key={error.code} className="coach-workout-draft-error" data-testid={`coach-workout-error-${error.code}`}>
                {error.message}
              </p>
            ))
          : null}
      </div>
    </form>
  );
};

export default CoachWorkoutDraft;
