/**
 * Swan Coach planning fingerprint service.
 *
 * Produces de-identified metadata describing which training data categories
 * informed a plan-generation request.
 */

import {
  ARCHITECTURE_RULES,
  DATA_INPUT_LABELS,
  NASM_DOMAINS,
  STANDARDS_STACK,
} from './swanCoachPlanningIdentityService.mjs';
import { buildSwanCoachPlanningSafetyGate } from './swanCoachPlanningSafetyGateService.mjs';
import { anyPresent, present } from './swanCoachPlanningShapeHelpers.mjs';

const hasRecentWorkouts = context => Number(context.workouts?.sessionsLast2Weeks || 0) > 0;
const hasPainInput = context => anyPresent(context.pain?.exclusions, context.pain?.warnings);
const trainingVault = context => context.trainingVault || {};
const hasVaultContent = vault => anyPresent(vault.slots, vault.filledHorizonKeys);
const hasTrainingVault = context => {
  const vault = trainingVault(context);
  return vault.available === true ? true : hasVaultContent(vault);
};

const DATA_INPUT_READERS = {
  workoutHistory: hasRecentWorkouts,
  exerciseAnalytics: context => present(context.constraints?.recentlyUsedExercises),
  painInjury: hasPainInput,
  movementCompensations: context => present(context.movement?.compensations),
  goals: context => present(context.goals),
  bodyMeasurements: context => present(context.body),
  baselineReadiness: context => present(context.baseline),
  nutrition: context => present(context.nutrition),
  progressLevels: context => present(context.progressLevels),
  activeProgram: context => present(context.activeProgram),
  planVault: hasTrainingVault,
  equipment: context => present(context.equipment),
  clientSourcePolicy: context => present(context.sourcePolicy?.clientSource || context.clientSource),
};

const dataLabel = key => DATA_INPUT_LABELS[key] || key;

function buildPlanningInputs(context) {
  return Object.fromEntries(
    Object.entries(DATA_INPUT_READERS).map(([key, reader]) => [key, reader(context)])
  );
}

function labelsByState(inputs, expected) {
  return Object.entries(inputs)
    .filter(([, value]) => value === expected)
    .map(([key]) => dataLabel(key));
}

/**
 * Cortex P0 (§5.3): compute JUST the deterministic safety gate for a context,
 * using the same planning-input derivation the fingerprint uses — so the early
 * blocking decision and the persisted fingerprint can never disagree.
 */
export function buildSwanCoachPlanningSafetyGateFromContext(context = {}) {
  return buildSwanCoachPlanningSafetyGate(context, buildPlanningInputs(context));
}

export function buildSwanCoachPlanningFingerprint({
  context = {},
  horizonWeeks = null,
  sessionsPerWeek = null,
  nasmPhase = null,
  primaryGoal = null,
} = {}) {
  const inputs = buildPlanningInputs(context);

  return {
    createdBy: 'swan_coach_planning',
    identityMode: 'client_id_only',
    horizonWeeks,
    sessionsPerWeek,
    primaryGoal,
    nasmPhase,
    nasmDomainsApplied: [...NASM_DOMAINS],
    standardsStackApplied: [...STANDARDS_STACK],
    architectureRules: [...ARCHITECTURE_RULES],
    safetyGate: buildSwanCoachPlanningSafetyGate(context, inputs),
    planInputsUsed: inputs,
    dataCategoriesUsed: labelsByState(inputs, true),
    missingDataCategories: labelsByState(inputs, false),
    rules: [
      'Use Client # only',
      'Preserve Move Fitness/external free-tracking semantics',
      'Never deduct or change paid-session balances',
      'Run deterministic safety/review gate before AI explanation',
      'Warn when pain/injury or readiness data is missing',
    ],
  };
}
