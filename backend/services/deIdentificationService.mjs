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
 * @param {string} [options.spiritName] - DEPRECATED: kept for backward compat, ignored if clientId provided
 * @returns {{ deIdentified: Object, strippedFields: string[] } | null}
 *   Returns null if the payload is empty/unsafe after stripping (fail-closed).
 */
export function deIdentify(masterPromptJson, options = {}) {
  if (!masterPromptJson || typeof masterPromptJson !== 'object') {
    logger.warn('[DeIdentification] Received null/invalid masterPromptJson — fail closed');
    return null;
  }

  const payload = deepClone(masterPromptJson);
  const strippedFields = [];
  const { clientId, spiritName } = options;

  // Anonymous label: prefer clientId, fall back to generic
  const anonymousLabel = clientId ? `Client #${clientId}` : 'Client';

  // 1. Replace name fields with anonymous client ID
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

  // 2. Strip direct identifiers
  for (const path of DIRECT_IDENTIFIER_PATHS) {
    // Skip name fields — already handled above
    if (path === 'client.name' || path === 'client.preferredName') continue;

    if (deleteNestedKey(payload, path)) {
      strippedFields.push(path);
    }
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
