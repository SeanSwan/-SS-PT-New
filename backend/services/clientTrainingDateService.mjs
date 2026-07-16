/**
 * ============================================================================
 * FILE: clientTrainingDateService.mjs
 * PURPOSE: Resolve canonical client-local training dates from validated zones.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

export const DEFAULT_CLIENT_TIME_ZONE = 'America/Los_Angeles';
const MAX_TIME_ZONE_LENGTH = 64;

export class ClientTrainingDateError extends Error {
  constructor(message, code = 'CLIENT_TIME_ZONE_INVALID', statusCode = 400) {
    super(message);
    this.name = 'ClientTrainingDateError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const canonicalTimeZone = (value) => {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_TIME_ZONE_LENGTH) return null;

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate })
      .resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
};

export const normalizeClientTimeZoneUpdate = (value) => {
  const normalized = canonicalTimeZone(value);
  if (!normalized) {
    throw new ClientTrainingDateError('timeZone must be a valid IANA time zone');
  }
  return normalized;
};

export const formatDateOnlyInTimeZone = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ClientTrainingDateError('referenceDate must be a valid date', 'CLIENT_DATE_INVALID');
  }

  const normalizedTimeZone = canonicalTimeZone(timeZone);
  if (!normalizedTimeZone) {
    throw new ClientTrainingDateError('timeZone must be a valid IANA time zone');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
};

export const resolveClientTrainingDateContext = ({
  storedTimeZone,
  storedTimeZoneConfigured = false,
  headerTimeZone,
  actorId,
  targetClientId,
  referenceDate = new Date(),
} = {}) => {
  const stored = canonicalTimeZone(storedTimeZone);
  const header = canonicalTimeZone(headerTimeZone);
  const isClientSelf = String(actorId ?? '') === String(targetClientId ?? '')
    && String(targetClientId ?? '') !== '';

  let timeZone = DEFAULT_CLIENT_TIME_ZONE;
  let source = 'fallback';

  if (storedTimeZoneConfigured === true && stored) {
    timeZone = stored;
    source = 'user';
  } else if (isClientSelf && header) {
    timeZone = header;
    source = 'client_header';
  } else if (stored) {
    timeZone = stored;
    source = 'account_default';
  }

  return {
    localDate: formatDateOnlyInTimeZone(referenceDate, timeZone),
    timeZone,
    source,
  };
};