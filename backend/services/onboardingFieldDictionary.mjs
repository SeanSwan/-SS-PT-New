/**
 * ============================================================================
 * FILE: onboardingFieldDictionary.mjs
 * PURPOSE: The one versioned contract between what the onboarding wizard
 *          COLLECTS and what the master-prompt projection READS.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S5 · F10/F11)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The wizard and the projection were never introduced to each other. The wizard
 * collects `injuries`; the builder reads `pastInjuries` and defaults it to `[]`.
 * 20 of the wizard's 45 fields were read under a different name or not at all —
 * collected from a real person, then silently discarded. Nothing failed, nothing
 * logged, and the projection looked complete because every miss had a default.
 *
 * SCOPE OF THE HARM — stated precisely, because the obvious version is wrong.
 * This does NOT mean the workout generator is blind to injuries. It has an
 * INDEPENDENT source: aiWorkoutController reads WaiverRecord
 * (`activityTypes, medicalConditions, injuries, medications`) plus active pain
 * entries. But WaiverRecord is written only by the public waiver flow
 * (publicWaiverController) — onboarding never populates it. So a client who
 * completes onboarding and no waiver has their injury, movement-limitation and
 * PAR-Q answers collected and then dropped from the projection, while the
 * generator's only injury source stays empty.
 *
 * THE RULE THIS ENCODES
 * Every wizard field is either MAPPED to a projection key or explicitly marked
 * UNMAPPED with a reason. There is no third state, and the contract test fails
 * on any field that has neither. A default-filled miss must never again look
 * like an answer.
 */

export const ONBOARDING_DICTIONARY_VERSION = 1;

/**
 * Wizard field -> projection key it feeds.
 *
 * `projectionKey` is the name the master-prompt builder reads. Where the two
 * already agree the row still exists, so the contract is complete rather than
 * only listing the broken half.
 */
export const MAPPED_FIELDS = Object.freeze({
  // ---- safety: these were the drops that matter ----
  injuries: { projectionKey: 'pastInjuries', group: 'health', safety: true },
  movementLimitations: { projectionKey: 'movementLimitations', group: 'health', safety: true },
  chestPain: { projectionKey: 'chestPain', group: 'health', safety: true },
  heartCondition: { projectionKey: 'heartCondition', group: 'health', safety: true },
  doctorClearance: { projectionKey: 'doctorCleared', group: 'health', safety: true },
  bloodPressure: { projectionKey: 'bloodPressureReading', group: 'health', safety: true },
  medicalConditions: { projectionKey: 'medicalConditions', group: 'health', safety: true },
  medications: { projectionKey: 'medications', group: 'health', safety: true },

  // ---- training ----
  trainingExperience: { projectionKey: 'fitnessLevel', group: 'training', safety: false },
  activityLevel: { projectionKey: 'workActivityLevel', group: 'training', safety: false },
  sessionsPerWeek: { projectionKey: 'sessionFrequency', group: 'training', safety: false },
  workoutsPerWeek: { projectionKey: 'workoutsPerWeek', group: 'training', safety: false },
  workoutTypes: { projectionKey: 'workoutTypes', group: 'training', safety: false },
  favoriteExercises: { projectionKey: 'favoriteExercises', group: 'training', safety: false },
  dislikedExercises: { projectionKey: 'dislikedExercises', group: 'training', safety: false },
  sessionDuration: { projectionKey: 'sessionDuration', group: 'training', safety: false },

  // ---- goals ----
  customGoal: { projectionKey: 'primaryGoal', group: 'goals', safety: false },
  desiredTimeline: { projectionKey: 'desiredTimeline', group: 'goals', safety: false },
  successIn6Months: { projectionKey: 'successIn6Months', group: 'goals', safety: false },
  whyGoalMatters: { projectionKey: 'whyGoalMatters', group: 'goals', safety: false },
  mostExcitedAbout: { projectionKey: 'mostExcitedAbout', group: 'goals', safety: false },

  // ---- lifestyle ----
  dateOfBirth: { projectionKey: 'age', group: 'profile', safety: false },
  gender: { projectionKey: 'gender', group: 'profile', safety: false },
  occupation: { projectionKey: 'occupation', group: 'lifestyle', safety: false },
  sleepHours: { projectionKey: 'sleepHours', group: 'lifestyle', safety: false },
  stressLevel: { projectionKey: 'stressLevel', group: 'lifestyle', safety: false },
  waterIntake: { projectionKey: 'waterIntake', group: 'nutrition', safety: false },
  dietaryPreferences: { projectionKey: 'dietaryPreferences', group: 'nutrition', safety: false },
  foodAllergies: { projectionKey: 'foodAllergies', group: 'nutrition', safety: true },

  // ---- coaching admin ----
  checkInMethod: { projectionKey: 'checkInMethod', group: 'coaching', safety: false },
  checkInTime: { projectionKey: 'checkInTime', group: 'coaching', safety: false },
  questionsForTrainer: { projectionKey: 'questionsForTrainer', group: 'coaching', safety: false },
  preferredName: { projectionKey: 'preferredName', group: 'profile', safety: false },
  phone: { projectionKey: 'phone', group: 'profile', safety: false },
  email: { projectionKey: 'email', group: 'profile', safety: false },
  aiHelp: { projectionKey: 'aiHelp', group: 'coaching', safety: false },
});

