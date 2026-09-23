---
title: "Client Dashboard — Fable-orchestrated forward review"
decision: "What is still wrong in the as-built code, and what is the BLUEPRINT for the next level?"
status: open
supersedes: none
originating_model: claude-fable-5
---

# DUAL REMIT — reviewed by you, orchestrated by Fable

Fable 5 is orchestrating this round in-session and will arbitrate your replies.
You are a peer seat. Two deliverables are wanted from you, weighted equally.

## REMIT A — hostile review of the AS-BUILT code below

This code is LIVE in production (health endpoint confirms commit d73468d). It
has survived four panels and two dry loops; 30+ defects were found and fixed
across those rounds, including: an array-bypass leak, a matcher stripping
exercise contraindications, a REST-only authorization lane the socket bypassed,
a consent-version loop, a visible-but-unwritable staff thread, and a
regex-precedence bug two seats found independently. Assume the obvious is done.
Find what five rounds missed. Concrete failure paths only.

## REMIT B — the FORWARD blueprint (this is the part the owner most wants)

The owner's directive, verbatim intent: "enhance, upgrade, add the missing
gaps... I want blueprints and plans, not just suggestions... blueprints,
wireframes, flowcharts and mermaids so that we can move forward and take this
to the next level."

So: given this codebase and the remaining backlog below, what should be BUILT
next, and how? Propose concrete architecture. If you propose a design, sketch
it — ASCII wireframe, mermaid, state machine, or numbered slice plan with
acceptance criteria. A suggestion without a shape will be discounted at
arbitration.

**To the ox seat specifically:** the owner asked for YOUR view by name — "what
we could do to improve... I really wanna hear what ox has to say." You have
1M context and no history with this codebase's assumptions. Spend your answer
on Remit B. What would you build next, and what shape would it take?

## The remaining backlog (from the prior Fable ruling — challenge it or extend it)

- Slice 6: CoachContextEnvelope — `teachPrompt` still ships prose in query
  strings from 4 producers (client observatory, workouts page, current-workout
  card, admin planner) into history/logs/referrers. Largest open item.
- Slice 4: decompose 6 over-cap consent/onboarding files (770-800 lines each).
- Slice 8: subject-context hygiene (sessionStorage rehydration across auth
  change; 21 consumers of GlobalClientContext).
- Slice 10/11: "Today" Home recomposition; ClientProgressStory.
- Slice 12: five-destination IA with route aliases.
- Unbuilt: outbound allowlist DTO to replace the de-identification denylist.
- Unbuilt: focus-trap stack (prerequisite for migrating 3 in-house modals).
- Open owner items: GitHub Pro purchase (no CI gate on main exists at all);
  counsel sign-off on health fields.

## Domain facts

- Clients buy sessions/packages ($175-$33.6k), NOT subscriptions; a separate
  elite tier gates social. Messaging is relationship-gated (active
  ClientTrainerAssignment), community DMs tier-gated. Staff bypass.
- Consent: CURRENT=2.0; new grants only accept 2.0; stale/null version 403s
  with AI_CONSENT_STALE_VERSION and the interceptor routes to the consent
  screen. Health-field egress: lifestyle metrics gated by a word-classifier
  (unknown words KEPT and logged); injuries/pain/measurements/conditions always
  flow (owner ruling — they are exercise contraindications).
- protect() stores req.user.id as a STRING. conversation_participants is
  snake_case; client_trainer_assignments has QUOTED camelCase columns.

## Output format

```
## VERDICT: <one line on Remit A>
## A. REMAINING DEFECTS (concrete failure paths, ranked)
## B. THE FORWARD BLUEPRINT (designs, not adjectives — mermaid/wireframe/slices)
## C. WHAT I WOULD KILL from the backlog above, and why
## CONFIDENCE + REQUIRED LOOKUPS
```

---

# THE AS-BUILT CODE (current text, not diffs)


## FILE: backend/services/deIdentificationService.mjs
```js
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
 * A key is gated when every word in it is recognisable LIFESTYLE vocabulary.
 * An unknown word means the key is probably clinical, and it is KEPT.
 *
 * Three earlier shapes failed here, and the sequence is the lesson:
 *   1. an enumerated PATH list           — missed medicalConditions
 *   2. contains-token minus a clinical   — missed stressEchocardiogram; no one
 *      exemption list                      can enumerate clinical vocabulary
 *   3. prefix + metric-suffix allowlist  — missed avgSleepHours, nightlyStress,
 *                                          sleepNotes, supplementRegimen,
 *                                          reportedStressLevel, typicalSleep
 *
 * Shape 3 was NARROWER than the risk the owner accepted, and the disclosure
 * ("your supplement, sleep and stress data" is withheld) promised more than it
 * delivered. GLM 5.3 caught that on the UX panel.
 *
 * This shape asks a question that has a bounded answer. Lifestyle modifiers are
 * a small, closed vocabulary we own; clinical vocabulary is open-ended and
 * belongs to medicine. So we enumerate OUR side and treat everything else as
 * clinical.
 *
 * THE ASYMMETRY, unchanged and decisive: over-gating strips exercise
 * contraindications and can hurt someone; under-gating leaks a lifestyle metric
 * the consent copy can disclose honestly. An unrecognised word means KEEP —
 * and gets logged, so the unknown vocabulary becomes visible instead of silent.
 *
 *   gated : sleep, sleepHours, avgSleepHours, nightlyStress, sleepNotes,
 *           supplementRegimen, reportedStressLevel, typicalSleep, supplements
 *   kept  : stressFracture, sleepApnea, supplementalOxygenNeeded,
 *           stressEchocardiogram, and any clinical term nobody listed
 */
const GATED_TOKEN = /(sleep|stress|supplement)/i;

/** Words that mark a key as OUR lifestyle telemetry rather than clinical data. */
const LIFESTYLE_WORDS = new Set([
  'sleep', 'stress', 'supplement', 'supplements', 'supplemental',
  'avg', 'average', 'mean', 'total', 'typical', 'nightly', 'daily', 'weekly',
  'reported', 'self', 'perceived', 'estimated',
  'hours', 'hour', 'hrs', 'minutes', 'mins', 'duration', 'time',
  'level', 'levels', 'score', 'scores', 'rating', 'rank', 'index',
  'quality', 'debt', 'count', 'per', 'night', 'day', 'week',
  'notes', 'note', 'diary', 'journal', 'log', 'logs', 'entry', 'entries',
  'regimen', 'stack', 'intake', 'taken', 'dose', 'dosage', 'schedule',
  'data', 'value', 'values', 'summary', 'history', 'trend',
]);

/** Split camelCase / snake_case / kebab-case into lowercase words. */
function keyWords(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** Last path segment of every protected path, so the exported list is LOAD-BEARING. */
const SAFETY_KEY_NAMES = new Set(
  TRAINING_SAFETY_PATHS.map((p) => p.split('.').pop().toLowerCase()),
);

/**
 * @returns {'gate'|'keep'|'ambiguous'} 'ambiguous' means it carries a gated
 * token but also unknown vocabulary — kept, and worth surfacing.
 */
function classifyKey(key) {
  const name = String(key);
  if (SAFETY_KEY_NAMES.has(name.toLowerCase())) return 'keep';
  if (!GATED_TOKEN.test(name)) return 'keep';
  const unknown = keyWords(name).filter((w) => !LIFESTYLE_WORDS.has(w));
  return unknown.length === 0 ? 'gate' : 'ambiguous';
}

/**
 * Walk the payload and delete any key whose NAME matches a gated category.
 * Logs the path only — never the value (rules 8/44/59).
 */
function stripGatedHealthFields(node, strippedFields, prefix = '') {
  if (!node || typeof node !== 'object') return;

  for (const key of Object.keys(node)) {
    const path = prefix ? `${prefix}.${key}` : key;

    const verdict = classifyKey(key);

    // Ambiguous = carries a gated token AND unknown vocabulary. Kept, because
    // the unknown word is probably clinical and stripping it could hurt someone
    // — but logged, so the vocabulary we do not know about stops being
    // invisible. This is the feedback loop three previous shapes lacked.
    if (verdict === 'ambiguous') {
      logger.warn('[DeIdentification] ambiguous health-ish key KEPT — review the vocabulary', {
        field: prefix ? `${prefix}.${key}` : key,
      });
    }

    if (verdict === 'gate') {
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
```

