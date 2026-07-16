/**
 * HOOK: useWorkoutPlannerSequenceEvents
 * PURPOSE: AI_PLANNER_REARRANGE / AI_PLANNER_UNDO wiring for the open Workout
 * Planner. The deterministic sequence engine proposes an order; this hook
 * applies it to the correct scope (builder rows, or the selected generated-
 * plan day), pushes a compact actionable receipt with a one-tap Undo, and
 * guards a ONE-LEVEL undo that expires the moment any later edit touches the
 * rearranged list (reference fencing — no stale overwrite is possible).
 * Persistence stays human-triggered (blueprint 06-bans §2/§3); this hook only
 * mutates local draft state, matching the canonical-training-plan rule that
 * AI drafts and only an explicit authorized action mutates a saved plan.
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import {
  AI_PLANNER_REARRANGE, AI_PLANNER_UNDO, type AIWorkoutEventAck,
} from '../../../../utils/aiWorkoutEvents';
import type { CoachDockReceiptInput } from './useWorkoutPlannerCoachDock';
import {
  buildBuilderSequenceProposal, buildHorizonSequenceProposal,
  type HorizonExerciseRow, type SequenceMove,
} from './workoutPlannerSequenceEngine';
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerHorizonSelection } from './workoutPlannerAiEvents.types';

export interface UseWorkoutPlannerSequenceEventsArgs {
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  selectedHorizonTarget: PlannerHorizonSelection | null;
  phaseNumber: number;
  pushReceipt: (r: CoachDockReceiptInput) => void;
}

type DayScope = PlannerHorizonSelection;

type UndoState =
  | { kind: 'builder'; before: PlanExercise[]; after: PlanExercise[] }
  | { kind: 'horizon'; scope: DayScope; before: HorizonExerciseRow[]; after: HorizonExerciseRow[] };

const COPY = {
  tooFew: 'Add at least two exercises before asking Swan Coach to rearrange them.',
  tooFewDay: 'That day needs at least two exercises before Swan Coach can rearrange it.',
  alreadyOptimal: "Already in Swan Coach's recommended order - no changes made.",
  undone: 'Rearrangement undone.',
  undoExpired: 'Undo expired because the workout changed after rearranging.',
  nothingToUndo: 'Nothing to undo yet.',
} as const;

const dayExercisesAt = (plan: GeneratedPlan | null, scope: DayScope): HorizonExerciseRow[] => {
  const week = plan?.weeks?.find((w) => w.weekNumber === scope.weekNumber);
  const days = (week?.days?.length ? week.days : week?.sessions) ?? [];
  return days[scope.dayIndex]?.exercises ?? [];
};

const replaceDayExercises = (
  plan: GeneratedPlan, scope: DayScope, exercises: HorizonExerciseRow[],
): GeneratedPlan => ({
  ...plan,
  weeks: plan.weeks?.map((week) => {
    if (week.weekNumber !== scope.weekNumber) return week;
    const useDays = Boolean(week.days?.length);
    const source = (useDays ? week.days : week.sessions) ?? [];
    const nextDays = source.map((day, index) => (index === scope.dayIndex ? { ...day, exercises } : day));
    return useDays ? { ...week, days: nextDays } : { ...week, sessions: nextDays };
  }),
});

/** Undo is valid only while the list still holds exactly the applied refs. */
const sameRefs = <T,>(current: readonly T[], applied: readonly T[]): boolean => (
  current.length === applied.length && current.every((item, index) => item === applied[index])
);

const movesSummary = (moves: SequenceMove[]): string => {
  const shown = moves.slice(0, 3)
    .map((move) => `${move.name} #${move.from}→#${move.to}`)
    .join(', ');
  return moves.length > 3 ? `${shown}, +${moves.length - 3} more` : shown;
};

