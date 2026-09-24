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
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  type CoachWorkoutDraftContent,
  type CoachWorkoutExerciseDraft,
  type CoachWorkoutSetDraft,
  type CoachWorkoutUnit,
  validateCoachWorkoutContent,
} from './coachWorkoutDraftContract';
import NASMExerciseRolodex, { isCanonicalExerciseSelection } from '../../../WorkoutLogger/NASMExerciseRolodex';
import type { ExerciseSlim } from '../../../WorkoutLogger/useExerciseSearch';
import { DraftError, DraftForm, LibraryPanel, LibraryToggle } from './CoachWorkoutDraft.styles';

export interface CoachWorkoutDraftProps {
  /** Current draft content from the shell owner (frozen). */
  content: CoachWorkoutDraftContent;
  /** Draft editing disabled (review preview / frozen submitted snapshot). */
  disabled?: boolean;
  /** Defaults to memory-only for Coach; standalone Rolodex keeps true. */
  persistRecentSelections?: boolean;
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

const CANONICAL_EXERCISE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const buildExerciseFromLibrary = (exercise: ExerciseSlim): CoachWorkoutExerciseDraft => ({
  exerciseInstanceId: createInstanceId(),
  exerciseId: exercise.id,
  exerciseKey: exercise.exerciseKey,
  exerciseName: exercise.name,
  unit: 'lb',
  sets: [],
});

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
    if (validated.exercises.some((exercise) => exercise.unit === 'kg')) {
      return {
        ok: false,
        content: null,
        errors: [{ code: 'UNIT_MAPPING_REQUIRED', message: 'Kilogram input requires an approved unit mapping before review or save.' }],
      };
    }
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

const CoachWorkoutDraft: React.FC<CoachWorkoutDraftProps> = ({
  content,
  disabled = false,
  persistRecentSelections = false,
  floorMode = false,
  activeFloorExerciseId = null,
  onFloorExerciseSelect,
  onContentChange,
  validationMode = 'draft',
}) => {
  const exercises = Array.isArray(content?.exercises) ? content.exercises : [];
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryTargetIndex, setLibraryTargetIndex] = useState<number | null>(null);
  const [librarySessionId, setLibrarySessionId] = useState(0);
  const libraryOpenRef = useRef(false);
  const librarySessionRef = useRef(0);
  const libraryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const livePropsRef = useRef({ content, disabled, floorMode });
  livePropsRef.current = { content, disabled, floorMode };
  useLayoutEffect(() => {
    if (disabled || floorMode) {
      libraryOpenRef.current = false;
      librarySessionRef.current += 1;
      setLibraryOpen(false);
      setLibraryTargetIndex(null);
    }
  }, [disabled, floorMode]);
  useLayoutEffect(() => () => {
    libraryOpenRef.current = false;
    librarySessionRef.current += 1;
  }, []);

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

  const handleLibrarySelection = (library: ExerciseSlim, sessionId: number) => {
    // A delayed callback from a picker that was closed must not mutate the draft.
    const current = livePropsRef.current;
    if (!libraryOpenRef.current || sessionId !== librarySessionRef.current
      || current.disabled || current.floorMode || current.content !== content) return;
    if (!isCanonicalExerciseSelection(library)
      || !CANONICAL_EXERCISE_UUID.test(library.id)
      || typeof library.exerciseKey !== 'string'
      || library.exerciseKey.trim() === '') {
      setLibraryError('Choose a canonical exercise with a valid id, key, and name.');
      return;
    }
    setLibraryError(null);
    let exercise: CoachWorkoutExerciseDraft;
    try {
      exercise = buildExerciseFromLibrary(library);
    } catch (error) {
      setLibraryError(error instanceof Error && error.message === 'UUID_FACTORY_UNAVAILABLE'
        ? 'Exercise selection is temporarily unavailable. Close and try again.'
        : 'Exercise selection failed. Close and try again.');
      return;
    }
    const nextExercises = content.exercises.slice();
    if (libraryTargetIndex === null) nextExercises.push(exercise);
    else if (libraryTargetIndex >= 0 && libraryTargetIndex < nextExercises.length) nextExercises[libraryTargetIndex] = exercise;
    else return;
    patchContent({ ...content, exercises: nextExercises });
    closeLibrary();
  };