## FILE: backend/services/messagingAccessRepository.mjs
```js
/**
 * FILE: messagingAccessRepository.mjs
 * PURPOSE: SQL the messaging authorization gate needs, kept out of the gate.
 * CREATED: 2026-08-22 · extracted so requireMessagingAccess stays under the
 *          300-line cap after the pre-push panel fixes, and to match this
 *          codebase's convention of keeping raw SQL in a repository module
 *          (see messagingParticipantRepository.mjs).
 *
 * SCHEMA NOTE (verified against the tree, not memory):
 *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
 *                                ("clientId", "trainerId"), status text.
 *   conversation_participants  : snake_case table AND columns.
 *   The Sequelize model declaring 'ConversationParticipants' with camelCase
 *   columns is DRIFTED; every runtime query uses the snake_case form here.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

/** Strict positive-integer coercion. Returns null for anything else. */
export
function toId(value) {
  // Deliberately IDENTICAL to the messaging controller's toStrictPositiveInt
  // (services/messagingGroupPolicy.mjs).
  //
  // The first cut used Number.parseInt, which is lenient: '900abc', '0900' and
  // 900.9 all became 900, while the controller's strict test rejected them. A
  // probe found four divergent inputs. That particular differential happened to
  // fail safe — the gate authorized an id the controller then dropped — but a
  // gate and the code it guards parsing their inputs differently is a latent
  // bypass waiting for someone to relax the other side. GLM 5.3 flagged the
  // class on the post-ship panel; the direction was the reverse of its guess,
  // and the fix is the same either way: ONE parse rule, so "the id the gate
  // approved" and "the id the controller acts on" cannot diverge.
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Every user id this actor has an ACTIVE assignment with, in either direction:
 * clients get their trainers, trainers get their clients.
 *
 * @param {number} userId
 * @returns {Promise<Set<number>|null>} null signals a lookup failure (deny).
 */
export async function loadAssignedCounterpartyIds(userId) {
  const id = toId(userId);
  if (!id) return null;

  try {
    const rows = await sequelize.query(
      `SELECT "trainerId" AS counterparty
         FROM client_trainer_assignments
        WHERE "clientId" = :id AND status = 'active'
        UNION
       SELECT "clientId" AS counterparty
         FROM client_trainer_assignments
        WHERE "trainerId" = :id AND status = 'active'`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return new Set(rows.map((r) => toId(r.counterparty)).filter(Boolean));
  } catch (error) {
    logger.warn('[MessagingAccess] assignment lookup failed — denying relationship lane', {
      userId: id,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}

/**
 * Active membership of a conversation, from the actor's point of view.
 *
 * Returns BOTH whether the actor is themselves an active participant and who
 * the other participants are. The membership half matters: without it, a
 * conversation whose only other member happened to be the actor's assigned
 * trainer would satisfy the subset test even though the actor is not in the
 * thread at all. Controllers do enforce membership downstream, but a gate that
 * depends on a later gate is authorization by luck.
 *
 * @returns {Promise<{actorIsMember:boolean, others:number[]}|null>}
 *          null signals a lookup failure (deny).
 */
export async function loadConversationMembers(conversationId, actorId) {
  const convId = toId(conversationId);
  const actor = toId(actorId);
  if (!convId || !actor) return null;

  try {
    const rows = await sequelize.query(
      `SELECT cp.user_id AS "userId",
              CASE WHEN u.role = 'user' THEN 'client' ELSE u.role END AS "platformRole"
         FROM conversation_participants cp
         JOIN "Users" u ON u.id = cp.user_id
        WHERE cp.conversation_id = :convId
          AND cp.deleted_at IS NULL`,
      { replacements: { convId }, type: QueryTypes.SELECT },
    );
    const all = rows
      .map((r) => ({ id: toId(r.userId), role: r.platformRole }))
      .filter((r) => r.id);
    return {
      actorIsMember: all.some((r) => r.id === actor),
      others: all.filter((r) => r.id !== actor),
    };
  } catch (error) {
    logger.warn('[MessagingAccess] participant lookup failed — denying relationship lane', {
      conversationId: convId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}


/**
 * Is this actor allowed to write into this conversation under the RELATIONSHIP
 * lane? Shared by the REST middleware and the websocket handler.
 *
 * WHY THIS EXISTS. The relationship lane shipped as Express middleware on
 * messagingRoutes only. `socket/socket.mjs` is a complete second way to send a
 * message and checked membership alone, so a free-tier client with an active
 * assignment could be 403'd by REST on an old community thread and still write
 * to it over the socket. Two post-ship reviewers (ox-alpha, GLM 5.3) flagged the
 * socket path independently, and that file's OWN comment already says it:
 * "Fixing only REST would have been a false fix — this socket handler is a
 * complete second way to send." The lane fix reproduced the exact mistake the
 * file warns about.
 *
 * Returns true when the write is permitted. FAIL-CLOSED: any lookup failure
 * denies, matching the middleware.
 *
 * PRECONDITION — the caller MUST have already established that the actor is an
 * active participant of this conversation. Staff and community-entitled actors
 * short-circuit here WITHOUT a membership query, deliberately: that query is on
 * the per-message hot path and the two callers both check membership first
 * (socket.mjs via isActiveParticipant, REST via the conversation scope). Grok
 * 4.6 flagged that the name promises more than the body verifies — it decides
 * the LANE, not membership. Do not call it as a standalone authorization.
 *
 * @param {{id:*, role?:string}} actor
 * @param {number} conversationId
 * @param {boolean} hasCommunityAccess  already-resolved entitlement
 */
export async function isRelationshipWriteAllowed(actor, conversationId, hasCommunityAccess) {
  if (actor?.role === 'admin' || actor?.role === 'trainer') return true;
  if (hasCommunityAccess) return true;

  const actorId = toId(actor?.id);
  if (!actorId) return false;

  const counterparties = await loadAssignedCounterpartyIds(actorId);
  if (!counterparties || counterparties.size === 0) return false;

  const membership = await loadConversationMembers(conversationId, actorId);
  if (membership === null) return false;
  if (!membership.actorIsMember) return false;
  if (membership.others.length === 0) return false;

  // Staff count as reachable, EXACTLY as the list filter counts them.
  //
  // The list was widened to keep the auto-created admin support thread visible;
  // this gate was not, so that thread became visible-but-unwritable and answered
  // a reply with "You can message your assigned trainer here" — on a thread
  // containing an admin, not a trainer. A read-only dead end with lying copy is
  // worse than the hidden thread it replaced. GLM 5.3 caught the asymmetry.
  //
  // `platformRole` comes from Users.role, never the per-conversation role, so a
  // client holding conversation-admin in a group cannot spoof staff here.
  return membership.others.every(
    (m) => counterparties.has(m.id) || m.role === 'admin' || m.role === 'trainer',
  );
}
```

