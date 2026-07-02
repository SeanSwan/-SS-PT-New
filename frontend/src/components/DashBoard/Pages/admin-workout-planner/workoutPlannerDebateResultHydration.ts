import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { GeneratedPlan, GeneratedPlanWeekDay, PlanExercise } from './WorkoutPlannerTypes';
import { OPT_PHASES } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { parseWorkoutPlannerDebateJobId } from './workoutPlannerDebateJob';

export { parseWorkoutPlannerDebateJobId } from './workoutPlannerDebateJob';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: unknown }>;
}

interface DebateHydrationContext {
  clientId: number;
  clientName?: string | null;
}

interface DebateHydrationHookInput {
  authAxios: PlannerAuthClient;
  debateJobId: string | null | undefined;
  selectedClientId: number | null;
  selectedClientName?: string | null;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  resetLoadedPlanState: () => void;
}

type RecordValue = Record<string, unknown>;

const DEBATE_RESULT_RETRY_MS = 5000;
const DEBATE_RESULT_MAX_POLLS = 36;

const asRecord = (value: unknown): RecordValue | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
);

const cleanText = (value: unknown, fallback = '', max = 240): string => String(value ?? fallback)
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const positiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const exerciseList = (value: unknown): RecordValue[] => (
  Array.isArray(value) ? value.map(asRecord).filter((item): item is RecordValue => Boolean(item)) : []
);

const firstPositiveInteger = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = positiveInteger(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstExercisePhase = (days: RecordValue[]): number => {
  for (const day of days) {
    const sections = [day.warmup, day.exercises, day.cooldown].flatMap(exerciseList);
    for (const exercise of sections) {
      const phase = firstPositiveInteger(exercise.nasmPhase, exercise.phase);
      if (phase && phase >= 1 && phase <= 5) return phase;
    }
  }
  return 2;
};

const phaseParams = (phaseNumber: number) => {
  const phase = OPT_PHASES.find(item => item.phase === phaseNumber) ?? OPT_PHASES[1];
  return {
    phaseName: phase.name,
    params: { sets: phase.sets, reps: phase.reps, intensity: phase.intensity, tempo: phase.tempo, rest: phase.rest },
  };
};

const exerciseName = (exercise: RecordValue): string => cleanText(exercise.exerciseName ?? exercise.name, '', 120);

const mapDebateExercise = (
  exercise: RecordValue,
  index: number,
  section: 'Warmup' | 'Main' | 'Cooldown',
): GeneratedPlanWeekDay['exercises'][number] | null => {
  const name = exerciseName(exercise);
  if (!name) return null;

  const restSeconds = firstPositiveInteger(exercise.restSeconds, exercise.restPeriod, exercise.rest);
  const sets = firstPositiveInteger(exercise.sets);
  const reps = cleanText(exercise.reps ?? exercise.targetReps ?? exercise.duration, '', 60);
  const note = cleanText(exercise.notes ?? exercise.reason, '', 220);
  const sectionNote = section === 'Main' ? note : [section, note].filter(Boolean).join(': ');

  return {
    exerciseId: cleanText(exercise.exerciseId ?? exercise.exerciseKey, `debate-${section.toLowerCase()}-${index + 1}`, 80),
    exerciseName: name,
    name,
    ...(sets ? { sets } : {}),
    ...(reps ? { reps, targetReps: reps } : {}),
    ...(restSeconds ? { restSeconds } : {}),
    ...(cleanText(exercise.tempo, '', 40) ? { tempo: cleanText(exercise.tempo, '', 40) } : {}),
    ...(sectionNote ? { notes: sectionNote } : {}),
  };
};

const mapDebateDay = (day: RecordValue, index: number): GeneratedPlanWeekDay | null => {
  const exercises = [
    ...exerciseList(day.warmup).map((exercise, i) => mapDebateExercise(exercise, i, 'Warmup')),
    ...exerciseList(day.exercises).map((exercise, i) => mapDebateExercise(exercise, i, 'Main')),
    ...exerciseList(day.cooldown).map((exercise, i) => mapDebateExercise(exercise, i, 'Cooldown')),
  ].filter((exercise): exercise is GeneratedPlanWeekDay['exercises'][number] => Boolean(exercise));

  if (exercises.length === 0) return null;
  const dayNumber = firstPositiveInteger(day.dayNumber, index + 1) ?? index + 1;
  const focus = cleanText(day.focus ?? day.name, `Debate day ${dayNumber}`, 120);
  return { dayNumber, name: `Debate Day ${dayNumber}`, focus, category: 'full_body', exercises };
};

const recommendationLines = (finalPlan: RecordValue): string[] => {
  const lines = [cleanText(finalPlan.recommendation), cleanText(finalPlan.reasoning)];
  for (const item of Array.isArray(finalPlan.contraindications) ? finalPlan.contraindications : []) {
    const text = cleanText(item);
    if (text) lines.push(text);
  }
  for (const mod of exerciseList(finalPlan.modifications)) {
    const original = cleanText(mod.original, '', 100);
    const replacement = cleanText(mod.replacement, '', 100);
    const reason = cleanText(mod.reason, '', 160);
    if (original || replacement || reason) lines.push(`${original} -> ${replacement}: ${reason}`.trim());
  }
  if (finalPlan.fallbackReason) lines.push(`Fallback draft: ${cleanText(finalPlan.fallbackReason)}`);
  return Array.from(new Set(lines.filter(Boolean)));
};

export function adaptWorkoutDebateResultToGeneratedPlan(
  result: unknown,
  context: DebateHydrationContext,
): GeneratedPlan | null {
  const response = asRecord(result);
  const finalPlan = asRecord(response?.finalPlan);
  if (!response || response.success !== true || response.type !== 'workout_plan' || !finalPlan) return null;

  const days = exerciseList(finalPlan.workoutDays).map(mapDebateDay).filter((day): day is GeneratedPlanWeekDay => Boolean(day));
  if (days.length === 0) return null;

  const startingPhase = firstExercisePhase(exerciseList(finalPlan.workoutDays));
  const { phaseName, params } = phaseParams(startingPhase);
  const recommendations = recommendationLines(finalPlan);

  return {
    clientId: context.clientId,
    clientName: cleanText(context.clientName, `Client #${context.clientId}`, 120),
    planningSystem: 'swan_coach_planning',
    swanCoachPlanning: {
      createdBy: 'swan_coach_planning',
      identityMode: 'client_id_only',
      horizonWeeks: 1,
      sessionsPerWeek: days.length,
      primaryGoal: 'general_fitness',
      nasmPhase: startingPhase,
      nasmDomainsApplied: ['OPT Model', 'safety review', 'periodization review'],
      planInputsUsed: { debateResult: true },
      dataCategoriesUsed: ['deidentified_client_context', 'debate_rounds'],
      missingDataCategories: [],
      rules: ['Imported from a completed Swan Coach debate.', 'Review before saving or assigning.'],
    },
    planSummary: {
      durationWeeks: 1,
      sessionsPerWeek: days.length,
      totalSessions: days.length,
      primaryGoal: 'general_fitness',
      startingPhase,
    },
    mesocycles: [{
      mesocycle: 1,
      weeks: '1',
      nasmPhase: startingPhase,
      phaseName,
      focus: cleanText(finalPlan.recommendation, 'Swan Coach debate plan', 120),
      params,
      overloadStrategy: cleanText(finalPlan.reasoning, 'Review debate rationale before progression.', 160),
      deloadWeek: null,
    }],
    weeklySchedule: days.map(day => ({ dayNumber: day.dayNumber, focus: day.focus ?? 'Debate workout', category: 'full_body' })),
    recommendations,
    recommendationDetails: recommendations.map((text, index) => ({ type: 'debate_result', text, sourceCitation: `ai.debate.finalPlan.${index}` })),
    rationale: recommendations,
    weeks: [{ weekNumber: 1, focus: 'Swan Coach debate import', days }],
  };
}

const inProgressDebateMessage = (autoPolling = false): WorkoutPlannerStatusMessage => ({
  type: 'error',
  text: autoPolling
    ? 'Swan Coach debate is still running. Build Plan will load it automatically when it completes.'
    : 'Swan Coach debate is still running. Return to Build Plan after it completes.',
});

const isInProgressDebateResult = (value: unknown): boolean => {
  const payload = asRecord(value);
  return payload?.success === false && payload.state === 'running';
};

const debateResultError = (err: unknown): WorkoutPlannerStatusMessage => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 202) return inProgressDebateMessage();
  if (status === 404) return { type: 'error', text: 'Swan Coach debate result was not found or is no longer available.' };
  return { type: 'error', text: 'Unable to load the Swan Coach debate result into Build Plan.' };
};

