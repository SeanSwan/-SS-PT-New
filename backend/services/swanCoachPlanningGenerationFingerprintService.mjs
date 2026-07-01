/**
 * swanCoachPlanningGenerationFingerprintService
 *
 * Purpose: Builds Swan Coach planning fingerprints for generated workout
 * drafts from already-assembled, de-identified planning context.
 *
 * Runtime flow:
 * - Controllers gather safe context and validated AI plan output.
 * - This service maps the available context into the shared planning
 *   fingerprint builder.
 * - Approval gates later read the stored fingerprint from AiInteractionLog.
 *
 * Privacy boundary:
 * - Inputs are expected to be safe planning summaries.
 * - The returned fingerprint is client-ID-only metadata for UI/audit review.
 */

import { buildSwanCoachPlanningFingerprint } from './swanCoachPlanningContextService.mjs';

export const buildWorkoutGenerationPlanningFingerprint = ({
  aiPlan,
  safePayload,
  unifiedContext,
  progressContext,
  measurementContext,
  nutritionContext,
  nasmConstraints,
  equipmentContext,
  sourcePolicy,
}) => buildSwanCoachPlanningFingerprint({
  context: {
    workouts: {
      sessionsLast2Weeks: progressContext?.recentSessionCount
        || safePayload?.trainingHistory?.totalSessions
        || 0,
    },
    constraints: {
      recentlyUsedExercises: unifiedContext?.exerciseRecommendations,
    },
    pain: {
      exclusions: unifiedContext?.painConstraints?.severeAreas
        || unifiedContext?.painConstraints?.moderateAreas,
      warnings: unifiedContext?.explainability?.safetyFlags,
    },
    movement: {
      compensations: unifiedContext?.movementContext?.compensations
        || unifiedContext?.movementContext,
    },
    goals: unifiedContext?.goalProgress
      || safePayload?.goals
      || safePayload?.client?.goals,
    body: measurementContext
      || safePayload?.measurements
      || safePayload?.bodyCompositionTrend,
    baseline: nasmConstraints || safePayload?.baselineReadiness,
    nutrition: nutritionContext || safePayload?.nutrition,
    progressLevels: safePayload?.progressLevels,
    activeProgram: safePayload?.activeProgram || safePayload?.activePlans,
    trainingVault: safePayload?.trainingVault || safePayload?.planVault,
    equipment: equipmentContext || safePayload?.equipment,
    clientSource: unifiedContext?.clientSourceContext?.clientSource
      || unifiedContext?.clientSourceContext?.source
      || sourcePolicy?.clientSource
      || safePayload?.clientSource,
    sourcePolicy: unifiedContext?.clientSourceContext
      || sourcePolicy
      || safePayload?.sourcePolicy,
    safety: unifiedContext?.safetyConstraints
      || unifiedContext?.safety
      || safePayload?.safety
      || safePayload?.healthScreening,
    health: safePayload?.health
      || safePayload?.healthProfile
      || safePayload?.screening
      || safePayload?.healthScreening,
    specialPopulation: safePayload?.specialPopulation,
    criticalDataUnavailable: unifiedContext?.criticalDataUnavailable
      || safePayload?.criticalDataUnavailable,
    criticalFailures: unifiedContext?.criticalFailures
      || safePayload?.criticalFailures,
  },
  horizonWeeks: Number(aiPlan?.durationWeeks) || null,
  sessionsPerWeek: Array.isArray(aiPlan?.days)
    ? aiPlan.days.filter(day => day?.dayType !== 'rest').length
    : null,
  nasmPhase: nasmConstraints?.optPhase || null,
  primaryGoal: nasmConstraints?.primaryGoal
    || safePayload?.goals?.primary
    || safePayload?.client?.goals?.primary
    || null,
});

function sumBlockWeeks(blocks = []) {
  return blocks.reduce((sum, block) => sum + (Number(block?.durationWeeks) || 0), 0);
}

function averageBlockSessions(blocks = []) {
  const values = blocks
    .map(block => Number(block?.sessionsPerWeek))
    .filter(value => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function buildLongHorizonPlanningFingerprint({
  aiPlan,
  safePayload,
  longHorizonContext,
  nasmConstraints,
  horizonMonths,
  sourcePolicy,
}) {
  const blocks = Array.isArray(aiPlan?.blocks) ? aiPlan.blocks : [];
  return buildSwanCoachPlanningFingerprint({
    context: {
      workouts: {
        sessionsLast2Weeks: longHorizonContext?.progressSummary?.recentSessionCount || 0,
      },
      constraints: {
        recentlyUsedExercises: longHorizonContext?.progressionTrends?.metrics,
      },
      pain: {
        exclusions: longHorizonContext?.injuryRestrictions?.active,
        warnings: longHorizonContext?.adherence?.consistencyFlags,
      },
      movement: {
        compensations: longHorizonContext?.correctiveBias?.compensations
          || longHorizonContext?.injuryRestrictions?.active,
      },
      goals: longHorizonContext?.goalProgress
        || safePayload?.goals
        || safePayload?.client?.goals,
      body: longHorizonContext?.bodyComposition
        || safePayload?.measurements
        || safePayload?.bodyCompositionTrend,
      baseline: nasmConstraints || safePayload?.baselineReadiness,
      nutrition: safePayload?.nutrition || safePayload?.nutritionAndLifestyle,
      progressLevels: safePayload?.progressLevels,
      activeProgram: longHorizonContext?.activeProgram || safePayload?.activeProgram || safePayload?.activePlans,
      trainingVault: longHorizonContext?.trainingVault
        || safePayload?.trainingVault
        || safePayload?.planVault,
      equipment: safePayload?.equipment,
      clientSource: sourcePolicy?.clientSource
        || longHorizonContext?.sourcePolicy?.clientSource
        || safePayload?.sourcePolicy?.clientSource
        || safePayload?.clientSource,
      sourcePolicy: sourcePolicy
        || longHorizonContext?.sourcePolicy
        || safePayload?.sourcePolicy,
      safety: longHorizonContext?.safetyConstraints
        || safePayload?.safety
        || safePayload?.healthScreening,
      health: longHorizonContext?.health
        || safePayload?.health
        || safePayload?.healthProfile
        || safePayload?.screening
        || safePayload?.healthScreening,
      specialPopulation: safePayload?.specialPopulation,
      criticalDataUnavailable: longHorizonContext?.criticalDataUnavailable
        || safePayload?.criticalDataUnavailable,
      criticalFailures: longHorizonContext?.criticalFailures
        || safePayload?.criticalFailures,
    },
    horizonWeeks: sumBlockWeeks(blocks) || horizonMonths * 4,
    sessionsPerWeek: averageBlockSessions(blocks),
    nasmPhase: nasmConstraints?.optPhase || null,
    primaryGoal: longHorizonContext?.goalProgress?.primaryGoal
      || nasmConstraints?.primaryGoal
      || safePayload?.goals?.primary
      || safePayload?.client?.goals?.primary
      || null,
  });
}