## FILE: backend/middleware/requireMessagingAccess.mjs
```js
/**
 * ============================================================================
 * FILE: requireMessagingAccess.mjs
 * PURPOSE: Messaging authorization — relationship lane OR subscription lane
 * CREATED: 2026-08-21 · Wave 1 Slice 1 (client-dashboard remediation)
 * ============================================================================
 *
 * WHAT THIS FILE DOES
 * Replaces the blanket `requireTier('elite','trainer.messaging')` gate on
 * /api/messaging. That gate conflated a COACHING capability with a BILLING
 * tier: `tier` is written only by subscription checkout, and no package or
 * session-purchase controller writes it — so a client on a $33,600 training
 * package stays `tier: 'free'` and was 402'd out of contacting the trainer
 * they are paying. The permission key itself is named `trainer.messaging`.
 *
 * TWO LANES, evaluated in this order:
 *
 *   1. COMMUNITY lane  — `requireTier('elite')` semantics, unchanged.
 *      Elite/premium (and live trials, per requireTier's TRIAL_EFFECTIVE_TIER)
 *      keep FULL messaging: any participant, any conversation. The social-DM
 *      monetization rule is preserved exactly as-is (owner decision Q1: Yes).
 *
 *   2. RELATIONSHIP lane — NEW. A user with an active ClientTrainerAssignment
 *      may message ONLY their assigned counterparties, regardless of tier.
 *      Scoped deliberately: this is an accountability and safety channel
 *      (pain, injury, schedule), not a free pass into community DMs.
 *
 * Staff (admin/trainer) bypass first, matching requireTier's existing
 * behavior, so no trainer-side workflow changes.
 *
 * FAIL-CLOSED: any error resolving the relationship denies the relationship
 * lane. It never falls through to "allow". The community lane keeps
 * requireTier's own JWT-claim fallback for transient DB trouble.
 *
 * SCHEMA NOTE (verified against the tree, not memory — CLAUDE.md rule 58):
 *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
 *                                ("clientId", "trainerId"), status text.
 *   conversation_participants  : snake_case table AND columns
 *                                (conversation_id, user_id, deleted_at).
 *   The Sequelize model declares tableName 'ConversationParticipants' with
 *   camelCase columns — that model is DRIFTED. Every runtime query in this
 *   codebase (19 references) uses the snake_case form used here.
 *
 * ID NOTE: `protect` stores req.user.id as a STRING (authMiddleware toStringId).
 * Every comparison here goes through toId() so string/number mismatches cannot
 * silently deny a legitimate user — the exact bug fixed in
 * checkTrainerClientRelationship on 2026-04-18.
 */

import logger from '../utils/logger.mjs';
import {
  toId,
  loadAssignedCounterpartyIds,
  loadConversationMembers,
} from '../services/messagingAccessRepository.mjs';
import { meetsMinimumTier, tierDisplayName, featureLabel } from '../config/tierCatalog.mjs';
import { isGatingEnabled, resolveCurrentEntitlement } from './requireTier.mjs';

const COMMUNITY_MIN_TIER = 'elite';
const FEATURE_KEY = 'trainer.messaging';

/**
 * True when every participant id in the request body is an assigned
 * counterparty. Vacuously true when the body carries none.
 *
 * Used by BOTH the create and conversation scopes: "who may I put in a thread"
 * must be one rule, or the stricter scope is bypassable via the looser one.
 */
function assertRequestedParticipantsAllowed(req, counterparties, actorId) {
  // adminIds is included deliberately: promoting an unrelated user to admin of a
  // coach thread is the same escalation as adding them (Sol, pre-push panel).
  const requested = [
    ...(Array.isArray(req.body?.participantIds) ? req.body.participantIds : []),
    ...(Array.isArray(req.body?.adminIds) ? req.body.adminIds : []),
  ];
  const ids = requested.map(toId).filter((id) => id && id !== actorId);
  if (ids.length === 0) return true;
  return ids.every((id) => counterparties.has(id));
}

/** requireTier-compatible 402 so the frontend paywall interceptor is unchanged. */
function sendTierRequired(res, entitlement) {
  const { actualTier = 'free', effectiveTier = 'free', isTrial = false } = entitlement || {};
  return res.status(402).json({
    success: false,
    message: `This feature requires ${tierDisplayName(COMMUNITY_MIN_TIER)} or higher.`,
    code: 'TIER_REQUIRED',
    featureName: featureLabel(FEATURE_KEY),
    feature: FEATURE_KEY,
    requiredTier: COMMUNITY_MIN_TIER,
    currentTier: actualTier,
    effectiveTier,
    isTrial,
    upgradeUrl: '/ascension',
  });
}

/** 403 for a relationship user reaching outside their assigned counterparties. */
function sendOutsideRelationship(res) {
  return res.status(403).json({
    success: false,
    message: 'You can message your assigned trainer here. Upgrade to message other members.',
    code: 'OUTSIDE_COACHING_RELATIONSHIP',
    feature: FEATURE_KEY,
    upgradeUrl: '/ascension',
  });
}

/**
 * @param {Object}  options
 * @param {'list'|'create'|'conversation'} options.scope
 *   list         — GET /conversations. Already self-scoped by the controller,
 *                  so any active assignment is sufficient.
 *   create       — POST /conversations. body.participantIds must be a subset
 *                  of the actor's assigned counterparties.
 *   conversation — routes carrying :id. Every OTHER active participant must be
 *                  an assigned counterparty.
 */
export function requireMessagingAccess({ scope = 'conversation' } = {}) {
  return async (req, res, next) => {
    // Lane 0 — staff bypass, identical to requireTier's.
    if (req.user?.role === 'admin' || req.user?.role === 'trainer') return next();

    // Emergency kill switch, identical to requireTier's.
    if (!isGatingEnabled()) return next();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Lane 1 — COMMUNITY. Unchanged elite/trial semantics; full access.
    let entitlement = null;
    try {
      entitlement = await resolveCurrentEntitlement(req);
      if (meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER)) return next();
    } catch (error) {
      // resolveCurrentEntitlement already falls back to the JWT claim
      // internally; a throw here means something worse. Fall through to the
      // relationship lane rather than 500 — a paying client with an active
      // assignment must still reach their trainer.
      logger.warn('[MessagingAccess] entitlement resolution threw — trying relationship lane', {
        userId: req.user?.id,
        errorName: error instanceof Error ? error.name : typeof error,
      });
    }

    // Lane 2 — RELATIONSHIP. Tier is irrelevant from here down.
    const actorId = toId(req.user.id);
    const counterparties = await loadAssignedCounterpartyIds(actorId);

    // null = lookup failed (fail closed). Empty set = genuinely no assignment.
    if (!counterparties || counterparties.size === 0) {
      return sendTierRequired(res, entitlement);
    }

    if (scope === 'list') {
      // Relationship-only viewers must not see legacy community threads.
      //
      // Pre-push panel (GLM 5.3 and Sol, independently): the list response
      // carries last-message preview text and participant names/photos. Passing
      // the gate on "has any assignment" therefore widened access for a
      // downgraded subscriber who kept a trainer -- previously 402 and nothing,
      // now previews of threads whose read endpoints 403. Hand the controller
      // the counterparty set so it can narrow the result to relationship
      // threads. The gate decides access; the controller decides scope.
      req.messagingAccessLane = 'relationship';
      req.messagingCounterparties = counterparties;
      return next();
    }

    if (scope === 'create') {
      const requested = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
      const ids = requested.map(toId).filter((id) => id && id !== actorId);
      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one participant is required.',
        });
      }
      if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
        return sendOutsideRelationship(res);
      }
      req.messagingAccessLane = 'relationship';
      return next();
    }

    // scope === 'conversation'
    const membership = await loadConversationMembers(req.params?.id, actorId);
    if (membership === null) return sendOutsideRelationship(res); // fail closed

    // The actor must actually be in the thread, and it must not be an empty or
    // unknown conversation. Both are denied through the relationship lane.
    if (!membership.actorIsMember) return sendOutsideRelationship(res);
    if (membership.others.length === 0) return sendOutsideRelationship(res);

    // `others` now carries {id, role} so both gates can honour staff the same
    // way — widening the list without widening the write is what produced the
    // visible-but-unwritable admin thread. Mirrors isRelationshipWriteAllowed.
    const allInside = membership.others.every(
      (m) => counterparties.has(m.id) || m.role === 'admin' || m.role === 'trainer',
    );
    if (!allInside) return sendOutsideRelationship(res);

    // Validate anyone being ADDED, not just who is already here.
    //
    // Found by the pre-push panel (DeepSeek v4 Flash and Qwen 3.8 independently).
    // POST /conversations/:id/participants carries new users in the body. Without
    // this check the membership test above passes trivially — the thread's only
    // other member IS your assigned trainer — and the controller then adds an
    // arbitrary stranger, handing them the full message history. Creating such a
    // thread was already blocked by the `create` scope; adding to one was not,
    // which made the create-scope restriction bypassable in two steps.
    if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
      return sendOutsideRelationship(res);
    }

    req.messagingAccessLane = 'relationship';
    return next();
  };
}

/**
 * Resolve the two messaging capabilities for the authenticated actor, using the
 * SAME rules the middleware enforces. Exported so `GET /api/messaging/
 * capabilities` cannot drift from the gate it describes — a frontend that
 * recomputes entitlement locally is how the original bug survived (the server
 * treats a live trial as elite, the UI did not).
 *
 * @returns {Promise<{canMessageAssignedCoach:boolean, canUseCommunityDirectMessages:boolean}>}
 */
export async function resolveMessagingCapabilities(req) {
  if (req.user?.role === 'admin' || req.user?.role === 'trainer') {
    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
  }
  if (!isGatingEnabled()) {
    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
  }
  if (!req.user) {
    return { canMessageAssignedCoach: false, canUseCommunityDirectMessages: false };
  }

  let community = false;
  try {
    const entitlement = await resolveCurrentEntitlement(req);
    community = meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER);
  } catch {
    community = false;
  }

  const counterparties = await loadAssignedCounterpartyIds(toId(req.user.id));
  const hasRelationship = !!counterparties && counterparties.size > 0;

  return {
    // Community access implies the coach thread too.
    canMessageAssignedCoach: community || hasRelationship,
    canUseCommunityDirectMessages: community,
  };
}

export default requireMessagingAccess;
```

