/**
 * De-Identification Service
 * =========================
 * Strips PII from masterPromptJson before it reaches any AI provider.
 *
 * Strategy:
 *   - Replace client.name / client.preferredName with anonymous "Client #ID" label
 *   - Remove client.contact.* (email, phone)
 *   - Remove direct health identifiers that are not needed for workout generation
 *     (bloodType, medications — kept: medical conditions summary for safety)
 *   - Preserve training-relevant fields (goals, fitness level, measurements, NASM data)
 *   - Fail closed: if the payload is empty/unsafe after stripping, return null
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */
import crypto from 'crypto';
import logger from '../utils/logger.mjs';

/**
 * Fields that MUST be stripped (direct identifiers)
 */
const DIRECT_IDENTIFIER_PATHS = [
  'client.name',
  'client.preferredName',
  'client.firstName',
  'client.lastName',
  'client.fullName',
  'client.contact.email',
  'client.contact.phone',
  'client.contact.address',
  'client.contact.city',
  'client.contact.state',
  'client.contact.zip',
  'client.contact.emergencyContact',
  'client.bloodType',
  'client.ssn',
  'client.dateOfBirth',
  'client.dob',
  'client.insuranceId',
  'client.contact',         // entire contact block as fallback
  'clientProfile.firstName',
  'clientProfile.lastName',
  'clientProfile.fullName',
  'clientProfile.dateOfBirth',
  'clientProfile.dob',
  'clientProfile.contact.email',
  'clientProfile.contact.phone',
  'clientProfile.contact.address',
  'clientProfile.contact',
  'lifestyle.occupation',
  'lifestyle.employer',
  'lifestyle.workplace',
  'lifestyle.stressSources',
  'health.medications',
  'health.surgeries',
  'health.doctorName',
  'health.physician',
  'health.insuranceProvider',
];

/**
 * NON-TRAINING HEALTH FIELDS — default-DENIED (Wave 1 Slice 5).
 *
 * Owner decision Q2 (2026-08-22): health fields do not reach the LLM provider
 * until counsel approves the list in writing. Owner decision (same day) then
 * SPLIT the set Fable had grouped together, because denying it wholesale would
 * have removed the inputs that make coaching safe:
 *
 *   DENIED here      — supplements, sleep, stress. Sensitive, and not required
 *                      to program a session safely. Matched by KEY NAME at any
 *                      depth (GATED_KEY_PATTERN), not by an enumerated path
 *                      list — a path list cannot keep the category claim in the
 *                      consent copy true, and let medicalConditions slip once
 *                      already.
 *   NOT denied       — injuries, pain, measurements, medical conditions. These
 *                      are TRAINING-SAFETY data: without them Swan Coach cannot
 *                      avoid a movement that is contraindicated for this client. Removing them
 *                      would trade a privacy risk for a physical one. They are
 *                      disclosed to the user in aiConsentCopy.ts instead.
 *
 * Set COACH_HEALTH_FIELDS_ENABLED=true to forward the denied set once counsel
 * signs off. Doing so CHANGES WHAT USERS WERE TOLD — bump AI_CONSENT_VERSION in
 * frontend/src/content/aiConsentCopy.ts and re-consent before enabling.
 */
/**
 * Training-safety paths that must NEVER be gated, whatever the category
 * matcher would otherwise do to them.
 * Documented as an explicit list so a future edit has to argue with it.
 */
export const TRAINING_SAFETY_PATHS = Object.freeze([
  'painAndInjuries',
  'health.injuries',
  'health.pain',
  'health.currentPain',
  // Medical conditions joined this list on 2026-08-22 after the dry loop caught
  // the first cut of this gate stripping them. `aiPrivacy.test.mjs` had already
  // labelled them "safety-critical" with a `mild asthma` fixture, and it is
  // right: asthma, cardiac conditions and diabetes change what can be safely
  // programmed. Gating them was the same mistake as gating injuries would have
  // been — a privacy risk traded for a physical one.
  'health.conditions',
  'health.medicalConditions',
  'clientProfile.medicalConditions',
  'measurements',
  'clientProfile.measurements',
]);

