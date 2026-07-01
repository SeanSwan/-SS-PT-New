const REDACTION_PLACEHOLDER = '[redacted]';

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

const IDENTITY_KEYS = new Set([
  'address',
  'client',
  'clientemail',
  'clientname',
  'clientprofile',
  'contactemail',
  'contactphone',
  'dateofbirth',
  'email',
  'emergencycontact',
  'emergencyphone',
  'firstname',
  'lastname',
  'phone',
  'phonenumber',
  'selectedclient',
]);

function normalizeKey(key) {
  return String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function redactContactText(value) {
  return value
    .replace(EMAIL_PATTERN, REDACTION_PLACEHOLDER)
    .replace(PHONE_PATTERN, REDACTION_PLACEHOLDER);
}

export function sanitizeWorkoutPlanDataForPersistence(value) {
  if (typeof value === 'string') {
    return redactContactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeWorkoutPlanDataForPersistence(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((safe, [key, nested]) => {
      if (!IDENTITY_KEYS.has(normalizeKey(key))) {
        safe[key] = sanitizeWorkoutPlanDataForPersistence(nested);
      }
      return safe;
    }, {});
  }

  return value;
}

export function normalizeWorkoutPlanDataForPersistence(value) {
  const sanitized = sanitizeWorkoutPlanDataForPersistence(value);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return { weeks: [] };
  }
  if (!Array.isArray(sanitized.weeks)) {
    sanitized.weeks = [];
  }
  return sanitized;
}
export function sanitizeWorkoutPlanMetadataForPersistence(value) {
  const sanitized = sanitizeWorkoutPlanDataForPersistence(value);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return {};
  }
  return sanitized;
}

export function sanitizeWorkoutPlanProgressNotesForPersistence(value) {
  const sanitized = sanitizeWorkoutPlanDataForPersistence(value);
  return Array.isArray(sanitized) ? sanitized : [];
}