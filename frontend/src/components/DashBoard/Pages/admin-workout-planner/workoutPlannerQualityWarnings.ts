/**
 * Generated plan quality warnings for trainer review.
 * Keeps guardrail logic pure so the UI can display warnings without blocking saves.
 */
import type { GeneratedPlan, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

export interface GeneratedPlanQualityWarning {
  id: string;
  label: string;
  detail: string;
}

const PREP_PATTERN = /\b(warm[-\s]?up|warmup|prep|activation|mobility|corrective|inhibit|lengthen|activate)\b/i;
const RECOVERY_PATTERN = /\b(cool[-\s]?down|cooldown|recovery|rest day|active recovery|stretch|flexibility|mobility|deload)\b/i;
const HIGH_INTENSITY_PATTERN = /\b(85|90|95|100|high|maximal|power)\b/i;

interface PlanScheduleCoverage {
  durationWeeks: number;
  detailedWeekCount: number;
  hasDetailedSchedule: boolean;
}

function getPlanDays(plan: GeneratedPlan): GeneratedPlanWeekDay[] {
  const weekDays = (plan.weeks ?? []).flatMap((week) => {
    if (Array.isArray(week.days) && week.days.length > 0) return week.days;
    if (Array.isArray(week.sessions) && week.sessions.length > 0) return week.sessions;
    return [];
  });

  if (weekDays.length > 0) return weekDays;

  return plan.weeklySchedule.map((day) => ({
    dayNumber: day.dayNumber,
    focus: day.focus,
    category: day.category,
    exercises: [],
  }));
}

function dayText(day: GeneratedPlanWeekDay): string {
  const exerciseText = day.exercises
    .map((exercise) => [
      exercise.exerciseName,
      exercise.name,
      exercise.notes,
    ].filter(Boolean).join(' '))
    .join(' ');

  return [
    day.name,
    day.dayName,
    day.focus,
    day.category,
    exerciseText,
  ].filter(Boolean).join(' ');
}

function planText(plan: GeneratedPlan, days: GeneratedPlanWeekDay[]): string {
  const mesocycleText = plan.mesocycles
    .map((block) => [
      block.phaseName,
      block.focus,
      block.overloadStrategy,
      block.params.intensity,
      block.deloadWeek ? `deload week ${block.deloadWeek}` : '',
    ].filter(Boolean).join(' '))
    .join(' ');

  return [
    plan.planSummary.primaryGoal,
    ...days.map(dayText),
    ...plan.recommendations,
    ...(plan.rationale ?? []),
    ...(plan.recommendationDetails ?? []).map((detail) => `${detail.type} ${detail.text}`),
    mesocycleText,
  ].filter(Boolean).join(' ');
}

function normalizedFocus(day: GeneratedPlanWeekDay): string {
  const value = String(day.category || day.focus || '').trim().toLowerCase();
  return value.replace(/\s+/g, ' ') || 'unspecified';
}

function dominantFocusWarning(days: GeneratedPlanWeekDay[]): GeneratedPlanQualityWarning | null {
  if (days.length < 3) return null;

  const counts = new Map<string, number>();
  days.forEach((day) => {
    const focus = normalizedFocus(day);
    counts.set(focus, (counts.get(focus) ?? 0) + 1);
  });

  const [focus, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (count < Math.ceil(days.length * 0.67)) return null;

  return {
    id: 'dominant-focus-repeat',
    label: 'Focus balance needs review',
    detail: `${count}/${days.length} scheduled days lean on "${focus}". Add opposing patterns, recovery, or rotate emphasis before assigning.`,
  };
}

const populatedWeekDays = (week: NonNullable<GeneratedPlan['weeks']>[number]) => {
  if (Array.isArray(week.days) && week.days.length > 0) return week.days;
  if (Array.isArray(week.sessions)) return week.sessions;
  return [];
};

const weekHasPopulatedExercises = (week: NonNullable<GeneratedPlan['weeks']>[number]) => (
  populatedWeekDays(week).some((day) => day.exercises.length > 0)
);

const planScheduleCoverage = (plan: GeneratedPlan): PlanScheduleCoverage => {
  const detailedWeekCount = (plan.weeks ?? []).filter(weekHasPopulatedExercises).length;
  return {
    durationWeeks: Number(plan.planSummary.durationWeeks) || 0,
    detailedWeekCount,
    hasDetailedSchedule: detailedWeekCount > 0,
  };
};

const scheduleCoverageWarning = ({
  durationWeeks,
  detailedWeekCount,
  hasDetailedSchedule,
}: PlanScheduleCoverage): GeneratedPlanQualityWarning | null => {
  if (durationWeeks <= 1) return null;
  if (!hasDetailedSchedule) {
    return {
      id: 'missing-detailed-schedule',
      label: 'Detailed schedule missing',
      detail: 'This plan only has the weekly summary. Generate or attach populated week/day exercises before saving a client-facing arc.',
    };
  }
  if (detailedWeekCount >= durationWeeks) return null;
  return {
    id: 'incomplete-detailed-schedule',
    label: 'Detailed schedule incomplete',
    detail: `${detailedWeekCount}/${durationWeeks} weeks include populated exercises. Fill the full arc before saving it as the client plan of record.`,
  };
};

const missingPrepWarning = (text: string): GeneratedPlanQualityWarning | null => {
  if (PREP_PATTERN.test(text)) return null;
  return {
    id: 'missing-prep-cue',
    label: 'Warmup/prep cue missing',
    detail: 'Add mobility, activation, or corrective prep so the first exercise is not the first client instruction.',
  };
};

const missingRecoveryWarning = (hasRecoveryCue: boolean): GeneratedPlanQualityWarning | null => {
  if (hasRecoveryCue) return null;
  return {
    id: 'missing-recovery-cue',
    label: 'Cooldown/recovery cue missing',
    detail: 'Add cooldown, flexibility, active recovery, or rest guidance so the plan closes the session safely.',
  };
};

const planHasDeload = (plan: GeneratedPlan) => (
  plan.mesocycles.some((block) => Boolean(block.deloadWeek))
);

const missingDeloadWarning = (
  plan: GeneratedPlan,
  durationWeeks: number,
  hasRecoveryCue: boolean,
): GeneratedPlanQualityWarning | null => {
  if (durationWeeks < 8) return null;
  if (planHasDeload(plan)) return null;
  if (hasRecoveryCue) return null;
  return {
    id: 'missing-deload-checkpoint',
    label: 'Deload checkpoint missing',
    detail: 'Long-horizon plans need an explicit deload, recovery, or reassessment checkpoint before the client sees the full arc.',
  };
};

const allBlocksHighIntensity = (plan: GeneratedPlan) => (
  plan.mesocycles.length > 0
    && plan.mesocycles.every((block) => HIGH_INTENSITY_PATTERN.test(`${block.phaseName} ${block.focus} ${block.params.intensity}`))
);

const highIntensityRecoveryWarning = (
  plan: GeneratedPlan,
  durationWeeks: number,
  hasRecoveryCue: boolean,
): GeneratedPlanQualityWarning | null => {
  if (durationWeeks < 4) return null;
  if (!allBlocksHighIntensity(plan)) return null;
  if (hasRecoveryCue) return null;
  return {
    id: 'high-intensity-without-recovery',
    label: 'Intensity recovery mismatch',
    detail: 'Every training block reads high intensity, but no recovery cue is visible. Add recovery structure before assigning.',
  };
};

const hasVisibleRationale = (plan: GeneratedPlan) => {
  if ((plan.rationale ?? []).length > 0) return true;
  return (plan.recommendationDetails ?? []).length > 0;
};

const missingRationaleWarning = (plan: GeneratedPlan): GeneratedPlanQualityWarning | null => {
  if (hasVisibleRationale(plan)) return null;
  return {
    id: 'missing-rationale',
    label: 'Rationale missing',
    detail: 'Add or regenerate Swan Coach rationale so the trainer can explain why this plan fits the client.',
  };
};

const presentWarnings = (
  warnings: Array<GeneratedPlanQualityWarning | null>,
): GeneratedPlanQualityWarning[] => (
  warnings.filter((warning): warning is GeneratedPlanQualityWarning => Boolean(warning))
);

export function getGeneratedPlanQualityWarnings(plan: GeneratedPlan): GeneratedPlanQualityWarning[] {
  const days = getPlanDays(plan);
  const text = planText(plan, days);
  const coverage = planScheduleCoverage(plan);
  const hasRecoveryCue = RECOVERY_PATTERN.test(text);

  return presentWarnings([
    scheduleCoverageWarning(coverage),
    missingPrepWarning(text),
    missingRecoveryWarning(hasRecoveryCue),
    dominantFocusWarning(days),
    missingDeloadWarning(plan, coverage.durationWeeks, hasRecoveryCue),
    highIntensityRecoveryWarning(plan, coverage.durationWeeks, hasRecoveryCue),
    missingRationaleWarning(plan),
  ]);
}
