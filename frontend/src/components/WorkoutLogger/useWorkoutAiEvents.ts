/**
 * HOOK: useWorkoutAiEvents
 * Parent: WorkoutLogger (decomposition slice D1 — AI-events cluster).
 * PURPOSE: All Swan Coach → logger event wiring in one place: the
 * APPLY_WORKOUT plan transfer listener, the pending-plan drain on mount,
 * the AI_* command listeners (load template / add exercise / update set /
 * toggle NASM item), and the voice-memo import handler. Extracted verbatim
 * from WorkoutLogger.tsx — behavior, deps, and the deliberate
 * exhaustive-deps exclusions are unchanged.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import type { ExerciseEntry } from '../../services/nasmApiService';
import {
  APPLY_WORKOUT_EVENT,
  drainPendingWorkoutPlansForClient,
  type WorkoutPlanTransfer,
  type WorkoutExerciseTransfer,
} from '../../utils/parseAIWorkoutPlan';
import {
  AI_REST_ADJUST,
  AI_REST_SKIP,
  AI_UPDATE_SET,
  type AIWorkoutEventAck,
  type AIUpdateSetPayload,
} from '../../utils/aiWorkoutEvents';
import { type ParsedWorkout } from './VoiceMemoUpload';
import {
  appendImportedSessionNotes,
  parsedWorkoutToExerciseEntries,
} from './workoutLoggerVoiceImport';
import { applyAIUpdateSet } from './aiWorkoutEventReducers';
import type { ProtocolSectionKey, ProtocolSelection } from './CompactProtocolSection';
import {
  getRecommendedProtocolItems,
  findProtocolDefaultByName,
} from './NASMProtocolDefaults';
import {
  convertAIWorkoutExercisesToEntries,
  ensureWorkoutLoggerExerciseRowIdentity,
} from './WorkoutLogger.helpers';

export interface WorkoutAiEventsParams {
  effectiveClientId: number | undefined;
  createWorkoutLoggerLocalId: (prefix: string) => string;
  exercisesRef: React.MutableRefObject<ExerciseEntry[]>;
  setExercises: React.Dispatch<React.SetStateAction<ExerciseEntry[]>>;
  setSessionNotes: React.Dispatch<React.SetStateAction<string>>;
  setOverallIntensity: React.Dispatch<React.SetStateAction<number | null>>;
  loadPhaseTemplate: (phase: number) => void;
  currentOPTPhase: number;
  protocolSectionSetters: Record<ProtocolSectionKey, React.Dispatch<React.SetStateAction<ProtocolSelection[]>>>;
  pendingAiPlanPrefillLoadedRef: React.MutableRefObject<boolean>;
  restTimer: { isRunning: boolean; start: (seconds?: number) => void; stop: () => void };
}

export const useWorkoutAiEvents = ({
  effectiveClientId,
  createWorkoutLoggerLocalId,
  exercisesRef,
  setExercises,
  setSessionNotes,
  setOverallIntensity,
  loadPhaseTemplate,
  currentOPTPhase,
  protocolSectionSetters,
  pendingAiPlanPrefillLoadedRef,
  restTimer,
}: WorkoutAiEventsParams) => {
  const restTimerRef = useRef(restTimer);
  restTimerRef.current = restTimer;
  const convertAIExercises = useCallback((incoming: WorkoutExerciseTransfer[]): ExerciseEntry[] => {
    return convertAIWorkoutExercisesToEntries(incoming, createWorkoutLoggerLocalId);
  }, [createWorkoutLoggerLocalId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkoutPlanTransfer>).detail;
      const hasResolvedClient = typeof effectiveClientId === 'number';
      const pendingPlans = hasResolvedClient ? drainPendingWorkoutPlansForClient(effectiveClientId) : [];
      const detailMatchesClient = hasResolvedClient
        && detail?.exercises?.length
        && (!detail.targetClientId || detail.targetClientId === effectiveClientId);
      const plans = pendingPlans.length ? pendingPlans : (detailMatchesClient ? [detail] : []);
      const pendingExercises = plans.flatMap((plan) => plan.exercises ?? []);
      if (pendingExercises.length) {
        const converted = convertAIExercises(pendingExercises);
        const planLabel = plans.length === 1 ? 'AI plan' : `${plans.length} AI plans`;
        pendingAiPlanPrefillLoadedRef.current = true;
        setExercises(prev => [...prev, ...converted]);
        toast.success(`Applied ${converted.length} exercises from ${planLabel}`);
      }
    };
    window.addEventListener(APPLY_WORKOUT_EVENT, handler);
    return () => window.removeEventListener(APPLY_WORKOUT_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertAIExercises, effectiveClientId]);

  const handleVoiceMemoParsed = useCallback((workout: ParsedWorkout) => {
    const parsedExercises = parsedWorkoutToExerciseEntries(workout).map((exercise) =>
      ensureWorkoutLoggerExerciseRowIdentity(
        exercise,
        () => createWorkoutLoggerLocalId('exercise'),
        () => createWorkoutLoggerLocalId('set'),
      )
    );
    if (parsedExercises.length === 0) {
      toast.error('No usable exercises found in upload');
      return;
    }

    setExercises(prev => [...prev, ...parsedExercises]);
    setSessionNotes(prev => appendImportedSessionNotes(prev, workout.sessionNotes));
    if (typeof workout.overallIntensity === 'number' && Number.isFinite(workout.overallIntensity)) {
      setOverallIntensity(workout.overallIntensity);
    }
    toast.success(`Applied ${parsedExercises.length} parsed exercise${parsedExercises.length === 1 ? '' : 's'}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createWorkoutLoggerLocalId]);

  useEffect(() => {
    const acknowledgeAIWorkoutEvent = (event: Event, handled = true) => {
      const detail = (event as CustomEvent<AIWorkoutEventAck>).detail;
      detail?.acknowledgeAIWorkoutEvent?.(handled);
    };

    const onLoadTemplate = (e: Event) => {
      const { phase } = (e as CustomEvent).detail || {};
      if (phase >= 1 && phase <= 5) {
        acknowledgeAIWorkoutEvent(e);
        loadPhaseTemplate(phase);
      }
    };
    const onAddExercise = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.exerciseName) return;
      acknowledgeAIWorkoutEvent(e);
      const entry: ExerciseEntry = {
        loggerExerciseId: createWorkoutLoggerLocalId('exercise'),
        exerciseId: createWorkoutLoggerLocalId('ai'),
        exerciseName: d.exerciseName,
        sets: Array.from({ length: Array.isArray(d.sets) ? d.sets.length : (Number(d.sets) || 3) }, (_, i) => ({
          loggerSetId: createWorkoutLoggerLocalId('set'),
          setNumber: i + 1,
          weight: d.weight || 0,
          reps: d.reps || 10,
          rpe: null,
          tempo: d.tempo || '',
          restTime: d.restSeconds || 60,
          formQuality: null,
          notes: d.notes || '',
        })),
        formRating: null,
        painLevel: 0,
        performanceNotes: '',
      };
      setExercises(prev => [...prev, entry]);
      toast.success(`Added ${d.exerciseName}`);
    };
    const onUpdateSet = (e: Event) => {
      const detail = (e as CustomEvent<AIUpdateSetPayload>).detail;
      if (!detail?.exerciseName) return;

      const prev = exercisesRef.current;
      const next = applyAIUpdateSet(prev, detail);
      acknowledgeAIWorkoutEvent(e, next !== prev);
      if (next !== prev) {
        exercisesRef.current = next;
        setExercises(next);
        toast.success(`Updated ${detail.exerciseName}`);
      }
    };
    const onRestSkip = (e: Event) => {
      const timer = restTimerRef.current;
      if (!timer.isRunning) { acknowledgeAIWorkoutEvent(e, false); return; }
      timer.stop();
      acknowledgeAIWorkoutEvent(e);
    };
    const onRestAdjust = (e: Event) => {
      const timer = restTimerRef.current;
      const seconds = Number((e as CustomEvent<{ seconds?: unknown }>).detail?.seconds);
      if (!timer.isRunning || !Number.isFinite(seconds) || seconds < 1 || seconds > 600) { acknowledgeAIWorkoutEvent(e, false); return; }
      timer.start(Math.round(seconds));
      acknowledgeAIWorkoutEvent(e);
    };
    const onToggleItem = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.section) return;
      const section = d.section as ProtocolSectionKey;
      if (section !== 'warmup' && section !== 'balance_core' && section !== 'cooldown') {
        return;
      }
      const setter = protocolSectionSetters[section];
      const shouldAdd = d.completed !== false; // undefined / true - add; false - remove

      if (d.markAll) {
        acknowledgeAIWorkoutEvent(e);
        if (shouldAdd) {
          const recs = getRecommendedProtocolItems(section, currentOPTPhase, 12);
          setter(recs.map((item) => ({
            id: item.id,
            name: item.name,
            source: 'preset' as const,
            category: item.category,
          })));
          toast.success(`Preselected ${recs.length} ${section} items`);
        } else {
          setter([]);
          toast.success(`Cleared ${section} selections`);
        }
        return;
      }

      if (!d.itemName) return;
      acknowledgeAIWorkoutEvent(e);

      if (shouldAdd) {
        const match = findProtocolDefaultByName(section, d.itemName);
        if (match) {
          setter((prev) => (prev.some((p) => p.id === match.id)
            ? prev
            : [...prev, { id: match.id, name: match.name, source: 'preset' as const, category: match.category }]
          ));
        }
      } else {
        const needle = d.itemName.toLowerCase();
        setter((prev) => prev.filter((p) => !p.name.toLowerCase().includes(needle)));
      }
    };
    window.addEventListener('AI_LOAD_TEMPLATE', onLoadTemplate);
    window.addEventListener('AI_ADD_EXERCISE', onAddExercise);
    window.addEventListener(AI_UPDATE_SET, onUpdateSet);
    window.addEventListener(AI_REST_SKIP, onRestSkip);
    window.addEventListener(AI_REST_ADJUST, onRestAdjust);
    window.addEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    return () => {
      window.removeEventListener('AI_LOAD_TEMPLATE', onLoadTemplate);
      window.removeEventListener('AI_ADD_EXERCISE', onAddExercise);
      window.removeEventListener(AI_UPDATE_SET, onUpdateSet);
      window.removeEventListener(AI_REST_SKIP, onRestSkip);
      window.removeEventListener(AI_REST_ADJUST, onRestAdjust);
      window.removeEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPhaseTemplate, currentOPTPhase, createWorkoutLoggerLocalId]);

  useEffect(() => {
    const pendingPlans = drainPendingWorkoutPlansForClient(effectiveClientId);
    const pendingExercises = pendingPlans.flatMap((plan) => plan.exercises ?? []);
    if (pendingExercises.length) {
      const converted = convertAIExercises(pendingExercises);
      const planLabel = pendingPlans.length === 1 ? 'AI plan' : `${pendingPlans.length} AI plans`;
      pendingAiPlanPrefillLoadedRef.current = true;
      setExercises(prev => [...prev, ...converted]);
      toast.success(`Loaded ${converted.length} exercises from ${planLabel}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertAIExercises, effectiveClientId]);

  // S10 (JARVIS): the review surface hands back ALREADY-REVIEWED rows —
  // re-key identities the same way the manual path does, append, and return
  // the applied ids so a 5s Undo can remove exactly those rows.
  const applyReviewedExerciseRows = useCallback((rows: ExerciseEntry[]): string[] => {
    const keyed = rows.map((exercise) =>
      ensureWorkoutLoggerExerciseRowIdentity(
        exercise,
        () => createWorkoutLoggerLocalId('exercise'),
        () => createWorkoutLoggerLocalId('set'),
      )
    );
    if (keyed.length === 0) return [];
    setExercises(prev => [...prev, ...keyed]);
    toast.success(`Added ${keyed.length} exercise${keyed.length === 1 ? '' : 's'} from voice`);
    return keyed.map(exercise => exercise.exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createWorkoutLoggerLocalId]);

  const removeExerciseRowsByIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    setExercises(prev => prev.filter(exercise => !drop.has(exercise.exerciseId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handleVoiceMemoParsed, applyReviewedExerciseRows, removeExerciseRowsByIds };
};
