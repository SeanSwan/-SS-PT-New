/**
 * FILE: useFloorSession.ts
 * PURPOSE: Floor mode's live session for ONE client on ONE day: the planned
 * exercises (the Plan Reveal read, useSessionPlannedWorkout), the sets the coach
 * saves between reps, and the single save at the end (floorSave.ts).
 *
 * - Sets live on this device until the coach ends the session (sessionStorage,
 *   keyed by actor + client, carrying the day, the booked session it completes
 *   and the plan day it was seeded from), so a refresh, a detour or midnight
 *   never loses them or their billing identity.
 * - Ending saves through the Workout Logger's own payload builder and service.
 *   While that save is out, sets can still be saved (they go in the next save)
 *   but Undo is frozen — a set already on its way cannot be taken back.
 *   Nothing is cleared unless the server said saved, and then only what was sent.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionPlannedWorkout } from '../../../UniversalMasterSchedule/useSessionPlannedWorkout';
import {
  type FloorExercise, type FloorLink, type FloorPlanDay, type FloorSet, floorStorageKey, localDateISO, loggedSetCount,
  nextReps, nextWeight, parseSetScheme, reconcileAfterSave,
} from './floorSession';
import {
  beginFloorSave, inflightFloorSave, markFloorSaveSeen, takeUnseenFloorSave, type FloorSaveResult, type FloorSaveTransaction,
} from './floorSave';

export type FloorSaveState =
  | { phase: 'idle' } | { phase: 'saving' } | { phase: 'saved'; message: string }
  | { phase: 'conflict'; message: string } | { phase: 'failed'; message: string };

type Stored = { day: string; exercises: FloorExercise[]; index: number; link?: FloorLink | null; planDay?: FloorPlanDay | null };

function readStored(key: string | null): Stored | null {
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    return parsed && Array.isArray(parsed.exercises) && typeof parsed.day === 'string' ? parsed : null;
  } catch { return null; }
}

function writeStored(key: string | null, value: Stored) {
  if (!key) return;
  try {
    if (loggedSetCount(value.exercises) > 0) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch { /* storage refused: the session still works in memory */ }
}

const seedTarget = (reps: number | null) => (reps && reps <= 50 ? reps : null);

/**
 * ONE mount per client: FloorView keys the live session by client id, so a client
 * switch remounts this hook (and the plan read) instead of racing the previous
 * client's plan into the new client's list. Stored sets keep their own day and
 * booked session. A link from Today's session card applies to a fresh list, or
 * to unbooked sets from that same day (tapping the booking attaches it); a link
 * for another day is stale and ignored.
 */
