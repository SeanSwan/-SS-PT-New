/**
 * shared/clientOnboardingQuestionBank.mjs
 * =======================================
 * Canonical Swan Coach onboarding scan bank. This file is shared ESM so the
 * backend proposal/coverage services and future frontend workbench can consume
 * the same category and field metadata without drifting.
 */

export const CLIENT_ONBOARDING_CATEGORY_KEYS = Object.freeze([
  'account_identity_source',
  'compliance_waiver_consent',
  'contact_communication_preferences',
  'goals_outcomes',
  'schedule_availability',
  'health_injury_risk',
  'pain_body_map_movement_screen',
  'measurements_body_composition',
  'training_history_preferences',
  'equipment_environment',
  'nutrition_hydration',
  'lifestyle_recovery',
  'baseline_performance',
  'package_business_admin',
  'coach_charting_data_priority',
]);

export const CLIENT_ONBOARDING_REQUIRED_FOR = Object.freeze([
  'safety',
  'programming',
  'charting',
  'communication',
  'business',
]);

export const CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES = Object.freeze([
  { key: 'account_identity_source', label: 'Account, identity, and source' },
  { key: 'compliance_waiver_consent', label: 'Compliance, waiver, and consent' },
  { key: 'contact_communication_preferences', label: 'Contact and communication preferences' },
  { key: 'goals_outcomes', label: 'Goals and outcomes' },
  { key: 'schedule_availability', label: 'Schedule and availability' },
  { key: 'health_injury_risk', label: 'Health, injuries, and risk' },
  { key: 'pain_body_map_movement_screen', label: 'Pain map and movement screen' },
  { key: 'measurements_body_composition', label: 'Measurements and body composition' },
  { key: 'training_history_preferences', label: 'Training history and preferences' },
  { key: 'equipment_environment', label: 'Equipment and environment' },
  { key: 'nutrition_hydration', label: 'Nutrition and hydration' },
  { key: 'lifestyle_recovery', label: 'Lifestyle and recovery' },
  { key: 'baseline_performance', label: 'Baseline and performance' },
  { key: 'package_business_admin', label: 'Business, package, and admin' },
  { key: 'coach_charting_data_priority', label: 'Coach charting and data priority' },
]);

const ask = (definition) => Object.freeze({
  allowedValues: [],
  defaultStatus: 'unknown',
  ledgerOnly: false,
  canAskTrainer: true,
  canAskClient: true,
  isSensitive: false,
  chartDataPriority: 2,
  scanWeight: 2,
  ...definition,
});