/**
 * Consent version that must be LIVE before the gated categories may be
 * forwarded. Enabling them changes what users were told, so a new disclosure
 * has to exist first. Bumping this is a code change, reviewed like any other.
 */
export const GATED_FIELDS_REQUIRE_CONSENT_VERSION = '3.0';

/**
 * Remembers the last mismatching value we warned about, so a misconfiguration
 * logs once rather than once per request — but a CHANGED value warns again.
 * A boolean would have silenced the second, different misconfiguration, which
 * is the one an operator most needs to see.
 */
let lastWarnedConsentVersion = null;

/**
 * Escape hatch for the gated categories — deliberately hard to open.
 *
 * The first cut of this was a bare env flag with a comment saying "bump
 * AI_CONSENT_VERSION and re-consent before enabling". DeepSeek v4 Pro flagged
 * that on the pre-push panel and was right: a caution is not a control. An
 * operator flipping COACH_HEALTH_FIELDS_ENABLED in production would have made
 * every consent surface false the instant it was set, with nothing stopping it.
 *
 * The coupling is now structural. The operator must ALSO declare which consent
 * version they are enabling under, and it must match the version this code
 * requires. A mismatch fails CLOSED and logs critical, so the failure mode of
 * getting it wrong is "Coach sees less than it could", never "users were lied
 * to". Enabling therefore takes a deliberate code change plus a deliberate
 * deploy-time declaration, which is what the comment only asked for politely.
 */
export function areGatedHealthFieldsEnabled() {
  const flag = String(process.env.COACH_HEALTH_FIELDS_ENABLED || '').trim().toLowerCase();
  if (!['true', '1', 'on', 'enabled'].includes(flag)) return false;

  const declared = String(process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION || '').trim();
  if (declared !== GATED_FIELDS_REQUIRE_CONSENT_VERSION) {
    // Log ONCE per process, not once per deIdentify call. A misconfigured flag
    // would otherwise emit an error line on every Coach request and bury the
    // signal it exists to raise (ox-alpha, post-ship panel).
    if (lastWarnedConsentVersion !== declared) {
      lastWarnedConsentVersion = declared;
      logger.error(
      '[DeIdentification] COACH_HEALTH_FIELDS_ENABLED is set but the declared consent '
      + 'version does not match the version this build requires. Gated health fields '
      + 'remain WITHHELD. Ship the new disclosure, then set '
      + 'COACH_HEALTH_FIELDS_CONSENT_VERSION to the required value.',
        { required: GATED_FIELDS_REQUIRE_CONSENT_VERSION, declared: declared || '(unset)' },
      );
    }
    return false;
  }
  return true;
}

/**
 * Fields that are safe to keep for workout generation context
 */
const SAFE_FIELD_PATHS = [
  'client.alias',
  'client.age',
  'client.gender',
  'client.goals',
  'health.medicalConditions', // kept for safety — generic conditions, not identifiable
  'health.injuries',          // kept for exercise contraindications
  'health.currentPain',       // kept for exercise safety
  'health.supplements',
  'measurements',
  'baseline',
  'training',
  'nutrition',
  'lifestyle.sleepHours',
  'lifestyle.sleepQuality',
  'lifestyle.stressLevel',
  'lifestyle.activityLevel',
];

/**
 * Deep-clone a plain object (JSON-safe)
 */
function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get a nested value by dot-path (e.g. "client.contact.email")
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * Delete a nested key by dot-path. Returns true if deletion occurred.
 */
function deleteNestedKey(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = current[keys[i]];
  }
  if (current !== null && current !== undefined && typeof current === 'object') {
    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      delete current[lastKey];
      return true;
    }
  }
  return false;
}

