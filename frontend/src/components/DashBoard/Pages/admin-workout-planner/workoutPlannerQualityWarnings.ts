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

export function getGeneratedPlanQualityWarnings(plan: GeneratedPlan): GeneratedPlanQualityWarning[] {
  const days = getPlanDays(plan);
  const text = planText(plan, days);
  const warnings: GeneratedPlanQualityWarning[] = [];

  const hasDetailedSchedule = (plan.weeks ?? []).some((week) => {
    const weekDays = Array.isArray(week.days) && week.days.length > 0 ? week.days : week.sessions;
    return Array.isArray(weekDays) && weekDays.some((day) => day.exercises.length > 0);
  });
  const detailedWeekCount = (plan.weeks ?? []).filter((week) => {
    const weekDays = Array.isArray(week.days) && week.days.length > 0 ? week.days : week.sessions;
    return Array.isArray(weekDays) && weekDays.some((day) => day.exercises.length > 0);
  }).length;
  const durationWeeks = Number(plan.planSummary.durationWeeks) || 0;

  if (durationWeeks > 1 && !hasDetailedSchedule) {
    warnings.push({
      id: 'missing-detailed-schedule',
      label: 'Detailed schedule missing',
      detail: 'This plan only has the weekly summary. Generate or attach populated week/day exercises before saving a client-facing arc.',
    });
  } else if (durationWeeks > 1 && detailedWeekCount < durationWeeks) {
    warnings.push({
      id: 'incomplete-detailed-schedule',
      label: 'Detailed schedule incomplete',
      detail: `${detailedWeekCount}/${durationWeeks} weeks include populated exercises. Fill the full arc before saving it as the client plan of record.`,
    });
  }

  if (!PREP_PATTERN.test(text)) {
    warnings.push({
      id: 'missing-prep-cue',
      label: 'Warmup/prep cue missing',
      detail: 'Add mobility, activation, or corrective prep so the first exercise is not the first client instruction.',
    });
  }

  const hasRecoveryCue = RECOVERY_PATTERN.test(text);
  if (!hasRecoveryCue) {
    warnings.push({
      id: 'missing-recovery-cue',
      label: 'Cooldown/recovery cue missing',
      detail: 'Add cooldown, flexibility, active recovery, or rest guidance so the plan closes the session safely.',
    });
  }

  const repeatedFocus = dominantFocusWarning(days);
  if (repeatedFocus) warnings.push(repeatedFocus);

  const hasDeload = plan.mesocycles.some((block) => Boolean(block.deloadWeek));
  if (durationWeeks >= 8 && !hasDeload && !hasRecoveryCue) {
    warnings.push({
      id: 'missing-deload-checkpoint',
      label: 'Deload checkpoint missing',
      detail: 'Long-horizon plans need an explicit deload, recovery, or reassessment checkpoint before the client sees the full arc.',
    });
  }

  const allBlocksHighIntensity = plan.mesocycles.length > 0
    && plan.mesocycles.every((block) => HIGH_INTENSITY_PATTERN.test(`${block.phaseName} ${block.focus} ${block.params.intensity}`));
  if (durationWeeks >= 4 && allBlocksHighIntensity && !hasRecoveryCue) {
    warnings.push({
      id: 'high-intensity-without-recovery',
      label: 'Intensity recovery mismatch',
      detail: 'Every training block reads high intensity, but no recovery cue is visible. Add recovery structure before assigning.',
    });
  }

  if ((plan.rationale ?? []).length === 0 && (plan.recommendationDetails ?? []).length === 0) {
    warnings.push({
      id: 'missing-rationale',
      label: 'Rationale missing',
      detail: 'Add or regenerate Swan Coach rationale so the trainer can explain why this plan fits the client.',
    });
  }

  return warnings;
}
