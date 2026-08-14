/**
 * onboardingMasterPromptBuilder.mjs
 * =================================
 * Pure builder for the SwanStudios Master Prompt JSON v3.0 intake schema.
 *
 * Purpose:
 * - Keep questionnaire-to-master-prompt mapping out of Express controllers.
 * - Preserve the existing v3.0 output shape consumed by onboarding, admin, and
 *   AI command-dispatch flows.
 * - Avoid persistence, auth, logging, or side effects in the mapping layer.
 *
 * Inputs:
 * - Flat questionnaire response data from client/admin onboarding flows.
 * - userId remains accepted for API compatibility with legacy callers.
 *
 * Outputs:
 * - A serializable object ready for User.masterPromptJson.
 */

import {
  applyOnboardingFieldDictionary,
  sanitizeNarrativeFields,
  ONBOARDING_DICTIONARY_VERSION,
} from './onboardingFieldDictionary.mjs';

const toInt = (value) => Number.parseInt(value, 10);
const toFloat = (value) => Number.parseFloat(value);
const yes = (value) => value === 'yes';

const buildClientProfile = (formData) => ({
  name: formData.fullName,
  preferredName: formData.preferredName || formData.fullName,
  alias: null,
  age: formData.age,
  gender: formData.gender,
  bloodType: formData.bloodType || 'Unknown',
  contact: {
    phone: formData.phone,
    email: formData.email,
    preferredTime: formData.bestTimeToReach,
  },
});

const buildMeasurements = (formData) => ({
  height: {
    feet: toInt(formData.heightFeet),
    inches: toInt(formData.heightInches),
  },
  currentWeight: toFloat(formData.currentWeight),
  targetWeight: formData.targetWeight ? toFloat(formData.targetWeight) : null,
  bodyFatPercentage: formData.bodyFatPercentage ? toFloat(formData.bodyFatPercentage) : null,
  lastDexaScan: formData.lastDexaScanDate || null,
});

const buildGoals = (formData) => ({
  primary: formData.primaryGoal,
  why: formData.whyGoalMatters,
  successLooksLike: formData.successIn6Months,
  timeline: formData.desiredTimeline,
  commitmentLevel: toInt(formData.commitmentLevel),
  pastObstacles: formData.pastObstacles || '',
  supportNeeded: formData.supportNeeded || '',
});

const buildHealth = (formData) => ({
  medicalConditions: formData.medicalConditions || [],
  underDoctorCare: yes(formData.underDoctorCare),
  doctorCleared: yes(formData.doctorCleared),
  medications: formData.medications || [],
  supplements: formData.supplements || [],
  injuries: formData.pastInjuries || [],
  surgeries: formData.pastSurgeries || [],
  currentPain: formData.currentPain || [],
  // Added 2026-08-13 (S5/F10). The wizard has asked every client these four
  // questions all along and the projection had nowhere to put the answers, so
  // they were collected and discarded. Movement limits and the two PAR-Q
  // cardiac screens are exactly the inputs that should constrain programming.
  // Blood pressure is carried as the raw reading the wizard collects rather
  // than parsed into systolic/diastolic — guessing at the format of a
  // free-text vital is a worse failure than passing it through verbatim.
  movementLimitations: formData.movementLimitations || '',
  chestPain: yes(formData.chestPain),
  heartCondition: yes(formData.heartCondition),
  bloodPressureReading: formData.bloodPressureReading || '',
});

const buildNutrition = (formData) => ({
  currentDiet: formData.currentDietQuality,
  tracksFood: yes(formData.tracksFood),
  trackingApp: formData.trackingApp || null,
  dailyProtein: formData.dailyProtein ? toFloat(formData.dailyProtein) : 0,
  targetProtein: formData.targetProtein ? toFloat(formData.targetProtein) : 0,
  waterIntake: formData.waterIntake ? toInt(formData.waterIntake) : 0,
  eatingSchedule: {
    breakfast: formData.breakfastTime || '',
    lunch: formData.lunchTime || '',
    dinner: formData.dinnerTime || '',
    snacks: formData.snacksPerDay ? toInt(formData.snacksPerDay) : 0,
  },
  bloodTypeDiet: yes(formData.interestedInBloodTypeDiet),
  dietaryPreferences: formData.dietaryPreferences || [],
  allergies: formData.foodAllergies || [],
  lovesFood: formData.foodsYouLove || [],
  hatesFood: formData.foodsYouHate || [],
  cooksAtHome: formData.cooksAtHome,
  mealPrepInterest: yes(formData.mealPrepInterest),
});

const buildLifestyle = (formData) => ({
  sleepHours: formData.sleepHours ? toFloat(formData.sleepHours) : 0,
  sleepQuality: formData.sleepQuality,
  stressLevel: toInt(formData.stressLevel),
  stressSources: formData.stressSources || '',
  occupation: formData.occupation,
  workActivityLevel: formData.workActivityLevel,
  smokes: yes(formData.smokes),
  alcoholConsumption: formData.alcoholConsumption,
});

