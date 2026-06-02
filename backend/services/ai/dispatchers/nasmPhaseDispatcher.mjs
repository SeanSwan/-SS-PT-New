/**
 * ============================================================================
 * FILE: dispatchers/nasmPhaseDispatcher.mjs
 * PURPOSE: PII-safe NASM OPT phase read command for Swan Coach
 * OWNER: Codex | CREATED: 2026-05-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Resolves a client's current NASM OPT phase from verified movement-profile
 *   and baseline-assessment sources, returning only flat non-PII fields for
 *   Coach command cards.
 */

import { getAllModels } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const PHASE_NAMES = {
  1: 'Stabilization Endurance',
  2: 'Strength Endurance',
  3: 'Muscular Development',
  4: 'Maximal Strength',
  5: 'Power',
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const toPhaseNumber = (value) => {
  const phase = Number(value);
  return Number.isInteger(phase) && phase >= 1 && phase <= 5 ? phase : null;
};

const latestGoal = (questionnaire, fallbackGoal) => (
  questionnaire?.primaryGoal || fallbackGoal || 'general_fitness'
);

/**
 * Dispatcher for view_nasm_phase.
 *
 * Source priority:
 *   1. MovementProfile.nasmPhaseRecommendation, if present.
 *   2. Latest ClientBaselineMeasurements.nasmAssessmentScore + OPT selector.
 *   3. Honest not_available result.
 *
 * @param {{ clientId?: number }} params
 * @param {{ resolvedClient?: { id?: number, fitnessGoal?: string } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchViewNasmPhase(params, ctx) {
  const {
    ClientBaselineMeasurements,
    ClientOnboardingQuestionnaire,
    MovementProfile,
  } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);

  const [movementProfile, baseline, questionnaire] = await Promise.all([
    MovementProfile.findOne({ where: { userId: clientId } }),
    ClientBaselineMeasurements.findOne({
      where: { userId: clientId },
      order: [['takenAt', 'DESC']],
    }),
    ClientOnboardingQuestionnaire.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    }),
  ]);

  const primaryGoal = latestGoal(questionnaire, ctx.resolvedClient?.fitnessGoal);
  const nasmAssessmentScore = baseline?.nasmAssessmentScore ?? null;
  const medicalClearanceRequired = Boolean(baseline?.medicalClearanceRequired);
  const movementPhase = toPhaseNumber(movementProfile?.nasmPhaseRecommendation);

  if (movementPhase) {
    return {
      clientId,
      phase: movementPhase,
      phaseName: PHASE_NAMES[movementPhase],
      source: 'movement_profile',
      nasmAssessmentScore,
      primaryGoal,
      movementScreenStatus: 'completed',
      medicalClearanceRequired,
      totalAnalyses: movementProfile?.totalAnalyses ?? 0,
      lastUpdatedAt: toDateOnly(movementProfile?.lastAnalysisAt),
    };
  }

  if (nasmAssessmentScore !== null && nasmAssessmentScore !== undefined) {
    const selected = ClientBaselineMeasurements.selectOPTPhase(
      Number(nasmAssessmentScore),
      primaryGoal,
    );
    const phase = toPhaseNumber(selected?.phase);

    return {
      clientId,
      phase,
      phaseName: selected?.name ?? PHASE_NAMES[phase] ?? null,
      source: 'baseline_measurement',
      nasmAssessmentScore,
      primaryGoal,
      movementScreenStatus: 'completed',
      medicalClearanceRequired,
      totalAnalyses: movementProfile?.totalAnalyses ?? 0,
      lastUpdatedAt: toDateOnly(baseline?.takenAt),
    };
  }

  return {
    clientId,
    phase: null,
    phaseName: null,
    source: 'not_available',
    nasmAssessmentScore: null,
    primaryGoal,
    movementScreenStatus: baseline ? 'recorded' : 'pending',
    medicalClearanceRequired,
    totalAnalyses: movementProfile?.totalAnalyses ?? 0,
    lastUpdatedAt: toDateOnly(baseline?.takenAt ?? movementProfile?.lastAnalysisAt),
  };
}