## FILE: backend/middleware/aiConsent.mjs
```js
/**
 * AI Consent & Kill Switch Middleware
 * ====================================
 * Guards AI routes with:
 *   1. Kill switch (env-based): AI_WORKOUT_GENERATION_ENABLED
 *   2. Per-user consent check via AiPrivacyProfile
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */
import logger from '../utils/logger.mjs';
import {
  CURRENT_CONSENT_VERSION,
  isConsentVersionCurrent,
} from '../config/consentVersion.mjs';

/**
 * Kill switch middleware.
 * Blocks all AI workout generation when AI_WORKOUT_GENERATION_ENABLED === 'false'.
 * Defaults to enabled if env var is not set (backward-compatible).
 */
export function aiKillSwitch(req, res, next) {
  const enabled = process.env.AI_WORKOUT_GENERATION_ENABLED;

  // Only disabled when explicitly set to 'false'
  if (enabled === 'false') {
    logger.info('[AI Kill Switch] AI workout generation is disabled via env var');
    return res.status(503).json({
      success: false,
      message: 'AI workout generation is temporarily disabled.',
      code: 'AI_FEATURE_DISABLED',
    });
  }

  next();
}

/**
 * Per-user AI consent middleware.
 * Requires an active AiPrivacyProfile with aiEnabled=true and no withdrawal.
 *
 * @param {Function} getAiPrivacyProfile - Getter function: () => AiPrivacyProfile model
 */
export function requireAiConsent(getAiPrivacyProfile) {
  return async (req, res, next) => {
    try {
      const userId = req.body?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      // Resolve target user (same logic as controller — clients target self)
      const requesterRole = req.user?.role;
      const requesterId = req.user?.id;
      const rawUserId = req.body?.userId;
      const targetUserId =
        rawUserId && Number.isFinite(Number(rawUserId))
          ? Number(rawUserId)
          : requesterRole === 'client'
            ? requesterId
            : null;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid userId',
        });
      }

      const AiPrivacyProfile = getAiPrivacyProfile();
      const profile = await AiPrivacyProfile.findOne({
        where: { userId: targetUserId },
      });

      if (!profile) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has not been granted. Please complete the AI consent flow before using AI-powered features.',
          code: 'AI_CONSENT_MISSING',
        });
      }

      if (!profile.aiEnabled) {
        return res.status(403).json({
          success: false,
          message: 'AI features are currently disabled for this account.',
          code: 'AI_CONSENT_DISABLED',
        });
      }

      if (profile.withdrawnAt) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has been withdrawn. Please re-consent to use AI-powered features.',
          code: 'AI_CONSENT_WITHDRAWN',
        });
      }

      // Owner decision Q5: a grant captured under a superseded disclosure does
      // not authorize processing. v1.0 told users their identity was "hidden"
      // and that they stayed "anonymous", while a STABLE pseudonym travelled
      // with their training, injury and medical-condition data. That
      // description was materially inaccurate, so the grant it produced cannot
      // stand in for informed consent.
      //
      // Until this landed, the gate checked aiEnabled and withdrawnAt and no
      // version, so every legacy grant kept working and the corrected
      // disclosure was cosmetic for exactly the population it was written for
      // (ox-alpha and GLM 5.3, post-ship panel). A null/missing version counts
      // as stale — those records are the most likely to predate the fix.
      if (!isConsentVersionCurrent(profile.consentVersion)) {
        return res.status(403).json({
          success: false,
          message: 'Our description of how Swan Coach uses your data has been corrected. '
            + 'Please review the updated disclosure and confirm to continue.',
          code: 'AI_CONSENT_STALE_VERSION',
          storedVersion: profile.consentVersion ?? null,
          requiredVersion: CURRENT_CONSENT_VERSION,
        });
      }

      // Attach profile to request for downstream use
      req.aiConsentProfile = profile;
      next();
    } catch (error) {
      logger.error('[AI Consent] Error checking consent:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying AI consent status.',
      });
    }
  };
}
```

