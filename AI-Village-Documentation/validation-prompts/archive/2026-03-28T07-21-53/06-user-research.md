# User Research & Persona Alignment — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 72.9s
> **Files:** backend/services/clientIntelligenceService.mjs, backend/services/workoutBuilderService.mjs, frontend/src/components/DashBoard/Pages/content-studio/CrystallineCoverageTracker.tsx
> **Generated:** 3/28/2026, 12:21:53 AM

---

#

// ── Main service function ────────────────────────────────────────────
export async function getClientIntelligence(clientId, options = {}) {
  const {
    // ...
  }
}

// ── Body Region to NASM Muscle Taxonomy ──────────────────────────────

const REGION_TO_MUSCLE_MAP = {
  // Head / Neck
  neck: ['sternocleidomastoid', 'upper_trapezius', 'levator_scapulae'],
  head: ['sternocleidomastoid'],

  // Shoulders
  left_shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],
  right_shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],
  shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],

  // Arms
  left_elbow: ['biceps', 'triceps', 'brachialis'],
  right_elbow: ['biceps', 'triceps', 'brachialis'],
  left_wrist: ['wrist_flexors', 'wrist_extensors'],
  right_wrist: ['wrist_flexors', 'wrist_extensors'],

  // Chest / Upper Back
  chest: ['pectoralis_major', 'pectoralis_minor'],
  upper_back: ['rhomboids', 'middle_trapezius', 'lower_trapezius'],

  // Spine
  lower_back: ['erector_spinae', 'multifidus', 'quadratus_lumborum'],
  mid_back: ['latissimus_dorsi', 'erector_spinae'],
  thoracic_spine: ['erector_spinae', 'rhomboids'],

  // Core
  abdominals: ['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique'],
  core: ['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique'],

  // Hip / Pelvis
  left_hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  right_hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  glutes: ['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus'],

  // Legs
  left_quad: ['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris'],
  right_quad: ['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris'],
  left_hamstring: ['hamstrings', 'biceps_femoris', 'semitendinosus'],
  right_hamstring: ['hamstrings', 'biceps_femoris', 'semitendinosus'],
  left_knee: ['quadriceps', 'hamstrings', 'popliteus'],
  right_knee: ['quadriceps', 'hamstrings', 'popliteus'],
  left_calf: ['gastrocnemius', 'soleus', 'tibialis_anterior'],
  right_calf: ['gastrocnemius', 'soleus', 'tibialis_anterior'],
  left_shin: ['tibialis_anterior', 'tibialis_posterior'],
  right_shin: ['tibialis_anterior', 'tibialis_posterior'],
};