export function useWorkoutPlannerSequenceEvents(args: UseWorkoutPlannerSequenceEventsArgs): void {
  const stateRef = useRef(args);
  stateRef.current = args;
  const undoRef = useRef<UndoState | null>(null);

  useEffect(() => {
    const ack = (e: Event, handled: boolean) => {
      (e as CustomEvent<AIWorkoutEventAck>).detail?.acknowledgeAIWorkoutEvent?.(handled);
    };

    const onRearrange = (e: Event) => {
      const s = stateRef.current;
      const scope: DayScope | null = s.generatedPlan?.weeks?.length
        ? (s.selectedHorizonTarget ?? { weekNumber: s.generatedPlan.weeks[0].weekNumber, dayIndex: 0 })
        : null;

      if (scope) {
        const current = dayExercisesAt(s.generatedPlan, scope);
        if (current.length < 2) { ack(e, false); s.pushReceipt({ ok: false, text: COPY.tooFewDay }); return; }
        const proposal = buildHorizonSequenceProposal(current, s.phaseNumber);
        if (!proposal.changed) { ack(e, true); s.pushReceipt({ ok: true, text: COPY.alreadyOptimal }); return; }
        undoRef.current = { kind: 'horizon', scope, before: current, after: proposal.items };
        s.setGeneratedPlan((prev) => (prev ? replaceDayExercises(prev, scope, proposal.items) : prev));
        ack(e, true);
        s.pushReceipt({
          ok: true,
          text: `Reordered ${proposal.moves.length} exercises (Week ${scope.weekNumber} · Day ${scope.dayIndex + 1}) — ${movesSummary(proposal.moves)}`,
          action: { label: 'Undo', eventName: AI_PLANNER_UNDO, payload: {} },
        });
        return;
      }

      if (s.planExercises.length < 2) { ack(e, false); s.pushReceipt({ ok: false, text: COPY.tooFew }); return; }
      const sequencedRows = s.planExercises;
      const proposal = buildBuilderSequenceProposal(sequencedRows, s.phaseNumber);
      if (!proposal.changed) { ack(e, true); s.pushReceipt({ ok: true, text: COPY.alreadyOptimal }); return; }
      undoRef.current = { kind: 'builder', before: sequencedRows, after: proposal.items };
      // Identity-guarded: if a same-tick update slipped in, keep it — the undo
      // fence then expires honestly instead of clobbering the newer draft.
      s.setPlanExercises((prev) => (prev === sequencedRows ? proposal.items : prev));
      ack(e, true);
      s.pushReceipt({
        ok: true,
        text: `Reordered ${proposal.moves.length} exercises — ${movesSummary(proposal.moves)}`,
        action: { label: 'Undo', eventName: AI_PLANNER_UNDO, payload: {} },
      });
    };

    const onUndo = (e: Event) => {
      const s = stateRef.current;
      const undo = undoRef.current;
      if (!undo) { ack(e, false); s.pushReceipt({ ok: false, text: COPY.nothingToUndo }); return; }

      const current = undo.kind === 'builder'
        ? s.planExercises
        : dayExercisesAt(s.generatedPlan, undo.scope);
      if (!sameRefs(current, undo.after)) {
        undoRef.current = null;
        ack(e, false);
        s.pushReceipt({ ok: false, text: COPY.undoExpired });
        return;
      }

      if (undo.kind === 'builder') {
        const { before, after } = undo;
        s.setPlanExercises((prev) => (sameRefs(prev, after) ? before : prev));
      } else {
        const { scope, before } = undo;
        s.setGeneratedPlan((prev) => (prev ? replaceDayExercises(prev, scope, before) : prev));
      }
      undoRef.current = null;
      ack(e, true);
      s.pushReceipt({ ok: true, text: COPY.undone });
    };

    window.addEventListener(AI_PLANNER_REARRANGE, onRearrange);
    window.addEventListener(AI_PLANNER_UNDO, onUndo);
    return () => {
      window.removeEventListener(AI_PLANNER_REARRANGE, onRearrange);
      window.removeEventListener(AI_PLANNER_UNDO, onUndo);
    };
  }, []);
}