/**
 * Set a nested value by dot-path, creating intermediate objects as needed.
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Compute SHA-256 hash of a JSON-serializable value.
 */
export function hashPayload(payload) {
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * De-identify a masterPromptJson payload for AI processing.
 *
 * @param {Object} masterPromptJson - Raw master prompt JSON from User model
 * @param {Object} options
 * @param {number|string} [options.clientId] - Anonymous client ID (from User.id)
 * @param {string} [options.spiritName] - Preferred anonymous alias when provided
 * @returns {{ deIdentified: Object, strippedFields: string[] } | null}
 *   Returns null if the payload is empty/unsafe after stripping (fail-closed).
 */

/**
 * Key-name matcher for the gated categories.
 *
 * The first cut of this gate was an enumerated PATH list. The consent copy,
 * however, makes a CATEGORY claim ("sleep, stress and supplement data are
 * withheld"). A path list cannot keep a category claim true: an unlisted
 * variant such as `clientProfile.sleep`, `health.sleepQuality` or
 * `wellness.stressLevel` flows while the copy says it does not. GLM 5.3 flagged
 * this on the pre-push panel and correctly identified it as the SAME drift
 * class that had already bitten once in this wave, when `health.medicalConditions`
 * slipped through an enumerated list.
 *
 * Matching on the key NAME at any depth makes the code enforce the category the
 * copy promises, so new field spellings are covered by default instead of
 * silently escaping.
 *
 * TRAINING-SAFETY OVERRIDE: injuries, pain, measurements and medical conditions
 * are never gated no matter where they appear — see TRAINING_SAFETY_PATHS.
 */
/**
 * A key is gated only when it is RECOGNISABLY A LIFESTYLE METRIC — the gated
 * concept, optionally followed by a measurement word.
 *
 * This default is inverted on purpose, and it is the most important decision in
 * this file. The first cut gated anything containing sleep/stress/supplement and
 * exempted a list of clinical words. That stripped `stressFracture`,
 * `sleepApnea` and `supplementalOxygenNeeded` — a tibial stress fracture,
 * moderate apnea and an oxygen requirement, every one an exercise
 * contraindication (GLM 5.3, post-ship panel). Widening the clinical exemption
 * list then missed `stressEchocardiogram`, caught by our own test. Clinical
 * vocabulary cannot be enumerated; that is the same trap that already produced
 * three defects in this workstream.
 *
 * THE ASYMMETRY: over-gating removes what keeps programming safe and can hurt
 * someone. Under-gating leaks a lifestyle metric, which the consent copy can
 * disclose honestly. Those are not equivalent, so an unrecognised key is KEPT.
 *
 *   gated  — sleep, sleepHours, sleepQuality, sleepDebtHours, stress,
 *            stressLevel, stressScore, supplements, supplementStack
 *   kept   — stressFracture, sleepApnea, supplementalOxygenNeeded,
 *            stressEchocardiogram, and any clinical term we never thought of
 */
const GATED_CONCEPT = /^(sleep|stress|supplement)/i;
const METRIC_SUFFIX = /^(s|es)?$|(hour|hr|quality|level|score|rating|debt|duration|minute|night|intake|taken|stack|count|avg|average|per)/i;

/** Last path segment of every protected path, so the exported list is LOAD-BEARING. */
const SAFETY_KEY_NAMES = new Set(
  TRAINING_SAFETY_PATHS.map((p) => p.split('.').pop().toLowerCase()),
);

/**
 * True when this key is a gated lifestyle metric.
 *
 * TRAINING_SAFETY_PATHS is consulted here by name. That export previously
 * described itself as the protective list and was asserted by a test, while the
 * stripper decided purely on a regex and never read it — so the documented
 * procedure ("add a path here to protect it") changed nothing. It is now
 * actually consulted, which is the difference between a comment and a control.
 */
function isGatedLifestyleKey(key) {
  const name = String(key);
  if (SAFETY_KEY_NAMES.has(name.toLowerCase())) return false;
  const m = name.match(GATED_CONCEPT);
  if (!m) return false;
  const remainder = name.slice(m[0].length);
  return METRIC_SUFFIX.test(remainder);
}

/**
 * Walk the payload and delete any key whose NAME matches a gated category.
 * Logs the path only — never the value (rules 8/44/59).
 */
function stripGatedHealthFields(node, strippedFields, prefix = '') {
  if (!node || typeof node !== 'object') return;

  for (const key of Object.keys(node)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isGatedLifestyleKey(key)) {
      delete node[key];
      strippedFields.push(path);
      logger.info('[DeIdentification] gated health field withheld', { field: path });
      continue;
    }

    const value = node[key];
    if (!value || typeof value !== 'object') continue;

    // Arrays MUST be walked. The first cut guarded with `!Array.isArray(value)`,
    // which meant a payload like `recoveryLogs: [{ sleepHours, stressLevel }]`
    // sailed straight through the gate while every consent surface said those
    // fields were withheld. Found by the post-ship panel (ox-alpha) and
    // reproduced before fixing.
    //
    // This is the THIRD appearance of one drift class in this workstream:
    // an enumerated path list missed medicalConditions, then the category
    // matcher missed array-nested keys. Each fix narrowed the hole without
    // closing the shape. Recursing into every container closes it by shape
    // rather than by enumeration.
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === 'object') {
          stripGatedHealthFields(item, strippedFields, `${path}[${i}]`);
        }
      });
      continue;
    }

    stripGatedHealthFields(value, strippedFields, path);
  }
}


