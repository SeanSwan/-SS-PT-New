/**
 * coachOnboardingContactFieldSanitizer.mjs
 * ========================================
 * Removes contact-handoff fields from model-authored client onboarding drafts.
 * Coach may draft training context; deterministic onboarding owns activation.
 */

const MODEL_AUTHORED_CONTACT_FIELD_KEYS = new Set([
  'email',
  'emailaddress',
  'clientemail',
  'contactemail',
  'phone',
  'phonenumber',
  'clientphone',
  'contactphone',
  'preferredcontactmethod',
  'contactdetails',
  'contactmethod',
  'contactpreference',
  'mobile',
  'mobilephone',
  'cell',
  'cellphone',
  'emergencycontact',
  'emergencycontactname',
  'emergencycontactphone',
  'emergencyphone',
  'address',
  'deliveryaddress',
  'shippingaddress',
  'billingaddress',
  'streetaddress',
  'homeaddress',
  'mailingaddress',
  'city',
  'state',
  'zip',
  'zipcode',
  'postalcode',
]);

function normalizedContactFieldKey(key) {
  return String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isModelAuthoredContactField(key) {
  return MODEL_AUTHORED_CONTACT_FIELD_KEYS.has(normalizedContactFieldKey(key));
}

function stripContactFieldsFromValue(value) {
  if (Array.isArray(value)) return value.map(stripContactFieldsFromValue);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((safe, [key, childValue]) => {
    if (isModelAuthoredContactField(key)) return safe;
    safe[key] = stripContactFieldsFromValue(childValue);
    return safe;
  }, {});
}

function stripContactFieldsFromRecord(record = {}) {
  return stripContactFieldsFromValue(record);
}

export function stripModelAuthoredOnboardingContactFields(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  return stripContactFieldsFromRecord(payload);
}