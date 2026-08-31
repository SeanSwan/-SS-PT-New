/**
 * Trainer onboarding validation helpers.
 *
 * Keeps transport validation aligned with TrainerApplication column limits so
 * malformed requests return stable 4xx responses instead of Sequelize 500s.
 */
const OPTIONAL_TEXT_LIMITS = {
  phone: 50,
  businessName: 200,
  specialties: 4_000,
  bio: 5_000,
  primaryCertification: 100,
  certificationNumber: 100,
  insuranceCarrier: 200,
  insurancePolicyNumber: 150,
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURE_PREFIX = 'data:image/png;base64,';

function fail(message, statusCode = 400) {
  return { ok: false, message, statusCode };
}

const hasPostgresInvalidText = (value) => value.includes('\u0000');

function optionalString(body, field, limit) {
  const raw = body[field];
  if (raw == null || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return fail(`${field} must be text.`);
  const value = raw.trim();
  if (!value) return { ok: true, value: null };
  if (hasPostgresInvalidText(value)) return fail(`${field} contains invalid text.`);
  if (value.length > limit) return fail(`${field} is too long.`);
  return { ok: true, value };
}

export function isValidDateOnly(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

export function validateApplicationFields(body = {}) {
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (!fullName) return fail('Full name is required.');
  if (hasPostgresInvalidText(fullName)) return fail('Full name contains invalid text.');
  if (fullName.length > 200) return fail('Full name is too long.');

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (hasPostgresInvalidText(email)
    || email.length > 255
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('A valid email is required.');
  }

  const values = { fullName, email };
  for (const [field, limit] of Object.entries(OPTIONAL_TEXT_LIMITS)) {
    const result = optionalString(body, field, limit);
    if (!result.ok) return result;
    values[field] = result.value;
  }

  if (body.yearsExperience == null || body.yearsExperience === '') {
    values.yearsExperience = null;
  } else if (!Number.isInteger(body.yearsExperience)
    || body.yearsExperience < 0
    || body.yearsExperience > 80) {
    return fail('yearsExperience must be a whole number between 0 and 80.');
  } else {
    values.yearsExperience = body.yearsExperience;
  }

  for (const field of ['certificationExpiry', 'cprAedExpiry', 'insuranceExpiry']) {
    if (!isValidDateOnly(body[field])) return fail(`Invalid date for ${field}.`);
    values[field] = body[field] || null;
  }

  return { ok: true, values };
}

export function validateSignatureData(signatureData) {
  if (typeof signatureData !== 'string' || !signatureData.startsWith(SIGNATURE_PREFIX)) {
    return fail('A PNG drawn signature is required.');
  }
  if (signatureData.length > 250_000) return fail('Signature image is too large.', 413);

  const encoded = signatureData.slice(SIGNATURE_PREFIX.length);
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return fail('The signature image is invalid.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return fail('The signature image is invalid.');
  }
  return { ok: true, value: signatureData };
}
