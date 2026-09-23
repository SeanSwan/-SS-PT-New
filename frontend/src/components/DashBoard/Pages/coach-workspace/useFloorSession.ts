/**
 * FILE: useFloorSession.ts
 * PURPOSE: Floor mode's live session for ONE client on ONE day: today's planned
 * exercises (the Plan Reveal read, useSessionPlannedWorkout), the sets the coach
 * saves between reps, and the single save at the end.
 *
 * - Sets live on this device until the coach ends the session (sessionStorage,
 *   keyed by actor + client + day), so a refresh or a detour never loses them.
 * - Ending saves through the Workout Logger's own payload builder and service
 *   (POST /api/workout-forms). Every outcome is told truthfully: saved; a workout
 *   already owns today (sets kept, open it in the logger); offline or failed
 *   (sets kept, try again). Nothing is cleared unless the server said saved.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dailyWorkoutFormService } from '../../../../services/nasmApiService';
import { buildWorkoutFormSubmitBody } from '../../../WorkoutLogger/workoutLoggerSubmitPayload';
import { dispatchWorkoutLogged } from '../../../../utils/workoutLoggedEvent';
import { useSessionPlannedWorkout } from '../../../UniversalMasterSchedule/useSessionPlannedWorkout';
import {
  type FloorExercise, type FloorSet, floorExerciseEntries, floorStorageKey, localDateISO, loggedSetCount,
  nextReps, nextWeight, parseSetScheme,
} from './floorSession';

export type FloorSaveState =
  | { phase: 'idle' } | { phase: 'saving' } | { phase: 'saved' }
  | { phase: 'conflict'; message: string } | { phase: 'failed'; message: string };

type Stored = { exercises: FloorExercise[]; index: number };

function readStored(key: string | null): Stored | null {
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    return parsed && Array.isArray(parsed.exercises) ? parsed : null;
  } catch { return null; }
}

function writeStored(key: string | null, value: Stored | null) {
  if (!key) return;
  try {
    if (value && loggedSetCount(value.exercises) > 0) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch { /* storage refused: the session still works in memory */ }
}

export function useFloorSession(actorKey: string | null, clientId: number | null) {
  const day = useMemo(() => localDateISO(), []);
  const key = actorKey && clientId ? floorStorageKey(actorKey, clientId, day) : null;
  const plan = useSessionPlannedWorkout(clientId, clientId ? day : null);
  const [exercises, setExercises] = useState<FloorExercise[]>(() => readStored(key)?.exercises ?? []);
  const [index, setIndex] = useState(() => readStored(key)?.index ?? 0);
  const [draft, setDraft] = useState<FloorSet>({ weight: 0, reps: 0 });
  const [save, setSave] = useState<FloorSaveState>({ phase: 'idle' });
  const seededFrom = useRef<string | null>(null);

  // A different client or day starts from THAT session's stored sets, never this one's.
  useEffect(() => {
    const stored = readStored(key);
    setExercises(stored?.exercises ?? []);
    setIndex(stored?.index ?? 0);
    setSave({ phase: 'idle' });
    seededFrom.current = stored ? key : null;
  }, [key]);

  // Today's plan seeds the list once, and only when nothing has been logged yet.
  useEffect(() => {
    if (plan.status !== 'ready' || seededFrom.current === key) return;
    seededFrom.current = key;
    setExercises((current) => (loggedSetCount(current) > 0 ? current : plan.exercises.map((exercise) => {
      const target = parseSetScheme(exercise.setScheme);
      return { name: exercise.name, targetSets: target.sets, targetReps: target.reps, sets: [] };
    })));
  }, [key, plan]);

  useEffect(() => { writeStored(key, { exercises, index }); }, [exercises, index, key]);

  const current = exercises[index] ?? null;
  // Moving to an exercise starts from its last set, else its target reps.
  useEffect(() => {
    const last = current?.sets[current.sets.length - 1];
    setDraft(last ? { ...last } : { weight: 0, reps: current?.targetReps ?? 0 });
  }, [index, current?.name]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when the exercise changes

  const adjust = useCallback((field: 'weight' | 'reps', delta: number) => {
    setDraft((value) => (field === 'weight' ? { ...value, weight: nextWeight(value.weight, delta) } : { ...value, reps: nextReps(value.reps, delta) }));
  }, []);

  const saveSet = useCallback(() => {
    if (!current || draft.reps < 1) return;
    setExercises((list) => list.map((exercise, i) => (i === index ? { ...exercise, sets: [...exercise.sets, { ...draft }] } : exercise)));
    setSave({ phase: 'idle' });
  }, [current, draft, index]);

  const undoLastSet = useCallback(() => {
    setExercises((list) => list.map((exercise, i) => (i === index ? { ...exercise, sets: exercise.sets.slice(0, -1) } : exercise)));
  }, [index]);

  const addExercise = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setExercises((list) => [...list, { name: clean, targetSets: null, targetReps: null, sets: [] }]);
    setIndex(exercises.length);
  }, [exercises.length]);

  const goTo = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(next, Math.max(exercises.length - 1, 0))));
  }, [exercises.length]);

  const endAndSave = useCallback(async () => {
    const entries = floorExerciseEntries(exercises);
    if (!clientId || !entries.length || save.phase === 'saving') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSave({ phase: 'failed', message: 'You are offline. The sets stay on this device — save again when you are back online.' });
      return;
    }
    setSave({ phase: 'saving' });
    try {
      const body = buildWorkoutFormSubmitBody({ clientId, date: day, exercises: entries, sessionNotes: 'Logged in Swan Coach Floor mode.', overallIntensity: null });
      const response = await dailyWorkoutFormService.submitWorkoutForm(body);
      if (response.success && response.data) {
        dispatchWorkoutLogged({ clientId, formId: response.data.id ?? null, date: day });
        writeStored(key, null);
        setExercises((list) => list.map((exercise) => ({ ...exercise, sets: [] })));
        setSave({ phase: 'saved' });
      } else if (response.data?.id || (response.data as { formId?: unknown } | undefined)?.formId) {
        setSave({ phase: 'conflict', message: response.message || 'A workout is already saved for today. Your sets are kept here — add them in the workout logger.' });
      } else {
        setSave({ phase: 'failed', message: response.message || 'The workout was not saved. Your sets are kept here — try again.' });
      }
    } catch {
      setSave({ phase: 'failed', message: 'The workout was not saved. Your sets are kept here — try again.' });
    }
  }, [clientId, day, exercises, key, save.phase]);

  return {
    day, plan, exercises, index, current, draft, setDraft, adjust, saveSet, undoLastSet, addExercise, goTo,
    endAndSave, save, loggedSets: loggedSetCount(exercises),
  };
}

export type FloorSession = ReturnType<typeof useFloorSession>;