const buildTraining = (formData) => ({
  fitnessLevel: formData.fitnessLevel,
  currentlyWorkingOut: yes(formData.currentlyWorkingOut),
  workoutsPerWeek: formData.workoutsPerWeek ? toInt(formData.workoutsPerWeek) : 0,
  workoutTypes: formData.workoutTypes || '',
  pastExperience: formData.pastTrainingExperience || [],
  previousTrainer: yes(formData.previousTrainer),
  previousTrainerExperience: formData.previousTrainerExperience || '',
  gymLocation: formData.gymLocation,
  favoriteExercises: formData.favoriteExercises || [],
  dislikedExercises: formData.dislikedExercises || [],
  preferredStyle: formData.preferredTrainingStyle || [],
  sessionFrequency: toInt(formData.sessionFrequency),
  sessionDuration: formData.sessionDuration,
});

const buildStrengthBaseline = (formData) => ({
  benchPress: formData.benchPress ? {
    weight: toFloat(formData.benchPress.weight),
    reps: toInt(formData.benchPress.reps),
  } : null,
  squat: formData.squat ? {
    weight: toFloat(formData.squat.weight),
    reps: toInt(formData.squat.reps),
  } : null,
  deadlift: formData.deadlift ? {
    weight: toFloat(formData.deadlift.weight),
    reps: toInt(formData.deadlift.reps),
  } : null,
  overheadPress: formData.overheadPress ? {
    weight: toFloat(formData.overheadPress.weight),
    reps: toInt(formData.overheadPress.reps),
  } : null,
  pullUps: formData.pullUps ? {
    reps: toInt(formData.pullUps.reps),
    assisted: yes(formData.pullUps.assisted),
  } : null,
});

const buildBaseline = (formData) => ({
  cardiovascular: {
    restingHeartRate: formData.restingHeartRate ? toInt(formData.restingHeartRate) : null,
    bloodPressure: formData.bloodPressureSystolic ? {
      systolic: toInt(formData.bloodPressureSystolic),
      diastolic: toInt(formData.bloodPressureDiastolic),
    } : null,
  },
  strength: buildStrengthBaseline(formData),
  rangeOfMotion: formData.rangeOfMotion || null,
  flexibility: formData.flexibility || null,
});

const buildAiCoaching = (formData) => ({
  dailyCheckIns: yes(formData.dailyCheckIns),
  checkInTime: formData.checkInTime || '',
  checkInMethod: formData.checkInMethod,
  aiHelp: formData.aiHelp || [],
  communicationStyle: formData.communicationStyle,
  motivationStyle: formData.motivationStyle,
  progressReportFrequency: formData.progressReportFrequency,
});

const buildVisualDiagnostics = (formData) => ({
  comfortableWithPhotos: yes(formData.comfortableWithPhotos),
  painPhotos: yes(formData.painPhotos),
  wearable: formData.wearable || 'None',
  wearableIntegration: yes(formData.wearableIntegration),
});

const buildPackage = (formData) => ({
  tier: formData.trainingTier,
  price: formData.sessionPrice ? toFloat(formData.sessionPrice) : 0,
  sessionsPerWeek: toInt(formData.sessionFrequency),
  commitment: formData.packageCommitment,
  paymentMethod: formData.paymentMethod,
});

const buildNotes = (formData) => ({
  anythingElse: formData.anythingElse || '',
  mostExcitedAbout: formData.mostExcitedAbout || '',
  nervousAbout: formData.nervousAbout || '',
  questionsForTrainer: formData.questionsForTrainer || '',
});

const buildTrainerAssessment = (formData) => ({
  healthRisk: formData.healthRisk || 'Low',
  doctorClearanceNeeded: yes(formData.doctorClearanceNeeded),
  priorityAreas: formData.priorityAreas || '',
  recommendedFrequency: formData.recommendedFrequency ? toInt(formData.recommendedFrequency) : null,
  recommendedTier: formData.recommendedTier || null,
});

const buildMetadata = (formData) => ({
  intakeDate: new Date().toISOString().split('T')[0],
  firstSessionDate: formData.firstSessionDate || null,
  createdBy: 'SwanStudios Personal Training System v3.0',
  lastUpdated: new Date().toISOString(),
});

export const transformQuestionnaireToMasterPrompt = (rawFormData, userId) => {
  void userId;

  // Reconcile wizard field names to the names this projection reads, BEFORE
  // any section is built. The wizard collects `injuries`; every builder below
  // reads `pastInjuries || []` — so the answer was defaulted away and the
  // projection still looked complete. The rewrite is additive: an already
  // canonical key always wins, so callers that speak this projection's
  // language are untouched. Contract: onboardingFieldDictionary.mjs.
  const formData = sanitizeNarrativeFields(applyOnboardingFieldDictionary(rawFormData));

  return {
    version: '3.0',
    dictionaryVersion: ONBOARDING_DICTIONARY_VERSION,
    client: buildClientProfile(formData),
    measurements: buildMeasurements(formData),
    goals: buildGoals(formData),
    health: buildHealth(formData),
    nutrition: buildNutrition(formData),
    lifestyle: buildLifestyle(formData),
    training: buildTraining(formData),
    baseline: buildBaseline(formData),
    aiCoaching: buildAiCoaching(formData),
    visualDiagnostics: buildVisualDiagnostics(formData),
    package: buildPackage(formData),
    notes: buildNotes(formData),
    trainerAssessment: buildTrainerAssessment(formData),
    metadata: buildMetadata(formData),
  };
};
