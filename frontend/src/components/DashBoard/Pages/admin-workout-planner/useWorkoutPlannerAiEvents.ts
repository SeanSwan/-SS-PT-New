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
 * P58: ADD/SWAP capture an immutable scope+revision token BEFORE the lookup,
 * recheck it after every await and inside the owner's synchronous mutation, and
 * publish Added/Swapped only for a result the owner actually applied.
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
  removeHorizonExercise, updateHorizonExerciseFields, type HorizonSwapTarget,
} from './workoutPlannerHorizonSwap.helpers';
import type { GeneratedPlan, OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerAddExercisePayload, PlannerGeneratePayload, PlannerHorizonSelection, PlannerRemoveExercisePayload, PlannerSwapExercisePayload, PlannerUpdateExercisePayload } from './workoutPlannerAiEvents.types';
import {
  normalizePlannerGeneratePayload, plannerGenerateReceiptText, type PlannerGenerateOverrides,
} from './workoutPlannerGenerateIntent';
import {
  isPlannerAsyncEditToken, type PlannerAsyncEditToken, type PlannerDraftOwner,
} from './plannerContexts/useWorkoutPlannerDraftMutation';
import {
  addTransition, dayExercisesAt, display, pickSlim, publishEdit, swapTransition,
  type DayScope, type EditOutcome, type EditProgramming,
} from './workoutPlannerAsyncEditReceiver';

export interface UseWorkoutPlannerAiEventsArgs {
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  selectedHorizonTarget: PlannerHorizonSelection | null;
  searchExercises: (query: string) => Promise<ExerciseSlim[]>;
  onGenerate: (overrides?: PlannerGenerateOverrides) => void;
  pushReceipt: (r: { ok: boolean; text: string }) => void;
  /** Phase defaults for builder-row adds (same derivation as rolodex addExercise). */
  phase: OPTPhaseParams;
  /** P58: the one Planner draft authority this receiver is bound to. */
  draftMutation: PlannerDraftOwner;
}

/** Local deadline for one accepted add/swap lookup (plan 58 §5). */
const LOOKUP_DEADLINE_MS = 5000;
const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
/** Dictated plurals → singular per word; never bare double-s words ("press"). */
const singularize = (v: string) => v.replace(/([a-rt-z])s\b/gi, '$1');
const daySuffix = (t: DayScope) => ` (Week ${t.weekNumber} · Day ${t.dayIndex + 1})`;
const scopeOf = (day: import('./plannerContexts/useWorkoutPlannerDraftMutation').PlannerDayScope): DayScope | null => (
  day.kind === 'horizon' ? { weekNumber: day.weekNumber, dayIndex: day.dayIndex } : null
);
const COPY = {
  notFound: (name: string) => `Couldn't find "${name}" — say the exercise name again?`,
  ambiguous: (name: string) => `Multiple matches for "${name}" — say more of the exercise name.`,
  noLibraryMatch: (name: string) => `Couldn't find "${name}" in the exercise library.`,
  lookupFailed: 'The exercise library lookup failed — try again.',
  lookupTimeout: 'The exercise library lookup took too long — try again.',
} as const;
const dupCopy = (name: string, where: 'day' | 'workout') => (where === 'day'
  ? `${name} is already in that day — pick a different replacement.`
  : `${name} is already in this workout — pick a different replacement.`);