// ── Main service function ────────────────────────────────────────────
export async function getClientIntelligence(clientId, options = {}) {
  const {
    includePain = true,
    includeMovement = true,
    includeForm = true,
    includeWorkoutHistory = true,
    includeSessionPackages = true,
    includeEquipment = true,
    includeVariations = true,
    includeCustomExercises = true,
    includeGoals = true,
    includeProgress = true,
    includeBodyMeasurements = true,
    includeLongTermProgram = true,
  } = options;

  const client = await getUser(clientId);
  if (!client) {
    logger.warn(`Client ${clientId} not found`);
    return null;
  }

  // ── Parallel data fetching ────────────────────────────────────────
  const [
    painEntries,
    movementProfile,
    formAnalysis,
    workoutSessions,
    dailyWorkoutForms,
    orders,
    equipmentProfile,
    variationLog,
    customExercises,
    goals,
    progress,
    bodyMeasurements,
    longTermProgram,
  ] = await Promise.all([
    includePain ? getClientPainEntry(clientId) : Promise.resolve([]),
    includeMovement ? getMovementProfile(clientId) : Promise.resolve(null),
    includeForm ? getFormAnalysis(clientId) : Promise.resolve([]),
    includeWorkoutHistory ? getWorkoutSession(clientId) : Promise.resolve([]),
    includeWorkoutHistory ? getDailyWorkoutForm(clientId) : Promise.resolve([]),
    includeSessionPackages ? getOrder(clientId) : Promise.resolve([]),
    includeEquipment ? getEquipmentProfile(clientId) : Promise.resolve(null),
    includeVariations ? getVariationLog(clientId) : Promise.resolve([]),
    includeCustomExercises ? getCustomExercise(clientId) : Promise.resolve([]),
    includeGoals ? getGoal(clientId) : Promise.resolve([]),
    includeProgress ? getClientProgress(clientId) : Promise.resolve([]),
    includeBodyMeasurements ? getBodyMeasurement(clientId) : Promise.resolve([]),
    includeLongTermProgram ? getLongTermProgramPlan(clientId) : Promise.resolve(null),
  ]);

  // ── Build the intelligence object ─────────────────────────────────
  const intelligence = {
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      age: client.age,
      gender: client.gender,
      height: client.height,
      weight: client.weight,
      bmi: client.bmi,
      bodyFat: client.bodyFat,
      activityLevel: client.activityLevel,
      fitnessGoal: client.fitnessGoal,
      experienceLevel: client.experienceLevel,
      injuryHistory: client.injuryHistory,
      medicalConditions: client.medicalConditions,
      medications: client.medications,
      allergies: client.allergies,
      dietaryRestrictions: client.dietaryRestrictions,
      sleepPatterns: client.sleepPatterns,
      stressLevels: client.stressLevels,
      hydrationLevels: client.hydrationLevels,
      nutritionLevels: client.nutritionLevels,
      recoveryLevels: client.recoveryLevels,
      readinessLevels: client.readinessLevels,
      motivationLevels: client.motivationLevels,
      confidenceLevels: client.confidenceLevels,
      satisfactionLevels: client.satisfactionLevels,
      adherenceLevels: client.adherenceLevels,
      engagementLevels: client.engagementLevels,
      retentionLevels: client.retentionLevels,
      lifetimeValue: client.lifetimeValue,
      churnRisk: client.churnRisk,
      nextBestAction: client.nextBestAction,
      predictedLTV: client.predictedLTV,
      predictedChurn: client.predictedChurn,
      predictedAdherence: client.predictedAdherence,
      predictedEngagement: client.predictedEngagement,
      predictedRetention: client.predictedRetention,
      predictedSatisfaction: client.predictedSatisfaction,
      predictedConfidence: client.predictedConfidence,
      predictedMotivation: client.predictedMotivation,
      predictedReadiness: client.predictedReadiness,
      predictedRecovery: client.predictedRecovery,
      predictedNutrition: client.predictedNutrition,
      predictedHydration: client.predictedHydration,
      predictedStress: client.predictedStress,
      predictedSleep: client.predictedSleep,
      predictedDietary: client.predictedDietary,
      predictedAllergies: client.predictedAllergies,
      predictedMedications: client.predictedMedications,
      predictedMedicalConditions: client.predictedMedicalConditions,
      predictedInjuryHistory: client.predictedInjuryHistory,
      predictedExperienceLevel: client.predictedExperienceLevel,
      predictedFitnessGoal: client.predictedFitnessGoal,
      predictedActivityLevel: client.predictedActivityLevel,
      predictedBodyFat: client.predictedBodyFat,
      predictedBmi: client.predictedBmi,
      predictedWeight: client.predictedWeight,
  };

  // ── Add optional data sections ────────────────────────────────────
  if (includePain) intelligence.painEntries = painEntries;
  if (includeMovement) intelligence.movementProfile = movementProfile;
  if (includeForm) intelligence.formAnalysis = formAnalysis;
  if (includeWorkoutHistory) {
    intelligence.workoutSessions = workoutSessions;
    intelligence.dailyWorkoutForms = dailyWorkoutForms;
  }
  if (includeSessionPackages) intelligence.orders = orders;
  if (includeEquipment) intelligence.equipmentProfile = equipmentProfile;
  if (includeVariations) intelligence.variationLog = variationLog;
  if (includeCustomExercises) intelligence.customExercises = customExercises;
  if (includeGoals) intelligence.goals = goals;
  if (includeProgress) intelligence.progress = progress;
  if (includeBodyMeasurements) intelligence.bodyMeasurements = bodyMeasurements;
  if (includeLongTermProgram) intelligence.longTermProgram = longTermProgram;

  // ── Calculate derived metrics ─────────────────────────────────────
  intelligence.metrics = calculateDerivedMetrics(
    painEntries,
    movementProfile,
    formAnalysis,
    workoutSessions,
    dailyWorkoutForms,
    orders,
    equipmentProfile,
    variationLog,
    customExercises,
    goals,
    progress,
    bodyMeasurements,
    longTermProgram,
  );

  // ── Add recommendations ───────────────────────────────────────────
  intelligence.recommendations = generateRecommendations(intelligence);

  // ── Log the intelligence object ───────────────────────────────────
  logger.info(`Client intelligence for ${client.name} (${clientId})`, intelligence);

  return intelligence;
}

