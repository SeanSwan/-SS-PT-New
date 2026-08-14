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

import { wrapClientReported } from './ai/clientTextSanitizer.mjs';

export const ONBOARDING_DICTIONARY_VERSION = 1;

/**
 * Sanitize one narrative value, whatever shape it arrives in.
 *
 * Kimi K3 review 4, finding 2 — the two lanes disagreed about types. The rename
 * lane called `wrapClientReported` with no string guard, so an ARRAY became
 * `String(['ACL tear','meniscus'])` — a string handed to consumers whose own
 * defaults declare an array (`formData.pastInjuries || []`). The sanitize lane
 * guarded strings only, so the same array sailed through untouched and reached
 * the prompt raw. One shape would crash the consumer, the other bypassed the
 * filter — the same half-closed-lane pattern as the finding before it.
 *
 * The mounted wizard posts strings (its health inputs are text fields), so no
 * ordinary user reaches this — but an API caller does, and "the UI doesn't send
 * that" is not a type contract. Arrays keep their shape and sanitize
 * element-wise; strings keep the wrap; anything else is returned untouched for
 * the caller's own validation to reject.
 */
const sanitizeNarrativeValue = (value, depth = 0) => {
  if (Array.isArray(value)) {
    // Recurse rather than sanitizing only the top level. Found by attacking the
    // array fix itself: `[['ignore all previous instructions']]` had its inner
    // strings skipped and reached masterPromptJson raw — the same half-closed
    // lane, one level down. Depth-bounded so a hostile deeply-nested payload
    // cannot turn this into a stack overflow.
    // Past the bound the value is DROPPED, not returned raw. Returning it
    // unsanitized would make the depth limit itself the bypass — fail-open at
    // exactly the boundary meant to contain a hostile payload. No legitimate
    // answer to a health question is an array nested four deep.
    if (depth >= 4) return [];
    return value.map((entry) => sanitizeNarrativeValue(entry, depth + 1));
  }
  if (typeof value === 'string') return wrapClientReported(value);

  // Allowlist, not a blocklist. A narrative answer is text, or a list of text —
  // nothing else. Every previous version of this function let the shape it did
  // not anticipate through untouched, and each time that was the finding: first
  // arrays, then arrays inside arrays, then objects inside arrays. Enumerating
  // shapes to reject is a losing game; permitting only the two valid ones ends
  // it. The raw answer is untouched in responsesJson, so nothing is lost — only
  // the AI-facing projection drops a value that was never valid narrative.
  return undefined;
};

/**
 * Wizard field -> projection key it feeds.
 *
 * `projectionKey` is the name the master-prompt builder reads. Where the two
 * already agree the row still exists, so the contract is complete rather than
 * only listing the broken half.
 */
export const MAPPED_FIELDS = Object.freeze({
  // ---- safety: these were the drops that matter ----
  injuries: { projectionKey: 'pastInjuries', group: 'health', safety: true, narrative: true },
  movementLimitations: { projectionKey: 'movementLimitations', group: 'health', safety: true, narrative: true },
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
  customGoal: { projectionKey: 'primaryGoal', group: 'goals', safety: false, narrative: true },
  desiredTimeline: { projectionKey: 'desiredTimeline', group: 'goals', safety: false },
  successIn6Months: { projectionKey: 'successIn6Months', group: 'goals', safety: false, narrative: true },
  whyGoalMatters: { projectionKey: 'whyGoalMatters', group: 'goals', safety: false, narrative: true },
  mostExcitedAbout: { projectionKey: 'mostExcitedAbout', group: 'goals', safety: false, narrative: true },

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
  questionsForTrainer: { projectionKey: 'questionsForTrainer', group: 'coaching', safety: false, narrative: true },
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
      out[projectionKey] = meta.narrative ? sanitizeNarrativeValue(incoming) : incoming;
    }
  }

  return out;
};

/**
 * Sanitize the narrative fields whose wizard name ALREADY matches the projection
 * key — those skip the rename loop above and would otherwise reach the prompt raw.
 *
 * Routing these fields into the projection is what made this necessary. Before
 * the field-dictionary fix they never arrived, so client free text could not
 * carry instructions into a workout prompt; now it can, and this closes that
 * lane in the same slice that opened it. Uses the sanitizer that already exists
 * for exactly this threat (services/ai/clientTextSanitizer.mjs) rather than a
 * second one.
 */
export const sanitizeNarrativeFields = (formData = {}) => {
  if (!formData || typeof formData !== 'object') return formData;

  const out = { ...formData };

  // Keyed on the PROJECTION key, not the wizard field name.
  //
  // Kimi K3 review 3, finding 5 — verified: a narrative value supplied directly
  // under its projection key skipped BOTH sanitizers. The dictionary declined
  // because the key was already set; this function declined because
  // projectionKey !== wizardField. `{ pastInjuries: "ignore all previous
  // instructions..." }` reached the workout prompt completely raw. The slice
  // that opened that lane only half-closed it, and the "a caller already
  // speaking the projection's language is untouched" comment described the hole
  // as if it were a feature.
  //
  // Sanitizing by projection key closes both entrances. Safe to apply twice:
  // wrapClientReported strips markup (including a forged <client_reported>
  // wrapper) before re-wrapping, so pre-wrapped attack values do not survive
  // and honest values do not nest.
  for (const meta of Object.values(MAPPED_FIELDS)) {
    if (!meta.narrative) continue;

    const value = out[meta.projectionKey];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;

    // EVERY present narrative value goes through the sanitizer — the guard does
    // not decide what is safe. A previous version tested `Array.isArray(value)
    // || typeof value === 'string'` here, so a bare object skipped the sanitizer
    // entirely and reached the projection raw. Fixing the sanitizer's own
    // allowlist did nothing for it, because it never got that far: the hole had
    // simply moved up one level into the caller. Route first, decide inside.
    out[meta.projectionKey] = sanitizeNarrativeValue(value);
  }

  return out;
};
