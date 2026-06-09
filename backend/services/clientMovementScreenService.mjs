/**
 * clientMovementScreenService.mjs
 * ===============================
 * Creates NASM movement-screen baseline records for
 * POST /api/onboarding/:userId/movement-screen.
 *
 * Purpose:
 * - Keep PAR-Q parsing, NASM scoring, OPT phase selection, and baseline
 *   persistence out of the Express controller.
 * - Preserve the existing movementScreen response contract.
 * - Keep server-side scoring centralized so client payloads cannot override it.
 *
 * Inputs:
 * - Sequelize model registry from getAllModels().
 * - Authorized target user id and recorder id.
 * - Request body containing PAR-Q, OHSA, and optional assessment details.
 *
 * Outputs:
 * - { ok: false, status, message } for validation failures.
 * - { ok: true, movementScreen } for successful persistence.
 */

import {
  isPlainObject,
  normalizeJsonObject,
  toNumber,
} from '../utils/onboardingHelpers.mjs';

const hasParqRisk = (parqScreening) => {
  if (!parqScreening || !isPlainObject(parqScreening)) {
    return false;
  }

  const parqKeys = [
    'q1_heart_condition',
    'q2_chest_pain',
    'q3_balance_dizziness',
    'q4_bone_joint_problem',
    'q5_blood_pressure_meds',
    'q6_medical_reason',
    'q7_aware_of_other',
  ];

  return parqKeys.some((key) => parqScreening[key] === true);
};

const buildMovementScreenResponse = (baseline, optPhase) => ({
  id: baseline.id,
  userId: baseline.userId,
  nasmAssessmentScore: baseline.nasmAssessmentScore,
  correctiveExerciseStrategy: baseline.correctiveExerciseStrategy,
  optPhase,
  bodyFatPercentage: baseline.bodyFatPercentage ?? null,
  plankDuration: baseline.plankDuration ?? null,
  flexibilityNotes: baseline.flexibilityNotes,
  injuryNotes: baseline.injuryNotes,
  painLevel: baseline.painLevel,
  medicalClearanceRequired: baseline.medicalClearanceRequired,
  createdAt: baseline.createdAt,
});

export const createMovementScreenRecord = async ({
  models,
  targetUserId,
  recordedBy,
  body = {},
}) => {
  const {
    ClientBaselineMeasurements,
    ClientOnboardingQuestionnaire,
  } = models;

  const parqScreening = normalizeJsonObject(body.parqScreening);
  const overheadSquatAssessment = normalizeJsonObject(body.overheadSquatAssessment);
  const posturalAssessment = normalizeJsonObject(body.posturalAssessment);
  const performanceAssessments = normalizeJsonObject(body.performanceAssessments);

  if (!parqScreening || !overheadSquatAssessment) {
    return {
      ok: false,
      status: 400,
      message: 'parqScreening and overheadSquatAssessment are required',
    };
  }

  const medicalClearanceRequired =
    parqScreening.medicalClearanceRequired === true || hasParqRisk(parqScreening);
  const normalizedParq = { ...parqScreening, medicalClearanceRequired };

  const nasmAssessmentScore = ClientBaselineMeasurements.calculateNASMScore(overheadSquatAssessment);
  const correctiveExerciseStrategy =
    ClientBaselineMeasurements.generateCorrectiveStrategy(overheadSquatAssessment);

  const latestQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
    where: { userId: targetUserId },
    order: [['createdAt', 'DESC']],
  });

  const optPhase = ClientBaselineMeasurements.selectOPTPhase(
    nasmAssessmentScore ?? 0,
    latestQuestionnaire?.primaryGoal ?? 'general_fitness'
  );

  const baseline = await ClientBaselineMeasurements.create({
    userId: targetUserId,
    recordedBy,
    takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
    parqScreening: normalizedParq,
    overheadSquatAssessment,
    nasmAssessmentScore,
    posturalAssessment,
    performanceAssessments,
    correctiveExerciseStrategy,
    bodyFatPercentage: toNumber(body.bodyFatPercentage),
    plankDuration: toNumber(body.plankDuration),
    flexibilityNotes: body.flexibilityNotes ?? null,
    injuryNotes: body.injuryNotes ?? null,
    painLevel: toNumber(body.painLevel),
    medicalClearanceRequired,
    medicalClearanceDate: body.medicalClearanceDate ?? null,
    medicalClearanceProvider: body.medicalClearanceProvider ?? null,
  });

  return {
    ok: true,
    movementScreen: buildMovementScreenResponse(baseline, optPhase),
  };
};