export const CLIENT_ONBOARDING_QUESTION_BANK = Object.freeze([
  ask({ category: 'account_identity_source', fieldKey: 'identity', label: 'Name and email', trainerPrompt: 'What is the client name and email?', clientPrompt: 'Confirm your name and email.', valueType: 'identity_bundle', requiredFor: ['business', 'communication'], chartDataPriority: 1, masterPromptPath: 'client.name', userProfilePath: 'email', questionnairePath: 'email', coverageGroups: [['client.firstName', 'draft.firstName', 'responses.firstName'], ['client.lastName', 'draft.lastName', 'responses.lastName'], ['client.email', 'draft.email', 'responses.email']], defaultStatus: 'client_requested' }),
  ask({ category: 'account_identity_source', fieldKey: 'client_source', label: 'Client source', trainerPrompt: 'Is this SwanStudios, Move Fitness, or external?', clientPrompt: 'Confirm your training location/source.', valueType: 'enum', allowedValues: ['swanstudios', 'move_fitness', 'external'], requiredFor: ['business'], chartDataPriority: 1, userProfilePath: 'clientSource', questionnairePath: 'clientSource', coveragePaths: ['client.clientSource', 'draft.clientSource', 'responses.clientSource'] }),
  ask({ category: 'account_identity_source', fieldKey: 'access_handoff_status', label: 'Claim/reset handoff', trainerPrompt: 'Has the client received a claim or reset handoff?', clientPrompt: 'Confirm you can access your account.', valueType: 'enum', allowedValues: ['claim_link_ready', 'claim_link_needed', 'reset_link_sent', 'reset_link_ready', 'reset_link_needed'], requiredFor: ['business', 'communication'], chartDataPriority: 0, ledgerOnly: true, coveragePaths: ['client.accessHandoff.credentialMode', 'draft.accessHandoff.credentialMode'] }),

  ask({ category: 'compliance_waiver_consent', fieldKey: 'waiver_status', label: 'Waiver status', trainerPrompt: 'Has the current waiver been signed?', clientPrompt: 'Complete or confirm your waiver.', valueType: 'enum', allowedValues: ['signed', 'pending', 'not_applicable'], requiredFor: ['safety', 'business'], chartDataPriority: 1, ledgerOnly: true, defaultStatus: 'trainer_pending' }),
  ask({ category: 'compliance_waiver_consent', fieldKey: 'doctor_clearance', label: 'Doctor clearance', trainerPrompt: 'Is doctor clearance needed or complete?', clientPrompt: 'Tell us whether a doctor has cleared you for training.', valueType: 'enum', allowedValues: ['cleared', 'needed', 'not_needed', 'unknown'], requiredFor: ['safety', 'programming'], chartDataPriority: 2, masterPromptPath: 'trainerAssessment.doctorClearanceNeeded', questionnairePath: 'doctorCleared', defaultStatus: 'client_requested', isSensitive: true }),
  ask({ category: 'compliance_waiver_consent', fieldKey: 'ai_consent', label: 'AI consent', trainerPrompt: 'Has the client approved AI-assisted coaching use?', clientPrompt: 'Choose whether Swan Coach may use your training data to help your coach.', valueType: 'boolean', requiredFor: ['business'], chartDataPriority: 0, ledgerOnly: true, defaultStatus: 'trainer_pending', isSensitive: true }),

  ask({ category: 'contact_communication_preferences', fieldKey: 'preferred_contact_method', label: 'Preferred contact method', trainerPrompt: 'How should we reach this client?', clientPrompt: 'How should we contact you?', valueType: 'enum', allowedValues: ['in_app', 'email', 'sms', 'phone'], requiredFor: ['communication'], masterPromptPath: 'aiCoaching.checkInMethod', questionnairePath: 'checkInMethod' }),
  ask({ category: 'contact_communication_preferences', fieldKey: 'best_time_to_reach', label: 'Best time to reach', trainerPrompt: 'What is the best time to reach them?', clientPrompt: 'What time is best for check-ins?', valueType: 'text', requiredFor: ['communication'], masterPromptPath: 'client.contact.preferredTime', questionnairePath: 'bestTimeToReach', userProfilePath: 'bestTimeToReach' }),
  ask({ category: 'contact_communication_preferences', fieldKey: 'communication_style', label: 'Communication style', trainerPrompt: 'What coaching tone works best?', clientPrompt: 'What communication style helps you follow through?', valueType: 'text', requiredFor: ['communication', 'programming'], masterPromptPath: 'aiCoaching.communicationStyle', questionnairePath: 'communicationStyle' }),

  ask({ category: 'goals_outcomes', fieldKey: 'primary_goal', label: 'Primary training goal', trainerPrompt: 'What is the main goal?', clientPrompt: 'What is your main training goal?', valueType: 'text', requiredFor: ['programming', 'charting'], chartDataPriority: 5, masterPromptPath: 'goals.primary', questionnairePath: 'primaryGoal', userProfilePath: 'fitnessGoal', coveragePaths: ['client.fitnessGoal', 'draft.fitnessGoal', 'responses.primaryGoal', 'responses.fitnessGoal', 'masterPrompt.goals.primary'] }),
  ask({ category: 'goals_outcomes', fieldKey: 'why_goal_matters', label: 'Why it matters', trainerPrompt: 'Why does this goal matter to the client?', clientPrompt: 'Why does this goal matter to you?', valueType: 'text', requiredFor: ['programming', 'communication'], masterPromptPath: 'goals.why', questionnairePath: 'whyGoalMatters' }),
  ask({ category: 'goals_outcomes', fieldKey: 'success_6_months', label: 'Six-month success picture', trainerPrompt: 'What should success look like in 6 months?', clientPrompt: 'What would success look like in 6 months?', valueType: 'text', requiredFor: ['programming', 'charting', 'communication'], chartDataPriority: 4, masterPromptPath: 'goals.successLooksLike', questionnairePath: 'successIn6Months' }),

  ask({ category: 'schedule_availability', fieldKey: 'preferred_training_days', label: 'Preferred training days', trainerPrompt: 'Which days can they train?', clientPrompt: 'Which days can you train?', valueType: 'list', requiredFor: ['programming', 'communication'], questionnairePath: 'preferredTrainingDays', coveragePaths: ['client.preferredTrainingDays', 'draft.preferredTrainingDays', 'draft.onboardingContext.availability', 'responses.preferredTrainingDays', 'responses.trainingSchedule', 'responses.availability'] }),
  ask({ category: 'schedule_availability', fieldKey: 'session_frequency', label: 'Session frequency', trainerPrompt: 'How many sessions per week?', clientPrompt: 'How often do you want to train?', valueType: 'number', requiredFor: ['programming', 'business'], masterPromptPath: 'training.sessionFrequency', questionnairePath: 'sessionFrequency' }),
  ask({ category: 'schedule_availability', fieldKey: 'first_session_priorities', label: 'First-session priorities', trainerPrompt: 'What must be handled in the first session?', clientPrompt: 'What do you want to cover first?', valueType: 'text', requiredFor: ['programming', 'communication'], masterPromptPath: 'metadata.firstSessionDate', questionnairePath: 'firstSessionPriorities', coveragePaths: ['draft.firstSessionPriorities', 'draft.onboardingContext.firstSessionPriorities', 'responses.firstSessionPriorities', 'masterPrompt.metadata.firstSessionDate'] }),

  ask({ category: 'health_injury_risk', fieldKey: 'health_concerns', label: 'Health concerns', trainerPrompt: 'Any health concerns or red flags?', clientPrompt: 'Tell us about health concerns your coach should know.', valueType: 'text', requiredFor: ['safety', 'programming'], chartDataPriority: 3, masterPromptPath: 'health.medicalConditions', questionnairePath: 'medicalConditions', userProfilePath: 'healthConcerns', coveragePaths: ['client.healthConcerns', 'draft.healthConcerns', 'responses.healthConcerns', 'responses.medicalConditions', 'masterPrompt.health.medicalConditions'], defaultStatus: 'client_requested', isSensitive: true }),
  ask({ category: 'health_injury_risk', fieldKey: 'medications', label: 'Medications and supplements', trainerPrompt: 'Any medications or supplements that affect training?', clientPrompt: 'List medications or supplements relevant to training.', valueType: 'list', requiredFor: ['safety'], masterPromptPath: 'health.medications', questionnairePath: 'medications', defaultStatus: 'client_requested', isSensitive: true }),
  ask({ category: 'health_injury_risk', fieldKey: 'injury_history', label: 'Injury history', trainerPrompt: 'What injuries or surgeries matter for programming?', clientPrompt: 'List injuries or surgeries we should consider.', valueType: 'list', requiredFor: ['safety', 'programming'], chartDataPriority: 4, masterPromptPath: 'health.injuries', questionnairePath: 'pastInjuries', coveragePaths: ['client.injuries', 'draft.injuries', 'responses.injuries', 'responses.injuryHistory', 'responses.pastInjuries', 'masterPrompt.health.injuries'], defaultStatus: 'client_requested', isSensitive: true }),

  ask({ category: 'pain_body_map_movement_screen', fieldKey: 'current_pain', label: 'Current pain map', trainerPrompt: 'Where is the client currently feeling pain?', clientPrompt: 'Where do you feel pain during daily life or exercise?', valueType: 'list', requiredFor: ['safety', 'programming'], chartDataPriority: 5, masterPromptPath: 'health.currentPain', questionnairePath: 'currentPain', defaultStatus: 'client_requested', isSensitive: true }),
  ask({ category: 'pain_body_map_movement_screen', fieldKey: 'range_of_motion', label: 'Range of motion', trainerPrompt: 'Any range-of-motion limits?', clientPrompt: 'Do any joints feel restricted?', valueType: 'text', requiredFor: ['programming', 'charting'], chartDataPriority: 4, masterPromptPath: 'baseline.rangeOfMotion', questionnairePath: 'rangeOfMotion' }),
  ask({ category: 'pain_body_map_movement_screen', fieldKey: 'posture_flags', label: 'Posture or movement flags', trainerPrompt: 'Any posture or movement flags from screening?', clientPrompt: 'Has anyone noted posture or movement limitations?', valueType: 'text', requiredFor: ['safety', 'programming'], chartDataPriority: 4, masterPromptPath: 'trainerAssessment.priorityAreas', questionnairePath: 'priorityAreas' }),

  ask({ category: 'measurements_body_composition', fieldKey: 'height', label: 'Height', trainerPrompt: 'What is the client height?', clientPrompt: 'Enter your height.', valueType: 'measurement', requiredFor: ['charting', 'programming'], chartDataPriority: 3, masterPromptPath: 'measurements.height', questionnairePath: 'heightFeet', userProfilePath: 'height' }),
  ask({ category: 'measurements_body_composition', fieldKey: 'current_weight', label: 'Current weight', trainerPrompt: 'What is the current weight?', clientPrompt: 'Enter your current weight.', valueType: 'measurement', requiredFor: ['charting'], chartDataPriority: 5, masterPromptPath: 'measurements.currentWeight', questionnairePath: 'currentWeight', userProfilePath: 'weight' }),
  ask({ category: 'measurements_body_composition', fieldKey: 'body_fat', label: 'Body fat estimate', trainerPrompt: 'Do we have body-fat or DEXA data?', clientPrompt: 'Enter body-fat or DEXA data if available.', valueType: 'measurement', requiredFor: ['charting'], chartDataPriority: 4, masterPromptPath: 'measurements.bodyFatPercentage', questionnairePath: 'bodyFatPercentage' }),

  ask({ category: 'training_history_preferences', fieldKey: 'fitness_level', label: 'Fitness level', trainerPrompt: 'What is their current fitness level?', clientPrompt: 'How would you rate your fitness level?', valueType: 'enum', allowedValues: ['beginner', 'intermediate', 'advanced'], requiredFor: ['programming'], chartDataPriority: 2, masterPromptPath: 'training.fitnessLevel', questionnairePath: 'fitnessLevel' }),
  ask({ category: 'training_history_preferences', fieldKey: 'current_workouts', label: 'Current workouts', trainerPrompt: 'What are they doing now?', clientPrompt: 'What workouts are you currently doing?', valueType: 'text', requiredFor: ['programming'], masterPromptPath: 'training.workoutTypes', questionnairePath: 'workoutTypes' }),
  ask({ category: 'training_history_preferences', fieldKey: 'preferred_training_style', label: 'Preferred training style', trainerPrompt: 'What style do they prefer or dislike?', clientPrompt: 'What training styles do you like or dislike?', valueType: 'list', requiredFor: ['programming', 'communication'], masterPromptPath: 'training.preferredStyle', questionnairePath: 'preferredTrainingStyle' }),

  ask({ category: 'equipment_environment', fieldKey: 'gym_location', label: 'Gym or training location', trainerPrompt: 'Where will they train?', clientPrompt: 'Where will you train most often?', valueType: 'text', requiredFor: ['programming', 'business'], masterPromptPath: 'training.gymLocation', questionnairePath: 'gymLocation' }),
  ask({ category: 'equipment_environment', fieldKey: 'equipment_access', label: 'Equipment access', trainerPrompt: 'What equipment is available?', clientPrompt: 'What equipment do you have access to?', valueType: 'list', requiredFor: ['programming'], chartDataPriority: 2, questionnairePath: 'equipmentAccess', coveragePaths: ['client.equipmentAccess', 'draft.equipmentAccess', 'draft.onboardingContext.equipmentAccess', 'responses.equipmentAccess', 'responses.equipment'] }),
  ask({ category: 'equipment_environment', fieldKey: 'recovery_tools', label: 'Recovery tools', trainerPrompt: 'Any recovery tools available?', clientPrompt: 'Do you use recovery tools?', valueType: 'list', requiredFor: ['programming'], questionnairePath: 'recoveryTools', ledgerOnly: true }),

  ask({ category: 'nutrition_hydration', fieldKey: 'nutrition_preferences', label: 'Nutrition preferences', trainerPrompt: 'Any nutrition preferences or restrictions?', clientPrompt: 'Share nutrition preferences, allergies, or restrictions.', valueType: 'list', requiredFor: ['programming', 'communication'], chartDataPriority: 3, masterPromptPath: 'nutrition.dietaryPreferences', questionnairePath: 'dietaryPreferences', coveragePaths: ['questionnaire.nutritionPrefs', 'responses.nutritionPrefs', 'draft.nutritionPrefs', 'draft.dietaryRestrictions', 'masterPrompt.nutrition.dietaryPreferences'] }),
  ask({ category: 'nutrition_hydration', fieldKey: 'water_intake', label: 'Water intake', trainerPrompt: 'How much water do they drink?', clientPrompt: 'How much water do you drink daily?', valueType: 'number', requiredFor: ['charting', 'programming'], chartDataPriority: 3, masterPromptPath: 'nutrition.waterIntake', questionnairePath: 'waterIntake' }),
  ask({ category: 'nutrition_hydration', fieldKey: 'protein_target', label: 'Protein target', trainerPrompt: 'Do we have a protein target?', clientPrompt: 'Do you track protein or have a target?', valueType: 'number', requiredFor: ['charting', 'programming'], chartDataPriority: 4, masterPromptPath: 'nutrition.targetProtein', questionnairePath: 'targetProtein' }),

  ask({ category: 'lifestyle_recovery', fieldKey: 'sleep_hours', label: 'Sleep hours', trainerPrompt: 'How much sleep do they average?', clientPrompt: 'How many hours do you sleep?', valueType: 'number', requiredFor: ['programming', 'charting'], chartDataPriority: 3, masterPromptPath: 'lifestyle.sleepHours', questionnairePath: 'sleepHours' }),
  ask({ category: 'lifestyle_recovery', fieldKey: 'stress_level', label: 'Stress level', trainerPrompt: 'What is their stress level?', clientPrompt: 'How high is your stress lately?', valueType: 'number', requiredFor: ['programming'], chartDataPriority: 2, masterPromptPath: 'lifestyle.stressLevel', questionnairePath: 'stressLevel' }),
  ask({ category: 'lifestyle_recovery', fieldKey: 'work_activity_level', label: 'Work activity level', trainerPrompt: 'How active is their workday?', clientPrompt: 'How active is your workday?', valueType: 'enum', allowedValues: ['sedentary', 'light', 'moderate', 'heavy'], requiredFor: ['programming'], masterPromptPath: 'lifestyle.workActivityLevel', questionnairePath: 'workActivityLevel' }),

  ask({ category: 'baseline_performance', fieldKey: 'resting_heart_rate', label: 'Resting heart rate', trainerPrompt: 'Do we know resting heart rate?', clientPrompt: 'Share your resting heart rate if known.', valueType: 'number', requiredFor: ['charting', 'safety'], chartDataPriority: 4, masterPromptPath: 'baseline.cardiovascular.restingHeartRate', questionnairePath: 'restingHeartRate', defaultStatus: 'trainer_pending' }),
  ask({ category: 'baseline_performance', fieldKey: 'blood_pressure', label: 'Blood pressure', trainerPrompt: 'Do we have blood pressure?', clientPrompt: 'Share blood pressure if known.', valueType: 'text', requiredFor: ['safety', 'charting'], chartDataPriority: 4, masterPromptPath: 'baseline.cardiovascular.bloodPressure', questionnairePath: 'bloodPressureSystolic', defaultStatus: 'client_requested', isSensitive: true }),
  ask({ category: 'baseline_performance', fieldKey: 'strength_baselines', label: 'Strength baselines', trainerPrompt: 'Do we know key strength baselines?', clientPrompt: 'Share any baseline lifts or reps you know.', valueType: 'object', requiredFor: ['charting', 'programming'], chartDataPriority: 5, masterPromptPath: 'baseline.strength', questionnairePath: 'benchPress' }),

  ask({ category: 'package_business_admin', fieldKey: 'billing_mode', label: 'Billing mode', trainerPrompt: 'Is this paid session deduction or free tracking?', clientPrompt: 'Confirm your training arrangement.', valueType: 'enum', allowedValues: ['paid_sessions', 'free_tracking'], requiredFor: ['business'], chartDataPriority: 0, userProfilePath: 'clientSource', coveragePaths: ['client.billingMode', 'draft.billingMode', 'client.clientSource', 'draft.clientSource'] }),
  ask({ category: 'package_business_admin', fieldKey: 'session_package', label: 'Session package', trainerPrompt: 'What package or tier applies?', clientPrompt: 'Confirm your training package if applicable.', valueType: 'text', requiredFor: ['business'], chartDataPriority: 0, masterPromptPath: 'package.tier', questionnairePath: 'trainingTier' }),
  ask({ category: 'package_business_admin', fieldKey: 'payment_admin_notes', label: 'Payment/admin notes', trainerPrompt: 'Any admin notes before first session?', clientPrompt: 'Any questions for billing or scheduling?', valueType: 'text', requiredFor: ['business', 'communication'], chartDataPriority: 0, masterPromptPath: 'notes.questionsForTrainer', questionnairePath: 'questionsForTrainer' }),

  ask({ category: 'coach_charting_data_priority', fieldKey: 'chart_priority_focus', label: 'Chart priority focus', trainerPrompt: 'Which result should charts emphasize first?', clientPrompt: 'Which progress metric matters most to you?', valueType: 'enum', allowedValues: ['strength', 'body_composition', 'consistency', 'mobility', 'nutrition'], requiredFor: ['charting', 'communication'], chartDataPriority: 5, ledgerOnly: true }),
  ask({ category: 'coach_charting_data_priority', fieldKey: 'measurement_schedule', label: 'Measurement schedule', trainerPrompt: 'How often should measurements be checked?', clientPrompt: 'How often do you want progress measurements?', valueType: 'enum', allowedValues: ['weekly', 'biweekly', 'monthly', 'quarterly'], requiredFor: ['charting', 'communication'], chartDataPriority: 4, masterPromptPath: 'metadata.intakeDate', questionnairePath: 'measurementSchedule', ledgerOnly: true }),
  ask({ category: 'coach_charting_data_priority', fieldKey: 'motivation_milestone', label: 'Motivation milestone', trainerPrompt: 'What milestone will motivate the client?', clientPrompt: 'What milestone would make you proud?', valueType: 'text', requiredFor: ['charting', 'communication'], chartDataPriority: 4, masterPromptPath: 'notes.mostExcitedAbout', questionnairePath: 'mostExcitedAbout' }),
]);

function prefixedPath(prefix, path) {
  return path ? `${prefix}.${path}` : null;
}

export function getClientOnboardingCoverageFields() {
  return CLIENT_ONBOARDING_QUESTION_BANK.map((item) => ({
    coverageKey: item.fieldKey,
    key: item.fieldKey,
    label: item.label,
    category: item.category,
    paths: [
      ...(item.coveragePaths || []),
      prefixedPath('masterPrompt', item.masterPromptPath),
      prefixedPath('responses', item.questionnairePath),
      prefixedPath('client', item.userProfilePath),
      prefixedPath('draft', item.userProfilePath),
    ].filter(Boolean),
    groups: item.coverageGroups,
    defaultStatus: item.defaultStatus,
    requiredFor: item.requiredFor,
    chartDataPriority: item.chartDataPriority,
    masterPromptPath: item.masterPromptPath || null,
    questionnairePath: item.questionnairePath || null,
    userProfilePath: item.userProfilePath || null,
    ledgerOnly: item.ledgerOnly,
    scanWeight: item.scanWeight,
    canAskTrainer: item.canAskTrainer,
    canAskClient: item.canAskClient,
    isSensitive: item.isSensitive,
    valueType: item.valueType,
    allowedValues: item.allowedValues,
  }));
}
