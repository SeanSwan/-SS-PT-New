/**
 * HOOK: useWorkoutPlannerAiEvents
 * PURPOSE: All AI_PLANNER_* CustomEvent wiring for the open Workout Planner —
 * dictated add/swap/remove/update/generate land on the EXISTING state setters
 * (builder rows) and horizon helpers (generated multi-week plans). Mirrors the
 * logger's useWorkoutAiEvents listener/acknowledge shape.
 * RESOLUTION RULES (blueprint 03 §2): case-insensitive whitespace-collapsed
 * includes() on formatted names, exact-first on >1 match, selected Detailed-
 * Schedule day when no week/day given, library exact-first for the incoming
 * movement. Sync failures ack(false); async (library) outcomes ack acceptance
 * sync and report via receipt. Persistence stays human (06-bans §2/§3).
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import {
  AI_PLANNER_ADD_EXERCISE, AI_PLANNER_GENERATE, AI_PLANNER_REMOVE_EXERCISE,
  AI_PLANNER_SWAP_EXERCISE, AI_PLANNER_UPDATE_EXERCISE, type AIWorkoutEventAck,
} from '../../../../utils/aiWorkoutEvents';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { formatWorkoutPlannerExerciseName } from './workoutPlannerExerciseDisplay';
import {
  addHorizonExercise, applyHorizonSwap, isDuplicateInHorizonDay, removeHorizonExercise,
  updateHorizonExerciseFields, type HorizonSwapTarget,
} from './workoutPlannerHorizonSwap.helpers';
import type { GeneratedPlan, GeneratedPlanWeekDay, OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerAddExercisePayload, PlannerHorizonSelection, PlannerRemoveExercisePayload, PlannerSwapExercisePayload, PlannerUpdateExercisePayload } from './workoutPlannerAiEvents.types';

export interface UseWorkoutPlannerAiEventsArgs {
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  selectedHorizonTarget: PlannerHorizonSelection | null;
  searchExercises: (query: string) => Promise<ExerciseSlim[]>;
  onGenerate: () => void;
  pushReceipt: (r: { ok: boolean; text: string }) => void;
  /** Phase defaults for builder-row adds (same derivation as rolodex addExercise). */
  phase: OPTPhaseParams;
}

type HorizonExercise = GeneratedPlanWeekDay['exercises'][number];
type DayScope = Pick<HorizonSwapTarget, 'weekNumber' | 'dayIndex'>;

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
const display = (x: HorizonExercise) => x.exerciseName || x.name || '';
const daySuffix = (t: DayScope) => ` (Week ${t.weekNumber} · Day ${t.dayIndex + 1})`;
const COPY = {
  notFound: (name: string) => `Couldn't find "${name}" — say the exercise name again?`,
  ambiguous: (name: string) => `Multiple matches for "${name}" — say more of the exercise name.`,
  noLibraryMatch: (name: string) => `Couldn't find "${name}" in the exercise library.`,
} as const;
const dupCopy = (name: string, where: 'day' | 'workout') => (where === 'day'
  ? `${name} is already in that day — pick a different replacement.`
  : `${name} is already in this workout — pick a different replacement.`);

type NameMatch = { kind: 'one'; index: number } | { kind: 'none' } | { kind: 'many' };
function matchByName(names: string[], query: string): NameMatch {
  const q = norm(query);
  const hits = names
    .map((name, index) => ({ index, name: norm(formatWorkoutPlannerExerciseName(name)) }))
    .filter((x) => x.name.includes(q));
  if (hits.length === 1) return { kind: 'one', index: hits[0].index };
  if (hits.length === 0) return { kind: 'none' };
  const exact = hits.filter((x) => x.name === q);
  return exact.length === 1 ? { kind: 'one', index: exact[0].index } : { kind: 'many' };
}