  const openLibrary = (targetIndex: number | null = null, trigger: HTMLButtonElement | null = null) => {
    if (livePropsRef.current.disabled || livePropsRef.current.floorMode) return;
    const nextSessionId = librarySessionRef.current + 1;
    librarySessionRef.current = nextSessionId;
    libraryOpenRef.current = true;
    libraryTriggerRef.current = trigger;
    setLibraryError(null);
    setLibraryTargetIndex(targetIndex);
    setLibrarySessionId(nextSessionId);
    setLibraryOpen(true);
  };

  const closeLibrary = () => {
    librarySessionRef.current += 1;
    libraryOpenRef.current = false;
    setLibrarySessionId(librarySessionRef.current);
    setLibraryOpen(false);
    setLibraryTargetIndex(null);
    const trigger = libraryTriggerRef.current;
    if (trigger) requestAnimationFrame(() => {
      if (trigger.isConnected && !trigger.disabled && !libraryOpenRef.current) trigger.focus();
    });
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
        : exercise.sets.map((set) => ({ ...set, weight: set.weight }));
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
    if (!exercises.length) return [];
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
    <DraftForm
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

      {floorMode && exercises.length === 0 ? <p role="status">Add an exercise in Draft to begin Floor Mode.</p> : null}
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
                placeholder="Select from library"
                disabled={disabled}
                readOnly
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
                <>
                  <button
                    type="button"
                    className="coach-workout-draft-replace-exercise"
                    data-testid={`coach-workout-replace-exercise-${index}`}
                    onClick={(event) => openLibrary(index, event.currentTarget)}
                  >
                    Replace from library
                  </button>
                  <button
                    type="button"
                    className="coach-workout-draft-remove-exercise"
                    data-testid={`coach-workout-remove-exercise-${index}`}
                    onClick={() => removeExercise(index)}
                  >
                    Remove exercise
                  </button>
                </>
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
                      <td data-label="Set">{set.setNumber}</td>
                      <td data-label="Reps">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          aria-label={`Set ${set.setNumber} reps`}
                          data-testid={`coach-workout-set-reps-${index}-${set.setNumber}`}
                          value={set.reps ?? ''}
                          disabled={disabled}
                          onChange={(event) => patchSet(index, setIndex, { reps: toNumeric(event.target.value) })}
                        />
                      </td>
                      <td data-label={`Load (${exercise.unit})`}>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          aria-label={`Set ${set.setNumber} ${exercise.unit}`}
                          data-testid={`coach-workout-set-weight-${index}-${set.setNumber}`}
                          value={set.weight ?? ''}
                          disabled={disabled || exercise.unit === 'bodyweight'}
                          onChange={(event) => patchSet(index, setIndex, { weight: toNumeric(event.target.value) })}
                        />
                      </td>
                      <td data-label="Actions">
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
        <>
          <LibraryToggle
            type="button"
            className="coach-workout-draft-add-exercise"
            data-testid="coach-workout-open-library"
            onClick={(event) => openLibrary(null, event.currentTarget)}
          >
            Add exercise from library
          </LibraryToggle>
          {libraryError ? <DraftError data-testid="coach-workout-library-error" role="alert">{libraryError}</DraftError> : null}
          {libraryOpen ? (
            <LibraryPanel className="coach-workout-draft-library-panel" role="dialog" aria-label="Select exercise from canonical library" data-testid="coach-workout-library">
              <LibraryToggle type="button" data-testid="coach-workout-library-close" onClick={closeLibrary}>
                Close exercise library
              </LibraryToggle>
              <NASMExerciseRolodex
                isOpen
                onClose={closeLibrary}
                onSelectExercise={(library) => handleLibrarySelection(library, librarySessionId)}
                persistRecentSelections={persistRecentSelections}
              />
            </LibraryPanel>
          ) : null}
        </>
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
    </DraftForm>
  );
};

export default CoachWorkoutDraft;