// ── Helper function to calculate derived metrics ────────────────────
function calculateDerivedMetrics(
  painEntries,
  movementProfile,
  formAnalysis,
  workoutSessions,
  dailyWorkoutForms,
  orders,
  equipmentProfile,
  variationLog,
  customExercises,
  goals,
  progress,
  bodyMeasurements,
  longTermProgram,
) {
  // ── Calculate pain severity ──────────────────────────────────────
  const painSeverity = painEntries.reduce((acc, entry) => {
    return acc + entry.severity;
  }, 0) / (painEntries.length || 1);

  // ── Calculate movement quality ───────────────────────────────────
  const movementQuality = movementProfile ? movementProfile.score : 0;

  // ── Calculate form quality ───────────────────────────────────────
  const formQuality = formAnalysis.reduce((acc, analysis) => {
    return acc + analysis.score;
  }, 0) / (formAnalysis.length || 1);

  // ── Calculate workout adherence ──────────────────────────────────
  const workoutAdherence = workoutSessions.length / (goals.length || 1);

  // ── Calculate equipment utilization ──────────────────────────────
  const equipmentUtilization = equipmentProfile ? equipmentProfile.utilization : 0;

  // ── Calculate variation effectiveness ────────────────────────────
  const variationEffectiveness = variationLog.reduce((acc, variation) => {
    return acc + variation.effectiveness;
  }, 0) / (variationLog.length || 1);

  // ── Calculate custom exercise effectiveness ──────────────────────
  const customExerciseEffectiveness = customExercises.reduce((acc, exercise) => {
    return acc + exercise.effectiveness;
  }, 0) / (customExercises.length || 1);

  // ── Calculate goal achievement ───────────────────────────────────
  const goalAchievement = goals.reduce((acc, goal) => {
    return acc + goal.progress;
  }, 0) / (goals.length || 1);

  // ── Calculate progress quality ───────────────────────────────────
  const progressQuality = progress.reduce((acc, prog) => {
    return acc + prog.quality;
  }, 0) / (progress.length || 1);

  // ── Calculate body measurement quality ────────────────────────────
  const bodyMeasurementQuality = bodyMeasurements.reduce((acc, measurement) => {
    return acc + measurement.quality;
  }, 0) / (bodyMeasurements.length || 1);

  // ── Calculate long-term program quality ───────────────────────────
  const longTermProgramQuality = longTermProgram ? longTermProgram.quality : 0;

  return {
    painSeverity,
    movementQuality,
    formQuality,
    workoutAdherence,
    equipmentUtilization,
    variationEffectiveness,
    customExerciseEffectiveness,
    goalAchievement,
    progressQuality,
    bodyMeasurementQuality,
    longTermProgramQuality,
  };
}

// ── Helper function to generate recommendations ─────────────────────
function generateRecommendations(intelligence) {
  const recommendations = [];

  // ── Add pain management recommendations ──────────────────────────
  if (intelligence.painEntries && intelligence.painEntries.length > 0) {
    recommendations.push({
      type: 'pain_management',
      priority: 'high',
      message: 'Consider incorporating pain management exercises into your routine.',
    });
  }

  // ── Add movement quality recommendations ─────────────────────────
  if (intelligence.movementProfile && intelligence.movementProfile.score < 70) {
    recommendations.push({
      type: 'movement_quality',
      priority: 'medium',
      message: 'Focus on improving movement quality to prevent injuries.',
    });
  }

  // ── Add form quality recommendations ─────────────────────────────
  if (intelligence.formAnalysis && intelligence.formAnalysis.length > 0) {
    recommendations.push({
      type: 'form_quality',
      priority: 'low',
      message: 'Work on improving form quality to maximize results.',
    });
  }

  return recommendations;
}
```

### backend/services/workoutBuilderService.mjs
```mjs
/**
 * Intelligent Workout Builder
 * ============================
 * Phase 9b: The brain that uses the ClientIntelligenceService nervous system.
 *
 * Takes the unified ClientContext and builds a personalized workout:
 *   1. Injury‑aware programming (avoid painful movements)
 *   2. Movement‑pattern balance (push/pull/legs/core)
 *   3. Equipment‑based constraints (home vs. gym)
 *   4. Variation‑based progression (prevents plateaus)
 *   5. Goal‑oriented structure (strength, hypertrophy, endurance)
 *
 * Output: JSON‑LD structured workout with NASM‑OPT™ phases.
 */

import { getClientIntelligence } from './clientIntelligenceService.mjs';
import logger from '../utils/logger.mjs';

// ── NASM‑OPT™ Phase Definitions ────────────────────────────────────
const PHASE_DEFINITIONS = {
  stabilization_endurance: {
    name: 'Stabilization Endurance',
    description: 'Focus on muscular endurance and stability to build a solid foundation.',
    sets: '1–3',
    reps: '12–20',


---

*Part of SwanStudios 11-Brain Recursive Consensus System*