/**
 * Wizard fields deliberately NOT projected, each with the reason.
 *
 * "Unmapped" is a decision, not an oversight — that distinction is the whole
 * point of this file. Anything here is excluded on purpose and the test proves
 * the set is exhaustive.
 */
export const UNMAPPED_FIELDS = Object.freeze({
  firstName: 'Identity, not training context. Handled by the name contract; never sent to a provider (rule 8).',
  lastName: 'Identity, not training context. Handled by the name contract; never sent to a provider (rule 8).',
  emergencyContactName: 'Emergency contact is operational data. Direct identifier — must never enter an AI projection.',
  emergencyContactPhone: 'Emergency contact is operational data. Direct identifier — must never enter an AI projection.',
  physicianName: 'Direct third-party identifier. The CLEARANCE is projected; the physician name is not.',
  trainingPackage: 'Commercial/billing selection. Not training context, and money-path data stays out of the projection.',
  additionalNotes: 'Free narrative. Deliberately excluded until the untrusted-text boundary is enforced for it.',
  typicalDiet: 'Free narrative superseded by the structured nutrition fields the projection already reads.',
  mealsPerDay: 'Nutrition detail not consumed by workout programming; revisit if a nutrition projection lands.',
});

/** Every wizard field the dictionary knows about. */
export const KNOWN_WIZARD_FIELDS = Object.freeze([
  ...Object.keys(MAPPED_FIELDS),
  ...Object.keys(UNMAPPED_FIELDS),
]);

/** Wizard fields whose loss is a SAFETY loss, not merely a quality loss. */
export const SAFETY_FIELDS = Object.freeze(
  Object.entries(MAPPED_FIELDS)
    .filter(([, meta]) => meta.safety)
    .map(([field]) => field),
);

/**
 * Rewrite a wizard payload into the key names the projection reads.
 *
 * Additive and non-destructive: an existing projection-shaped key always wins,
 * so a caller that already speaks the projection's language is untouched. Only
 * a key the projection would otherwise miss gets filled in.
 */
export const applyOnboardingFieldDictionary = (formData = {}) => {
  if (!formData || typeof formData !== 'object') return formData;

  const out = { ...formData };

  for (const [wizardField, meta] of Object.entries(MAPPED_FIELDS)) {
    const { projectionKey } = meta;
    if (projectionKey === wizardField) continue;

    const incoming = formData[wizardField];
    const alreadySet = out[projectionKey];
    const missing = alreadySet === undefined || alreadySet === null || alreadySet === '';

    if (incoming !== undefined && incoming !== null && incoming !== '' && missing) {
      out[projectionKey] = incoming;
    }
  }

  return out;
};