export function deIdentify(masterPromptJson, options = {}) {
  if (!masterPromptJson || typeof masterPromptJson !== 'object') {
    logger.warn('[DeIdentification] Received null/invalid masterPromptJson — fail closed');
    return null;
  }

  const payload = deepClone(masterPromptJson);
  const strippedFields = [];
  const { clientId, spiritName } = options;
  const existingAlias = getNestedValue(payload, 'client.alias');

  const normalizedSpiritName = typeof spiritName === 'string' && spiritName.trim()
    ? spiritName.trim()
    : null;
  const normalizedExistingAlias = typeof existingAlias === 'string' && existingAlias.trim()
    ? existingAlias.trim()
    : null;

  // Name fields should only use an explicitly supplied alias.
  // Existing payload aliases may be preserved separately, but should not replace
  // the generic de-identified name when the caller did not supply one.
  const anonymousLabel = normalizedSpiritName || (clientId ? `Client #${clientId}` : 'Client');
  const aliasLabel = normalizedSpiritName || normalizedExistingAlias || anonymousLabel;

  // 1. Replace name fields with the STABLE pseudonymous client label.
  //    NOTE: this is de-identification, not anonymization — the label is
  //    stable across sessions and travels with injury/measurement data.
  //    User-facing copy must say "pseudonymized", never "anonymous":
  //    see frontend/src/content/aiConsentCopy.ts (Wave 1 Slice 3).
  const originalName = getNestedValue(payload, 'client.name');
  if (originalName !== undefined) {
    setNestedValue(payload, 'client.name', anonymousLabel);
    strippedFields.push('client.name');
  }

  const originalPreferred = getNestedValue(payload, 'client.preferredName');
  if (originalPreferred !== undefined) {
    setNestedValue(payload, 'client.preferredName', anonymousLabel);
    strippedFields.push('client.preferredName');
  }

  const originalClientProfileName = getNestedValue(payload, 'clientProfile.name');
  if (originalClientProfileName !== undefined) {
    setNestedValue(payload, 'clientProfile.name', anonymousLabel);
    strippedFields.push('clientProfile.name');
  }

  const originalClientProfilePreferred = getNestedValue(payload, 'clientProfile.preferredName');
  if (originalClientProfilePreferred !== undefined) {
    setNestedValue(payload, 'clientProfile.preferredName', anonymousLabel);
    strippedFields.push('clientProfile.preferredName');
  }

  if (getNestedValue(payload, 'client.alias') !== aliasLabel) {
    setNestedValue(payload, 'client.alias', aliasLabel);
  }

  // 2. Strip direct identifiers
  for (const path of DIRECT_IDENTIFIER_PATHS) {
    // Skip name fields — already handled above
    if (
      path === 'client.name'
      || path === 'client.preferredName'
      || path === 'clientProfile.name'
      || path === 'clientProfile.preferredName'
    ) continue;

    if (deleteNestedKey(payload, path)) {
      strippedFields.push(path);
    }
  }

  // 2b. Gated non-training health fields — removed unless counsel has signed
  //     off and COACH_HEALTH_FIELDS_ENABLED is set. Only the field NAME is
  //     logged, never the value (rules 8/44/59).
  if (!areGatedHealthFieldsEnabled()) {
    stripGatedHealthFields(payload, strippedFields);
  }

  // 3. Deep PII scan: search all string values for email/phone patterns and redact
  scanAndRedactPII(payload, strippedFields);

  // 4. Double-check: ensure no real name leaked into the anonymous label
  if (originalName && typeof originalName === 'string' && originalName.length > 2) {
    const currentName = getNestedValue(payload, 'client.name') || '';
    if (typeof currentName === 'string' && currentName.toLowerCase().includes(originalName.toLowerCase())) {
      logger.warn('[DeIdentification] Real name leaked into label — using generic fallback');
      setNestedValue(payload, 'client.name', anonymousLabel);
      setNestedValue(payload, 'client.preferredName', anonymousLabel);
      strippedFields.push('name_leak_corrected');
    }
  }

  // 5. Fail-closed check: payload must still have meaningful training context
  const hasTrainingContext =
    getNestedValue(payload, 'training') !== undefined ||
    getNestedValue(payload, 'client.goals') !== undefined ||
    getNestedValue(payload, 'goals') !== undefined ||
    getNestedValue(payload, 'fitnessBackground') !== undefined ||
    getNestedValue(payload, 'trainingHistory') !== undefined ||
    getNestedValue(payload, 'painAndInjuries') !== undefined ||
    getNestedValue(payload, 'measurements') !== undefined ||
    getNestedValue(payload, 'baseline') !== undefined;

  if (!hasTrainingContext) {
    logger.warn('[DeIdentification] Payload has no training context after stripping — fail closed');
    return null;
  }

  return {
    deIdentified: payload,
    strippedFields,
  };
}

/**
 * Deep scan all string values in an object for PII patterns.
 * Redacts emails, phone numbers, SSN patterns, and addresses.
 * This is a safety net — catches PII in unexpected fields.
 *
 * @param {Object} obj — The payload to scan (mutated in place)
 * @param {string[]} strippedFields — Array to log redacted field paths
 * @param {string} [prefix=''] — Current path prefix for logging
 */
function scanAndRedactPII(obj, strippedFields, prefix = '') {
  if (!obj || typeof obj !== 'object') return;

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      let redacted = value;
      let wasRedacted = false;

      if (EMAIL_REGEX.test(redacted)) {
        redacted = redacted.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
        wasRedacted = true;
      }
      if (PHONE_REGEX.test(redacted)) {
        redacted = redacted.replace(PHONE_REGEX, '[REDACTED_PHONE]');
        wasRedacted = true;
      }
      if (SSN_REGEX.test(redacted)) {
        redacted = redacted.replace(SSN_REGEX, '[REDACTED_SSN]');
        wasRedacted = true;
      }

      if (wasRedacted) {
        obj[key] = redacted;
        strippedFields.push(`pii_scan:${path}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      scanAndRedactPII(value, strippedFields, path);
    }
  }
}