type NameMatch = { kind: 'one'; index: number } | { kind: 'none' } | { kind: 'many' };
function matchByName(names: string[], query: string): NameMatch {
  const attempt = (q: string): NameMatch => {
    const hits = names
      .map((name, index) => ({ index, name: norm(formatWorkoutPlannerExerciseName(name)) }))
      .filter((x) => x.name.includes(q));
    if (hits.length === 1) return { kind: 'one', index: hits[0].index };
    if (hits.length === 0) return { kind: 'none' };
    const exact = hits.filter((x) => x.name === q);
    return exact.length === 1 ? { kind: 'one', index: exact[0].index } : { kind: 'many' };
  };
  const first = attempt(norm(query));
  // Plural miss only — an ambiguous plural stays ambiguous (honest receipt).
  if (first.kind !== 'none') return first;
  const singular = norm(singularize(query));
  return singular !== norm(query) ? attempt(singular) : first;
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

/** The LIVE names an operation must match inside its captured scope. */
const namesInScope = (
  planExercises: PlanExercise[], generatedPlan: GeneratedPlan | null, scope: DayScope | null,
): string[] => (scope
  ? dayExercisesAt(generatedPlan, scope).map(display)
  : planExercises.map((p) => p.exerciseSlim.name));

export function useWorkoutPlannerAiEvents(args: UseWorkoutPlannerAiEventsArgs): void {
  const stateRef = useRef(args);
  stateRef.current = args;

  useEffect(() => {
    const ack = (e: Event, handled: boolean) => {
      (e as CustomEvent<AIWorkoutEventAck>).detail?.acknowledgeAIWorkoutEvent?.(handled);
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
    const matchInScope = (e: Event | null, name: string, names: string[]): NameMatch => {
      const match = matchByName(names, name);
      if (match.kind === 'none') { if (e) ack(e, false); stateRef.current.pushReceipt({ ok: false, text: COPY.notFound(name) }); }
      if (match.kind === 'many') { if (e) ack(e, false); stateRef.current.pushReceipt({ ok: false, text: COPY.ambiguous(name) }); }
      return match;
    };
    const captureOptions = {
      deadlineMs: LOOKUP_DEADLINE_MS,
      onDeadline: () => stateRef.current.pushReceipt({ ok: false, text: COPY.lookupTimeout }),
    };
    /** One accepted lookup: recheck the token after EVERY await. */
    const runAcceptedEdit = (
      token: PlannerAsyncEditToken, lookupName: string, settle: (slim: ExerciseSlim) => EditOutcome | null,
    ) => {
      void (async () => {
        const s = () => stateRef.current;
        try {
          const singular = singularize(lookupName);
          // Dictated speech uses plurals ("goblet squats") but the library stores
          // singular names, and a longer query can't fuzzy-match a shorter target.
          let results = await s().searchExercises(lookupName);
          if (s().draftMutation.livenessOf(token) === 'scope_stale') return; // retired: silent
          if (!results.length && singular !== lookupName) {
            results = await s().searchExercises(singular);
            if (s().draftMutation.livenessOf(token) === 'scope_stale') return;
          }
          const slim = pickSlim(results, lookupName, singular);
          if (!slim) { s().pushReceipt({ ok: false, text: COPY.noLibraryMatch(lookupName) }); return; }
          const outcome = settle(slim);
          if (outcome) publishEdit(s(), token, outcome);
        } catch {
          if (s().draftMutation.livenessOf(token) !== 'scope_stale') {
            s().pushReceipt({ ok: false, text: COPY.lookupFailed });
          }
        }
      })();
    };

    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<PlannerAddExercisePayload>).detail;
      if (!d?.exerciseName) { ack(e, false); return; }
      const s = stateRef.current;
      const token = s.draftMutation.capture({ kind: 'add', weekNumber: d.weekNumber, dayNumber: d.dayNumber }, captureOptions);
      if (!isPlannerAsyncEditToken(token)) { ack(e, false); return; }
      // Phase defaults are captured BEFORE the await and pinned to this token.
      const defs = phaseDefaults(s.phase);
      const programming: EditProgramming = {
        sets: d.sets ?? defs.sets, reps: d.reps ?? defs.reps, tempo: d.tempo ?? defs.tempo,
        restSeconds: d.restSeconds ?? defs.restSeconds, intensityPercent: defs.intensityPercent,
      };
      const day = token.day;
      const where = day.kind === 'horizon' ? 'day' : 'workout';
      ack(e, true); // event accepted by the open planner; outcome lands as a receipt
      runAcceptedEdit(token, d.exerciseName, (slim) => ({
        result: stateRef.current.draftMutation.tryApply(token, addTransition(day, slim, programming)),
        applied: `Added ${slim.name} — ${programming.sets}×${programming.reps}${day.kind === 'horizon' ? daySuffix(day) : ''}`,
        duplicate: dupCopy(slim.name, where),
      }));
    };

    const onSwap = (e: Event) => {
      const d = (e as CustomEvent<PlannerSwapExercisePayload>).detail;
      if (!d?.fromExerciseName || !d?.toExerciseName) { ack(e, false); return; }
      const s = stateRef.current;
      const token = s.draftMutation.capture({ kind: 'swap', weekNumber: d.weekNumber, dayNumber: d.dayNumber }, captureOptions);
      if (!isPlannerAsyncEditToken(token)) { ack(e, false); return; }
      const scope = scopeOf(token.day);
      if (matchInScope(e, d.fromExerciseName, namesInScope(s.planExercises, s.generatedPlan, scope)).kind !== 'one') {
        s.draftMutation.retire();
        return;
      }
      ack(e, true);
      runAcceptedEdit(token, d.toExerciseName, (slim) => {
        // Re-match against the current draft — the plan may have changed mid-search.
        const live = stateRef.current.draftMutation.snapshot();
        const match = matchInScope(null, d.fromExerciseName, namesInScope(live.planExercises, live.generatedPlan, scope));
        if (match.kind !== 'one') return null;
        const fromRaw = scope ? display(dayExercisesAt(live.generatedPlan, scope)[match.index]) : '';
        const fromName = scope ? fromRaw : live.planExercises[match.index]?.exerciseSlim.name ?? '';
        return {
          result: stateRef.current.draftMutation.tryApply(token, swapTransition(scope, slim, match.index, fromRaw)),
          applied: `Swapped ${formatWorkoutPlannerExerciseName(fromName)} → ${slim.name}${scope ? daySuffix(scope) : ''}`,
          duplicate: dupCopy(slim.name, scope ? 'day' : 'workout'),
        };
      });
    };

    const onRemove = (e: Event) => {
      const d = (e as CustomEvent<PlannerRemoveExercisePayload>).detail;
      if (!d?.exerciseName) { ack(e, false); return; }
      const s = stateRef.current;
      const scope = horizonScope(d);
      const match = matchInScope(e, d.exerciseName, namesInScope(s.planExercises, s.generatedPlan, scope));
      if (match.kind !== 'one') return;
      ack(e, true);
      if (scope) {
        const fromRaw = display(dayExercisesAt(s.generatedPlan, scope)[match.index]);
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
      const match = matchInScope(e, d.exerciseName, namesInScope(s.planExercises, s.generatedPlan, scope));
      if (match.kind !== 'one') return;
      ack(e, true);
      const summary = changes.map(([field, value]) => `${field} ${value}`).join(', ');
      if (scope) {
        const fromRaw = display(dayExercisesAt(s.generatedPlan, scope)[match.index]);
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
      // H4 fix: honor spoken detail — "give me a leg day for hypertrophy"
      // generates exactly that. Unrecognized detail is dropped, not guessed.
      const overrides = normalizePlannerGeneratePayload((e as CustomEvent<PlannerGeneratePayload>).detail);
      stateRef.current.pushReceipt({ ok: true, text: plannerGenerateReceiptText(overrides) });
      stateRef.current.onGenerate(overrides);
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
      // P58: cleanup retires accepted work, not only the listeners.
      stateRef.current.draftMutation.retire();
    };
  }, []);
}