export function useWorkoutPlannerDebateResultHydration({
  authAxios,
  debateJobId,
  selectedClientId,
  selectedClientName,
  setGeneratedPlan,
  setPlanExercises,
  setStatusMsg,
  resetLoadedPlanState,
}: DebateHydrationHookInput): void {
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    const safeJobId = parseWorkoutPlannerDebateJobId(debateJobId);
    if (!safeJobId || !selectedClientId) return;

    const loadKey = `${safeJobId}:${selectedClientId}`;
    if (loadedRef.current === loadKey) return;
    loadedRef.current = loadKey;

    let cancelled = false;
    let pollCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadDebateResult = () => {
      pollCount += 1;
      void authAxios.get(`/api/ai/debate/${safeJobId}/result`)
        .then((res) => {
          if (cancelled) return;
          if (isInProgressDebateResult(res.data)) {
            const canRetry = pollCount < DEBATE_RESULT_MAX_POLLS;
            setStatusMsg(inProgressDebateMessage(canRetry));
            if (canRetry) retryTimer = setTimeout(loadDebateResult, DEBATE_RESULT_RETRY_MS);
            return;
          }
          const generated = adaptWorkoutDebateResultToGeneratedPlan(res.data, {
            clientId: selectedClientId,
            clientName: selectedClientName,
          });
          if (!generated) {
            setStatusMsg({ type: 'error', text: 'Swan Coach debate result did not contain a planner-ready workout draft.' });
            return;
          }
          setPlanExercises([]);
          setGeneratedPlan(generated);
          resetLoadedPlanState();
          setStatusMsg({ type: 'success', text: 'Loaded the completed Swan Coach debate into Build Plan. Review before saving or assigning.' });
        })
        .catch((err) => {
          if (!cancelled) setStatusMsg(debateResultError(err));
        });
    };

    loadDebateResult();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [authAxios, debateJobId, resetLoadedPlanState, selectedClientId, selectedClientName, setGeneratedPlan, setPlanExercises, setStatusMsg]);
}