## FILE: backend/config/consentVersion.mjs
```js
/**
 * FILE: consentVersion.mjs
 * PURPOSE: One source of truth for the AI consent version, server-side.
 * CREATED: 2026-08-22 — post-ship panel (ox-alpha, GLM 5.3)
 *
 * WHY THIS FILE EXISTS
 * The version lived as a private constant in aiConsentController while the
 * enforcement middleware never referenced it at all. Two consequences, both
 * flagged by the post-ship panel:
 *
 *   1. Owner decision Q5 ("re-consent all — block Coach until re-granted") was
 *      never implemented. The gate checked aiEnabled and withdrawnAt and no
 *      version, so every v1.0 grant kept working and the corrected disclosure
 *      was cosmetic for existing users — the exact population it was written
 *      for.
 *   2. Nothing tied the two declaration sites together, so a future bump in one
 *      place would silently diverge from the other.
 *
 * The frontend counterpart is frontend/src/content/aiConsentCopy.ts
 * (AI_CONSENT_VERSION). These MUST move together — a contract test asserts it.
 */

/** The version of the disclosure currently shown to users. */
export const CURRENT_CONSENT_VERSION = '2.0';

/**
 * Versions the API will accept on a NEW grant — the current one only.
 *
 * This used to include '1.0' on the reasoning that older versions "stay
 * acceptable as historical records". That conflated two different things: a
 * STORED row from 2026-07 is a historical record, but an INBOUND grant arriving
 * today is a fresh act of consent and can only be given against the disclosure
 * actually on screen.
 *
 * The bug it caused (GLM 5.3, UX panel): a user on a cached v1.0 bundle gets
 * prompted, consents, the stale bundle submits '1.0', the grant SUCCEEDS, the
 * enforcement gate then 403s it as not-current, the screen sees granted-but-
 * stale and prompts again — an infinite re-consent loop until the browser cache
 * expires. Rejecting the stale submission turns a silent loop into one honest
 * error the client can act on.
 *
 * Historical rows are unaffected: nothing rewrites them, and the gate reads
 * CURRENT, not this list.
 */
export const VALID_CONSENT_VERSIONS = [CURRENT_CONSENT_VERSION];

/**
 * True when a stored grant was captured under the disclosure now in force.
 *
 * A missing/null version counts as STALE. The frontend's first cut required a
 * truthy version before prompting, which skipped re-consent for exactly the
 * legacy records most likely to predate the correction — fail-open on the wrong
 * population.
 */
export function isConsentVersionCurrent(storedVersion) {
  return (storedVersion ?? null) === CURRENT_CONSENT_VERSION;
}
```

## FILE: backend/socket/socket.mjs (send_message region)
```js
      try {
        const userConversations = await sequelize.query(
          `SELECT conversation_id
           FROM conversation_participants
           WHERE user_id = :userId
             AND conversation_id IN (:conversationIds)
             AND deleted_at IS NULL`,
          { replacements: { userId: socket.user.id, conversationIds: normalizedIds }, type: QueryTypes.SELECT }
        );

        userConversations.forEach((conversation) => {
          const roomName = String(conversation.conversation_id);
          socket.join(roomName);
          socket.to(roomName).emit('user_online', { userId: socket.user.id });
          logger.info(`User ${socket.user.id} joined messaging room ${roomName}`);
        });
      } catch (error) {
        logger.error(`Error joining messaging rooms for user ${socket.user.id}:`, error);
      }
    });

    socket.on('send_message', async ({ conversationId, content }) => {
      const normalizedConversationId = toPositiveInt(conversationId);
      const trimmedContent = typeof content === 'string' ? content.trim() : '';
      if (!normalizedConversationId || !trimmedContent || trimmedContent.length > MAX_MESSAGE_LENGTH) return;

      try {
        if (!(await isActiveParticipant(normalizedConversationId, socket.user.id))) {
          socket.emit('error', { message: 'You are not a member of this conversation.' });
          return;
        }

        // Same throttle as REST. Without it, a limiter on the REST path alone
        // would be bypassed by emitting 'send_message' over the websocket.
        const rate = checkMessageRate(socket.user.id);
        if (!rate.allowed) {
          socket.emit('error', { message: MESSAGE_RATE_LIMITED, retryAfterMs: rate.retryAfterMs });
          return;
        }

        // Throttle FIRST: the lane check below costs up to three DB round-trips
        // (entitlement, assignments, members). Running it before the limiter let
        // an unthrottled emit loop force that work per message (GLM 5.3).
        // Same RELATIONSHIP lane as the REST path. The lane shipped as Express
        // middleware only, so a free-tier client with an active assignment was
        // 403'd by REST on an old community thread and could still write to it
        // here — exactly the failure this file's next comment warns about, and
        // flagged independently by two post-ship reviewers.
        let hasCommunityAccess = false;
        try {
          const entitlement = await resolveCurrentEntitlement({ user: socket.user });
          hasCommunityAccess = meetsMinimumTier(entitlement.effectiveTier, 'elite');
        } catch {
          hasCommunityAccess = false; // fail closed, same as the middleware
        }
        if (!isGatingEnabled()) hasCommunityAccess = true;

        if (!(await isRelationshipWriteAllowed(socket.user, normalizedConversationId, hasCommunityAccess))) {
          socket.emit('error', { message: 'You can message your assigned trainer here.' });
          return;
        }

        // Same block check as the REST path. Fixing only REST would have been a
        // false fix — this socket handler is a complete second way to send.
        const blockCheck = await canSendToConversation(normalizedConversationId, socket.user.id);
        if (!blockCheck.allowed) {
          socket.emit('error', { message: BLOCKED_MESSAGE });
          return;
        }

        const [rows] = await sequelize.query(
          `INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)
           VALUES (:conversationId, :senderId, :content, NOW(), NOW())
           RETURNING id, content, created_at, updated_at, sender_id, conversation_id`,
          { replacements: { conversationId: normalizedConversationId, senderId: socket.user.id, content: trimmedContent } }
        );
```