export function useFloorSession(actorKey: string | null, clientId: number | null, incomingLink: FloorLink | null = null) {
  const key = actorKey && clientId ? floorStorageKey(actorKey, clientId) : null;
  const [initial] = useState(() => readStored(key));
  const [fresh] = useState(() => (incomingLink && incomingLink.date === localDateISO() ? incomingLink : null));
  const [link, setLink] = useState<FloorLink | null>(() => {
    if (!initial) return fresh;
    return initial.link ?? (fresh && fresh.date === initial.day ? fresh : null);
  });
  const [day, setDay] = useState(() => initial?.day ?? fresh?.date ?? localDateISO());
  const [planDay, setPlanDay] = useState<FloorPlanDay | null>(() => initial?.planDay ?? null);
  const plan = useSessionPlannedWorkout(clientId, clientId ? day : null);
  const [exercises, setExercises] = useState<FloorExercise[]>(() => initial?.exercises ?? []);
  const [index, setIndex] = useState(() => initial?.index ?? 0);
  const [draft, setDraft] = useState<FloorSet>({ weight: 0, reps: 0 });
  const [save, setSave] = useState<FloorSaveState>(() => (inflightFloorSave(key) ? { phase: 'saving' } : { phase: 'idle' }));
  const seeded = useRef(Boolean(initial));
  const latest = useRef(exercises);
  latest.current = exercises;
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  // The day's plan seeds the list once, and only when nothing has been logged yet.
  useEffect(() => {
    if (plan.status !== 'ready' || seeded.current) return;
    seeded.current = true;
    if (loggedSetCount(latest.current) > 0) return;
    setPlanDay(plan.weekNumber && plan.dayNumber ? { weekNumber: plan.weekNumber, dayNumber: plan.dayNumber } : null);
    setExercises(plan.exercises.map((exercise) => {
      const target = parseSetScheme(exercise.setScheme);
      return { name: exercise.name, targetSets: target.sets, targetReps: seedTarget(target.reps), sets: [] };
    }));
  }, [plan]);

  useEffect(() => { writeStored(key, { day, exercises, index, link, planDay }); }, [day, exercises, index, key, link, planDay]);

  const current = exercises[index] ?? null;
  // Moving to an exercise starts from its last set, else its target reps.
  useEffect(() => {
    const last = current?.sets[current.sets.length - 1];
    setDraft(last ? { ...last } : { weight: 0, reps: current?.targetReps ?? 0 });
  }, [index, current?.name]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when the exercise changes

  /** The save's answer, applied ONCE to whichever Floor is mounted when it arrives (possibly a remount). */
  const applied = useRef(new WeakSet<FloorSaveTransaction>());
  const settle = useCallback((result: FloorSaveResult, transaction: FloorSaveTransaction) => {
    if (!live.current || applied.current.has(transaction)) return;
    applied.current.add(transaction);
    markFloorSaveSeen(key);
    if (result.kind === 'saved') {
      setExercises((list) => reconcileAfterSave(list, transaction.sent));
      setDay(localDateISO()); // anything logged after this save belongs to today, unlinked
      setLink(null);
      setPlanDay(null);
    }
    setSave({ phase: result.kind, message: result.message });
  }, [key]);

  // A save started before this mount (a view switch mid-save) still reports here; one that
  // already finished while Floor was off screen shows its outcome (its sets were settled in storage).
  useEffect(() => {
    const transaction = inflightFloorSave(key);
    if (!transaction) {
      const result = takeUnseenFloorSave(key);
      if (result) setSave({ phase: result.kind, message: result.message });
      return undefined;
    }
    let cancelled = false;
    void transaction.done.then((result) => { if (!cancelled) settle(result, transaction); });
    return () => { cancelled = true; };
  }, [key, settle]);

  const adjust = useCallback((field: 'weight' | 'reps', delta: number) => {
    setDraft((value) => (field === 'weight' ? { ...value, weight: nextWeight(value.weight, delta) } : { ...value, reps: nextReps(value.reps, delta) }));
  }, []);

  const saveSet = useCallback(() => {
    if (!current || draft.reps < 1) return;
    setExercises((list) => list.map((exercise, i) => (i === index ? { ...exercise, sets: [...exercise.sets, { ...draft }] } : exercise)));
    // A new set clears a finished outcome, never an in-flight save (that stays the owner).
    setSave((state) => (state.phase === 'saving' ? state : { phase: 'idle' }));
  }, [current, draft, index]);

  const undoLastSet = useCallback(() => {
    if (inflightFloorSave(key)) return; // a set on its way to the server cannot be taken back here
    setExercises((list) => list.map((exercise, i) => (i === index ? { ...exercise, sets: exercise.sets.slice(0, -1) } : exercise)));
  }, [index, key]);

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
    if (!key || !clientId || loggedSetCount(exercises) === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSave({ phase: 'failed', message: 'You are offline. The sets stay on this device — save again when you are back online.' });
      return;
    }
    const transaction = beginFloorSave({ key, clientId, day, exercises, link, planDay });
    if (!transaction) return; // already saving: the synchronous guard
    setSave({ phase: 'saving' });
    const result = await transaction.done;
    settle(result, transaction);
  }, [clientId, day, exercises, key, link, planDay, settle]);

  return {
    day, link, plan, exercises, index, current, draft, setDraft, adjust, saveSet, undoLastSet, addExercise, goTo,
    endAndSave, save, loggedSets: loggedSetCount(exercises),
  };
}

export type FloorSession = ReturnType<typeof useFloorSession>;