const phaseDefaults = (phase: OPTPhaseParams) => {
  const restStr = phase.rest.toLowerCase();
  return {
    sets: parseInt(phase.sets.split('-')[0], 10) || 3,
    reps: phase.reps,
    tempo: phase.tempo,
    restSeconds: restStr.includes('min')
      ? (parseInt(restStr, 10) || 3) * 60
      : parseInt(restStr.replace(/[^0-9]/g, ''), 10) || 60,
    intensityPercent: parseInt(phase.intensity.split('-')[0], 10) || 70,
  };
};

const dayExercisesAt = (plan: GeneratedPlan, scope: DayScope): HorizonExercise[] => {
  const week = plan.weeks?.find((w) => w.weekNumber === scope.weekNumber);
  const days = (week?.days?.length ? week.days : week?.sessions) ?? [];
  return days[scope.dayIndex]?.exercises ?? [];
};

export function useWorkoutPlannerAiEvents(args: UseWorkoutPlannerAiEventsArgs): void {
  const stateRef = useRef(args);
  stateRef.current = args;

  useEffect(() => {
    const ack = (e: Event, handled: boolean) => {
      (e as CustomEvent<AIWorkoutEventAck>).detail?.acknowledgeAIWorkoutEvent?.(handled);
    };
    const resolveSlim = async (name: string): Promise<ExerciseSlim | null> => {
      const results = await stateRef.current.searchExercises(name);
      if (!results.length) return null;
      const q = norm(name);
      return results.find((r) => norm(r.name) === q) ?? results[0];
    };
    /** Selected Detailed-Schedule day (or explicit week/day) — null = builder list. */
    const horizonScope = (payload: { dayNumber?: number; weekNumber?: number }): DayScope | null => {
      const { generatedPlan, selectedHorizonTarget } = stateRef.current;
      if (!generatedPlan?.weeks?.length) return null;
      const fallback = selectedHorizonTarget ?? { weekNumber: generatedPlan.weeks[0].weekNumber, dayIndex: 0 };
      return {
        weekNumber: payload.weekNumber ?? fallback.weekNumber,
        dayIndex: payload.dayNumber ? payload.dayNumber - 1 : fallback.dayIndex,
      };
    };
    /** Match a spoken name in the target scope. Pass the event to ack sync
     *  failures; pass null when re-matching after an await (R1 race fix) —
     *  receipts still report honestly, the ack already happened. */
    const matchInScope = (e: Event | null, name: string, scope: DayScope | null): NameMatch => {
      const s = stateRef.current;
      const names = scope
        ? dayExercisesAt(s.generatedPlan as GeneratedPlan, scope).map(display)
        : s.planExercises.map((p) => p.exerciseSlim.name);
      const match = matchByName(names, name);
      if (match.kind === 'none') { if (e) ack(e, false); s.pushReceipt({ ok: false, text: COPY.notFound(name) }); }
      if (match.kind === 'many') { if (e) ack(e, false); s.pushReceipt({ ok: false, text: COPY.ambiguous(name) }); }
      return match;
    };

    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<PlannerAddExercisePayload>).detail;
      if (!d?.exerciseName) { ack(e, false); return; }
      ack(e, true); // event accepted by the open planner; outcome lands as a receipt
      void (async () => {
        const slim = await resolveSlim(d.exerciseName);
        const s = stateRef.current; // fresh state post-await (R1 race fix)
        if (!slim) { s.pushReceipt({ ok: false, text: COPY.noLibraryMatch(d.exerciseName) }); return; }
        const defs = phaseDefaults(s.phase);
        const sets = d.sets ?? defs.sets;
        const reps = d.reps ?? defs.reps;
        const scope = horizonScope(d);
        if (scope) {
          const probe: HorizonSwapTarget = { kind: 'horizon', ...scope, exerciseIndex: -1, exerciseName: slim.name };
          if (isDuplicateInHorizonDay(s.generatedPlan, probe, slim)) { s.pushReceipt({ ok: false, text: dupCopy(slim.name, 'day') }); return; }
          s.setGeneratedPlan((prev) => (prev ? addHorizonExercise(prev, scope, slim, {
            sets, reps, tempo: d.tempo ?? defs.tempo, restSeconds: d.restSeconds ?? defs.restSeconds,
          }) : prev));
          s.pushReceipt({ ok: true, text: `Added ${slim.name} — ${sets}×${reps}${daySuffix(scope)}` });
          return;
        }
        if (s.planExercises.some((p) => p.exerciseSlim.id === slim.id)) { s.pushReceipt({ ok: false, text: dupCopy(slim.name, 'workout') }); return; }
        s.setPlanExercises((prev) => [...prev, {
          id: `${slim.id}-${Date.now()}`,
          exerciseSlim: slim,
          sets,
          reps: String(reps),
          tempo: d.tempo ?? defs.tempo,
          restSeconds: d.restSeconds ?? defs.restSeconds,
          intensityPercent: defs.intensityPercent,
          notes: '',
        }]);
        s.pushReceipt({ ok: true, text: `Added ${slim.name} — ${sets}×${reps}` });
      })();
    };

    const onSwap = (e: Event) => {
      const d = (e as CustomEvent<PlannerSwapExercisePayload>).detail;
      if (!d?.fromExerciseName || !d?.toExerciseName) { ack(e, false); return; }
      const scope = horizonScope(d);
      if (matchInScope(e, d.fromExerciseName, scope).kind !== 'one') return;
      ack(e, true);
      void (async () => {
        const slim = await resolveSlim(d.toExerciseName);
        const s = stateRef.current; // fresh state post-await (R1 race fix)
        if (!slim) { s.pushReceipt({ ok: false, text: COPY.noLibraryMatch(d.toExerciseName) }); return; }
        // Re-match against fresh state — the plan may have changed mid-search.
        const match = matchInScope(null, d.fromExerciseName, scope);
        if (match.kind !== 'one') return;
        if (scope) {
          const fromRaw = display(dayExercisesAt(s.generatedPlan as GeneratedPlan, scope)[match.index]);
          const target: HorizonSwapTarget = { kind: 'horizon', ...scope, exerciseIndex: match.index, exerciseName: fromRaw };
          if (isDuplicateInHorizonDay(s.generatedPlan, target, slim)) { s.pushReceipt({ ok: false, text: dupCopy(slim.name, 'day') }); return; }
          s.setGeneratedPlan((prev) => (prev ? applyHorizonSwap(prev, target, slim) : prev));
          s.pushReceipt({ ok: true, text: `Swapped ${formatWorkoutPlannerExerciseName(fromRaw)} → ${slim.name}${daySuffix(scope)}` });
          return;
        }
        const row = s.planExercises[match.index];
        if (s.planExercises.some((p) => p.exerciseSlim.id === slim.id && p.id !== row.id)) { s.pushReceipt({ ok: false, text: dupCopy(slim.name, 'workout') }); return; }
        s.setPlanExercises((prev) => prev.map((p) => (p.id === row.id ? { ...p, exerciseSlim: slim } : p)));
        s.pushReceipt({ ok: true, text: `Swapped ${formatWorkoutPlannerExerciseName(row.exerciseSlim.name)} → ${slim.name}` });
      })();
    };

    const onRemove = (e: Event) => {
      const d = (e as CustomEvent<PlannerRemoveExercisePayload>).detail;
      if (!d?.exerciseName) { ack(e, false); return; }
      const s = stateRef.current;
      const scope = horizonScope(d);
      const match = matchInScope(e, d.exerciseName, scope);
      if (match.kind !== 'one') return;
      ack(e, true);
      if (scope) {
        const fromRaw = display(dayExercisesAt(s.generatedPlan as GeneratedPlan, scope)[match.index]);
        const target: HorizonSwapTarget = { kind: 'horizon', ...scope, exerciseIndex: match.index, exerciseName: fromRaw };
        s.setGeneratedPlan((prev) => (prev ? removeHorizonExercise(prev, target) : prev));
        s.pushReceipt({ ok: true, text: `Removed ${formatWorkoutPlannerExerciseName(fromRaw)}${daySuffix(scope)}` });
        return;
      }
      const row = s.planExercises[match.index];
      s.setPlanExercises((prev) => prev.filter((p) => p.id !== row.id));
      s.pushReceipt({ ok: true, text: `Removed ${formatWorkoutPlannerExerciseName(row.exerciseSlim.name)}` });
    };

    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent<PlannerUpdateExercisePayload>).detail;
      if (!d?.exerciseName) { ack(e, false); return; }
      const s = stateRef.current;
      const changes = ([['sets', d.sets], ['reps', d.reps], ['tempo', d.tempo], ['rest', d.restSeconds]] as Array<[string, string | number | undefined]>)
        .filter((entry): entry is [string, string | number] => entry[1] !== undefined);
      if (!changes.length) { ack(e, false); s.pushReceipt({ ok: false, text: `Nothing to change on "${d.exerciseName}" — say sets, reps, tempo, or rest.` }); return; }
      const scope = horizonScope({}); // update payload carries no day/week (03 §2) — selected day rules
      const match = matchInScope(e, d.exerciseName, scope);
      if (match.kind !== 'one') return;
      ack(e, true);
      const summary = changes.map(([field, value]) => `${field} ${value}`).join(', ');
      if (scope) {
        const fromRaw = display(dayExercisesAt(s.generatedPlan as GeneratedPlan, scope)[match.index]);
        const target: HorizonSwapTarget = { kind: 'horizon', ...scope, exerciseIndex: match.index, exerciseName: fromRaw };
        s.setGeneratedPlan((prev) => (prev ? updateHorizonExerciseFields(prev, target, d) : prev));
        s.pushReceipt({ ok: true, text: `Updated ${formatWorkoutPlannerExerciseName(fromRaw)} — ${summary}${daySuffix(scope)}` });
        return;
      }
      const row = s.planExercises[match.index];
      s.setPlanExercises((prev) => prev.map((p) => (p.id === row.id ? {
        ...p,
        ...(d.sets !== undefined ? { sets: d.sets } : {}),
        ...(d.reps !== undefined ? { reps: String(d.reps) } : {}),
        ...(d.tempo !== undefined ? { tempo: d.tempo } : {}),
        ...(d.restSeconds !== undefined ? { restSeconds: d.restSeconds } : {}),
      } : p)));
      s.pushReceipt({ ok: true, text: `Updated ${formatWorkoutPlannerExerciseName(row.exerciseSlim.name)} — ${summary}` });
    };

    const onGenerate = (e: Event) => {
      ack(e, true);
      stateRef.current.pushReceipt({ ok: true, text: 'Generating a fresh workout…' });
      stateRef.current.onGenerate();
    };

    window.addEventListener(AI_PLANNER_ADD_EXERCISE, onAdd);
    window.addEventListener(AI_PLANNER_SWAP_EXERCISE, onSwap);
    window.addEventListener(AI_PLANNER_REMOVE_EXERCISE, onRemove);
    window.addEventListener(AI_PLANNER_UPDATE_EXERCISE, onUpdate);
    window.addEventListener(AI_PLANNER_GENERATE, onGenerate);
    return () => {
      window.removeEventListener(AI_PLANNER_ADD_EXERCISE, onAdd);
      window.removeEventListener(AI_PLANNER_SWAP_EXERCISE, onSwap);
      window.removeEventListener(AI_PLANNER_REMOVE_EXERCISE, onRemove);
      window.removeEventListener(AI_PLANNER_UPDATE_EXERCISE, onUpdate);
      window.removeEventListener(AI_PLANNER_GENERATE, onGenerate);
    };
  }, []);
}