## FILE: frontend/src/components/Social/Messaging/MessagingView.tsx
```tsx
﻿/**
 * FILE: MessagingView.tsx
 * PURPOSE: Mounted SwanStudios messaging surface for direct and group chats.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useMessagingCapabilities } from './useMessagingCapabilities';
import { MessagingContainer } from './MessagingStyles';
import ConversationListPanel from './ConversationListPanel';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import { useMessaging } from './useMessaging';
import type { CreateConversationRequest } from './MessagingTypes';

const MessagingView: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const composeTo = searchParams.get('composeTo');


  const reduxUser = useSelector((state: any) => state.auth?.user || state.user?.user);
  const { user: authUser } = useAuth();
  const user = authUser || reduxUser;
  const currentUserId = user?.id || null;
  // Server truth, not a local recomputation. The previous expression tested a
  // subscription tier as a stand-in for a coaching relationship and disagreed
  // with the API in both directions — see useMessagingCapabilities for the
  // full account. A guard in useMessaging.tierGate.test.ts prevents that
  // expression from being reintroduced, so do not name it here verbatim.
  const {
    capabilities,
    loading: capabilitiesLoading,
    error: capabilitiesError,
    refresh: refreshCapabilities,
  } = useMessagingCapabilities(!!currentUserId);
  const messagingEnabled = capabilities.canMessageAssignedCoach;

  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    createConversation,
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId,
    typingUsers,
    onlineUserIds,
    connected,
    emitTyping,
    dismissError,
    pendingMessages,
  } = useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading });


  // Auto-start or switch to conversation if ?composeTo= is in the URL
  useEffect(() => {
    if (composeTo && messagingEnabled && currentUserId && !loading) {
      // A trainer-sent deep link that fails must not vanish silently. Three
      // reviewers flagged this independently: the error was swallowed, the param
      // was deleted in the same tick whether or not the create succeeded, and
      // the user was left on an inbox with no thread and no explanation.
      //
      // Strict parsing matches the server's rule, so '900abc' no longer resolves
      // to a different user than the backend would accept.
      const targetId = /^[1-9]\d*$/.test(composeTo) ? Number(composeTo) : null;
      const clearParam = () => setSearchParams((params) => {
        params.delete('composeTo');
        return params;
      }, { replace: true });

      if (!targetId || String(targetId) === String(currentUserId)) {
        clearParam();
      } else {
        setComposeError(null);
        createConversation(targetId)
          .then(clearParam)
          .catch(() => {
            setComposeError(
              'We couldn’t open that conversation. It may no longer be available.',
            );
            clearParam();
          });
      }
    }
  }, [composeTo, messagingEnabled, currentUserId, loading, createConversation, setSearchParams]);

  const activeConversation = useMemo(
    () => conversations.find(c => String(c.id) === String(activeConversationId)) || null,
    [conversations, activeConversationId]
  );

  const activeParticipant = useMemo(
    () => (activeConversation ? getOtherParticipant(activeConversation) : null),
    [activeConversation, getOtherParticipant]
  );

  const unreadCount = useMemo(
    // One conversation missing the field rendered a literal "NaN" in the Unread
    // tile (Grok 4.6, GLM 5.3). A metric that can print NaN is worse than absent.
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0),
    [conversations]
  );

  const isParticipantOnline = useMemo(
    () => activeParticipant ? onlineUserIds.has(activeParticipant.id) : false,
    [activeParticipant, onlineUserIds]
  );

  const hasMobileThread = !!activeConversationId;

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  const handleNewConversation = useCallback(async (request: number | CreateConversationRequest) => {
    await createConversation(request);
  }, [createConversation]);

  if (!currentUserId || capabilitiesLoading) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <CenteredMessage role="status" aria-live="polite">Loading your conversations…</CenteredMessage>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  // A failed capability lookup is NOT the same as "you lack access", and must
  // never be rendered as one. Fail-closed is right for the ACCESS decision;
  // telling a paying client with an active trainer that they need a trainer
  // because the network blipped is a lie the UI tells on our behalf.
  if (capabilitiesError) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <StateBlock role="alert">
            <StateTitle>We couldn&apos;t load your messages</StateTitle>
            <StateBody>
              This is on our side, not yours. Your conversations are safe.
            </StateBody>
            <StateAction type="button" onClick={refreshCapabilities}>
              Try again
            </StateAction>
          </StateBlock>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  if (!messagingEnabled) {
    // The screen where someone decides whether to pay. It used to state the rule
    // and offer nothing, which converts nobody and strands a client who simply
    // has not been matched with a trainer yet.
    return (
      <MessagingShell>
        <MessagingContainer>
          <StateBlock>
            <StateTitle>Messaging opens up with a trainer</StateTitle>
            <StateBody>
              Message your trainer directly about workouts, form, pain or
              scheduling — included with training, at any tier. Member-to-member
              chat comes with Crystalline Swan.
            </StateBody>
            <StateActions>
              <StateAction type="button" onClick={() => navigate('/dashboard/client/schedule')}>
                Find a trainer
              </StateAction>
              <StateActionSecondary type="button" onClick={() => navigate('/ascension')}>
                See Crystalline Swan
              </StateActionSecondary>
            </StateActions>
          </StateBlock>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  return (
    <MessagingShell>
      <MessagingSummary $mobileHidden={hasMobileThread}>
        <SummaryCopy>
          <SummaryKicker>Communication Hub</SummaryKicker>
          <SummaryTitle>Messages</SummaryTitle>
        </SummaryCopy>
        <SummaryMetrics aria-label="Messaging status">
          <SummaryMetric><strong>{conversations.length}</strong><span>Threads</span></SummaryMetric>
          <SummaryMetric $accent={unreadCount > 0}><strong>{unreadCount}</strong><span>Unread</span></SummaryMetric>
          <SummaryMetric $live={connected}><strong>{connected ? 'Live' : 'Polling'}</strong><span>Status</span></SummaryMetric>
        </SummaryMetrics>
      </MessagingSummary>

      {composeError && (
        <ComposeErrorBar role="alert">
          <span>{composeError}</span>
          <ComposeErrorDismiss type="button" onClick={() => setComposeError(null)}>
            Dismiss
          </ComposeErrorDismiss>
        </ComposeErrorBar>
      )}

      <MessagingContainer>
        <ConversationListPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUserId={currentUserId}
          onSelectConversation={selectConversation}
          onNewConversation={() => setShowNewModal(true)}
          loading={loading}
          mobileHidden={hasMobileThread}
        />

        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          participant={activeParticipant}
          conversation={activeConversation}
          onSend={sendMessage}
          onBack={handleBack}
          onTyping={emitTyping}
          onDismissError={dismissError}
          loading={messagesLoading}
          mobileHidden={!hasMobileThread}
          hasConversation={!!activeConversationId}
          typingUsers={typingUsers}
          isParticipantOnline={isParticipantOnline}
          connected={connected}
          conversationId={activeConversationId}
          error={error}
          pendingMessages={pendingMessages}
          searchUsers={searchUsers}
          onRenameConversation={renameConversation}
          onAddParticipants={addConversationParticipants}
          onUpdateParticipantRole={updateParticipantRole}
          onRemoveParticipant={removeConversationParticipant}
        />

        <NewConversationModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onStartConversation={handleNewConversation}
          searchUsers={searchUsers}
        />
      </MessagingContainer>
    </MessagingShell>
  );
};

export default MessagingView;


/* ── Empty / error states ───────────────────────────────────────────────────
   These are the only thing a user sees when messaging is unavailable, so they
   carry the same weight as the working surface: say what is true, and offer the
   next step rather than stating a rule and stopping. */
const StateBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 32px 24px;
  text-align: center;
  max-width: 46ch;
  margin: 0 auto;
`;

const StateTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const StateBody = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary, #A2B3C6);
`;

const StateActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
`;

const StateAction = styled.button`
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--accent-primary, #60C0F0);
  color: var(--bg-base, #0A0A0F);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 160ms ease, transform 160ms ease;

  &:hover { box-shadow: 0 0 0 3px var(--accent-glow, rgba(139, 92, 246, 0.35)); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const StateActionSecondary = styled(StateAction)`
  background: transparent;
  border-color: var(--border-soft, rgba(224, 236, 244, 0.22));
  color: var(--text-primary, #E0ECF4);
`;

const ComposeErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--warning-border, rgba(198, 168, 75, 0.4));
  background: var(--warning-surface, rgba(198, 168, 75, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9375rem;
`;

const ComposeErrorDismiss = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.22));
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  cursor: pointer;

  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const MessagingShell = styled.div`
  display: flex;
  min-height: min(840px, calc(100vh - 96px));
  flex-direction: column;
  gap: 1rem;
`;

const CenteredMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.95rem;
  padding: 2rem;
  text-align: center;
`;

const MessagingSummary = styled.header<{ $mobileHidden?: boolean }>`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  /* On a phone the thread IS the screen. This header plus three metric tiles
     stacks into four blocks above the conversation, and once the keyboard opens
     the messages are pushed out of the viewport entirely — so a user who tapped
     a conversation has to scroll to find it. Hidden while a thread is open,
     matching how the list panel already yields (Gemini 3.1 Pro, UX panel). */
  @media (max-width: 1024px) {
    display: ${({ $mobileHidden }) => ($mobileHidden ? 'none' : 'flex')};
  }
`;

const SummaryCopy = styled.div`
  min-width: 0;
`;

const SummaryKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
`;

const SummaryTitle = styled.h1`
  margin: 0.15rem 0 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.85rem;

  @media (max-width: 520px) {
    font-size: 1.45rem;
  }
`;

const SummaryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryMetric = styled.div<{ $accent?: boolean; $live?: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 8%),
    var(--bg-base, #0A0A0F));
  padding: 0.7rem 0.85rem;

  strong {
    display: block;
    color: ${({ $accent, $live }) => ($accent
      ? 'var(--accent-secondary, #8B5CF6)'
      : $live
        ? 'var(--success, #4ECDC4)'
        : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
  }
`;
```

## FILE: frontend/src/content/aiConsentCopy.ts
```ts
/**
 * ============================================================================
 * FILE: aiConsentCopy.ts
 * PURPOSE: Single source of truth for Swan Coach privacy & consent copy
 * CREATED: 2026-08-22 · Wave 1 Slice 3 (client-dashboard remediation)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * The consent language lived inline in four components and drifted from what
 * the backend actually does. Three surfaces told users their "identity is
 * hidden" and that they "stay anonymous" while `deIdentificationService`
 * assigns a STABLE `Client #<id>` pseudonym and forwards injury, pain,
 * measurement and goal data unchanged. That is pseudonymized processing, not
 * anonymity — and it was being claimed at the moment consent is legally
 * captured (the onboarding wizard), not just on a settings screen.
 *
 * Consent copy is a compliance surface. It lives in one module so it cannot
 * drift per-component again, and so a future change is a single diff to review.
 *
 * SCOPE OF THAT CLAIM, stated honestly (Grok, pre-push panel): the long-form
 * AI_CONSENT_DISCLOSURE and AI_CONSENT_SUBTITLE are rendered from here. The
 * short bullet lists are still authored inline in AiConsentScreen and
 * ConsentSection because each styles them differently. AI_CONSENT_PROTECTIONS
 * exists so those can converge, and a test asserts the inline bullets stay
 * consistent with it. Until they render from it, "single source of truth"
 * describes the disclosure, not every bullet — do not read it more broadly.
 *
 * ── ACCURACY CONTRACT ──────────────────────────────────────────────────────
 * Every claim below was verified against
 * `backend/services/deIdentificationService.mjs` (DIRECT_IDENTIFIER_PATHS +
 * scanAndRedactPII). Do NOT edit this copy without re-reading that file.
 *
 * That service is a DENYLIST: it removes the paths below and regex-redacts
 * email/phone patterns anywhere in the payload. Everything else the caller
 * includes is forwarded.
 *
 * CONSEQUENCE, and why the copy below is worded carefully: a denylist cannot
 * promise "training-relevant data only". An unrecognised field, or a name typed
 * into a free-text note, is forwarded. The copy therefore describes what IS
 * sent and warns about notes, rather than claiming a guarantee the architecture
 * does not provide. Replacing this with an outbound ALLOWLIST DTO is the real
 * fix and is tracked separately -- until then, do not restore "only" wording.
 *
 * REMOVED before anything leaves the server:
 *   supplements, sleep, stress  (GATED_HEALTH_PATHS, owner decision Q2 —
 *     restored only when COACH_HEALTH_FIELDS_ENABLED is set, which requires a
 *     consent-version bump because it changes what users were told)
 *   name / preferredName / firstName / lastName / fullName
 *   contact block — email, phone, address, city, state, zip, emergency contact
 *   dateOfBirth / dob, bloodType, ssn, insuranceId, insuranceProvider
 *   occupation, employer, workplace, stressSources
 *   medications, surgeries, doctorName / physician
 *   plus any email- or phone-shaped string found anywhere in the payload
 *
 * FORWARDED (this is the honest part the old copy omitted):
 *   a stable `Client #<id>` label, goals, fitness level, measurements,
 *   training history, exercise preferences, injury / pain history, and
 *   exercise-relevant medical conditions
 *
 * The stability of the pseudonym is the material fact: sessions link to one
 * another, so this is de-identification, not anonymization.
 */

/** Bumped whenever the substance of the disclosure changes. See CONSENT_VERSION_NOTES. */
export const AI_CONSENT_VERSION = '2.0';

export const CONSENT_VERSION_NOTES =
  'v2.0 (2026-08-22) — corrected anonymity language to pseudonymization; ' +
  'enumerated forwarded fields. v1.0 consents were captured under a ' +
  'description that overstated anonymity and require re-consent.';

/** One-line summary used as a section subtitle. */
export const AI_CONSENT_SUBTITLE =
  'SwanStudios uses Swan Coach to create personalized workout plans. Your data is ' +
  'pseudonymized — Swan Coach sees a stable client ID instead of your name or ' +
  'contact details. Review exactly what is and is not shared below.';

/** Ordered privacy bullets. `tone` lets each surface pick its own icon/color. */
export const AI_CONSENT_PROTECTIONS: ReadonlyArray<{
  key: string;
  title: string;
  body: string;
  tone: 'protect' | 'disclose';
}> = [
  {
    key: 'pseudonymized',
    title: 'Pseudonymized, not anonymous.',
    body:
      'Swan Coach sees a stable client ID rather than your name. Because the ID stays ' +
      'the same across sessions, this is de-identification — not full anonymity.',
    tone: 'disclose',
  },
  {
    key: 'removed',
    title: 'Removed before sending.',
    body:
      'Your name, email, phone, address, date of birth, blood type, insurance details, ' +
      'occupation and employer, medications, surgeries, and any doctor names are ' +
      'stripped before anything reaches the Swan Coach provider. Supplements, sleep ' +
      'and stress data are also withheld.',
    tone: 'protect',
  },
  {
    key: 'shared',
    title: 'What is shared.',
    body:
      'Your goals, fitness level, measurements, training history, exercise ' +
      'preferences, injury and pain history, and any medical conditions you have ' +
      'recorded — the last two so Swan Coach can avoid programming that could ' +
      'hurt you. Anything else you enter in a free-text note travels with it, so ' +
      'avoid putting names, addresses or ID numbers in notes.',
    tone: 'disclose',
  },
  {
    key: 'audit',
    title: 'Full audit trail.',
    body:
      'Every Swan Coach interaction is logged with a cryptographic hash, never your ' +
      'raw data.',
    tone: 'protect',
  },
  {
    key: 'withdraw',
    title: 'Withdraw anytime.',
    body:
      'You can turn Swan Coach off from your dashboard at any time. Withdrawal stops ' +
      'all future processing; plans already generated remain in your account.',
    tone: 'protect',
  },
];

/** Long-form legal disclosure. Rendered verbatim. */
export const AI_CONSENT_DISCLOSURE =
  'By granting consent, you agree that SwanStudios may process your pseudonymized ' +
  'fitness profile through a Swan Coach provider to generate personalized workout ' +
  'plans. Direct identifiers — your name, contact details, date of birth, insurance ' +
  'information, medications, surgeries, and physician names — are removed before ' +
  'transmission, as are your supplement, sleep and stress data. ' +
  'Training-relevant data, including your goals, measurements, ' +
  'injury and pain history, and medical conditions that affect exercise, is sent ' +
  'alongside a stable client ID. Because that ' +
  'identifier is stable, this is de-identified processing rather than anonymous ' +
  'processing. You may withdraw consent at any time from the Swan Coach Privacy & ' +
  'Consent page in your dashboard; withdrawal stops future processing but does not ' +
  'delete plans already generated.';

/** Shown where the client ID is first revealed (onboarding success). */
export const AI_CONSENT_CLIENT_ID_NOTE =
  'Your client ID has been assigned. Swan Coach identifies you by this ID instead of ' +
  'your name:';

/** Re-consent prompt for users who granted under v1.0 (owner decision Q5). */
export const AI_CONSENT_RECONSENT_PROMPT =
  'We have corrected our description of how Swan Coach uses your data. The previous ' +
  'wording said your identity was hidden; in fact Swan Coach receives a stable client ' +
  'ID along with your training and injury history. Nothing about the data itself has ' +
  'changed. Please review the updated disclosure and confirm to keep using Swan Coach.';
```

## teachPrompt producers (Slice 6 targets, excerpts)
```ts
  feedFallback: heroSwan,
};

export const LENS_TABS: LensTab[] = [
  { id: 'feed', label: 'Feed', Icon: MessageCircle, path: '/dashboard/client/overview' },
  { id: 'reels', label: 'Reels', Icon: Video, path: '/dashboard/client/overview/reels' },
  { id: 'friends', label: 'Friends', Icon: Users, path: '/dashboard/client/overview/friends' },
  { id: 'challenges', label: 'Challenges', Icon: Trophy, path: '/dashboard/client/overview/challenges' },
];

export const CLIENT_OVERVIEW_COACH_PROMPT =
  "Teach me my client overview. Help me decide whether to log a workout, review progress, or ask for the next safe training action today.";

export const CLIENT_OVERVIEW_COACH_PATH =
  `/dashboard/client/coach-assistant?${new URLSearchParams({ teachPrompt: CLIENT_OVERVIEW_COACH_PROMPT }).toString()}`;

export function buildClientOverviewCoachPrompt(snapshot?: ClientOverviewCoachSnapshot): string {
  if (!snapshot) return CLIENT_OVERVIEW_COACH_PROMPT;
  const level = safeClientOverviewLevel(snapshot.level);
  const points = safeClientOverviewPoints(snapshot.points);
  const progress = clampPercent(snapshot.progress);
  const streakDays = safeClientOverviewStreakDays(snapshot.streakDays);
  const bookingCue = snapshot.canBookSessions ? 'booking is open' : 'book through your trainer';
  return [
    'Teach me this overview.',
    `Snapshot: level ${level}; ${streakDays}d streak; ${progress}% to next level; ${compactNumber(points)} XP; ${bookingCue}.`,
    'Show one safest next action: log workout, review progress, book, or ask trainer.',
  ].join(' ');
}

export function buildClientOverviewCoachPath(snapshot?: ClientOverviewCoachSnapshot): string {
  return `/dashboard/client/coach-assistant?${new URLSearchParams({
    teachPrompt: buildClientOverviewCoachPrompt(snapshot),
  }).toString()}`;
}

---
    `Type: ${safePromptText(workout.assignmentType) || 'assignment'}.`,
    safePromptText(workout.firstExercise) ? `First exercise: ${safePromptText(workout.firstExercise)}.` : '',
    numberLabel(workout.exerciseCount, 'exercise') ? `Size: ${numberLabel(workout.exerciseCount, 'exercise')}.` : '',
    'Tell me the next simple action in plain language.',
    assignmentSafetyCopy(workout),
    'Do not claim the workout was logged until I save it in the Workout Logger.',
  ];
  return pieces.filter(Boolean).join(' ');
};

const emptyAssignmentPrompt = (): string => (
  'Client overview has no current assignment loaded. Tell me the simplest next action: check my plan, log a workout, review progress, book, or ask my trainer. Do not claim anything was logged.'
);

export function buildClientCurrentWorkoutCoachAction(
  workout?: CurrentClientWorkout | null,
): ClientCurrentWorkoutCoachAction {
  const params = new URLSearchParams({
    intent: assignmentIntent(workout),
    source: CLIENT_OVERVIEW_SOURCE,
    returnTo: CLIENT_OVERVIEW_RETURN_TO,
    teachPrompt: workout ? currentAssignmentPrompt(workout) : emptyAssignmentPrompt(),
  });

  return {
    label: 'Coach This',
    ariaLabel: "Ask Swan Coach about today's assignment",
    path: `${CLIENT_COACH_PATH}?${params.toString()}`,
  };
}
```
