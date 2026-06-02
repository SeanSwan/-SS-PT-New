/**
 * Sanitizers for editable single-session detail updates.
 *
 * Keeps the route handler small and validates all schedule edits before a
 * Sequelize write is attempted.
 */

const MAX_DURATION_MINUTES = 480;
const MAX_LOCATION_LENGTH = 200;
const MAX_NOTES_LENGTH = 5000;

export const parseEditableSessionId = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasOwn = (body, key) => Object.prototype.hasOwnProperty.call(body || {}, key);

const parseOptionalId = (body, key) => {
  const value = body[key];
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseEditableSessionId(value);
  if (!parsed) throw new Error(`Invalid ${key}`);
  return parsed;
};

const parseOptionalText = (body, key, maxLength) => {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Invalid ${key}`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${key} is too long`);
  return trimmed || null;
};

const parseRequiredDate = (body, key) => {
  const value = body[key];
  if (value === null || value === undefined || value === '') throw new Error(`Invalid ${key}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${key}`);
  return date;
};

const parseDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_DURATION_MINUTES) {
    throw new Error(`Session duration must be between 1 and ${MAX_DURATION_MINUTES} minutes`);
  }
  return parsed;
};

export function buildEditableSessionUpdate(body = {}, currentSession = null) {
  const update = {};

  if (hasOwn(body, 'sessionDate')) {
    update.sessionDate = parseRequiredDate(body, 'sessionDate');
  }

  if (hasOwn(body, 'duration')) {
    update.duration = parseDuration(body.duration);
  }

  const nextStart = update.sessionDate || currentSession?.sessionDate;
  const nextDuration = update.duration ?? currentSession?.duration;
  if ((hasOwn(body, 'sessionDate') || hasOwn(body, 'duration')) && nextStart && nextDuration) {
    update.endDate = new Date(new Date(nextStart).getTime() + Number(nextDuration) * 60000);
  }

  if (hasOwn(body, 'location')) {
    update.location = parseOptionalText(body, 'location', MAX_LOCATION_LENGTH);
  }

  if (hasOwn(body, 'notes')) {
    update.notes = parseOptionalText(body, 'notes', MAX_NOTES_LENGTH);
  }

  if (hasOwn(body, 'notifyClient')) {
    update.notifyClient = Boolean(body.notifyClient);
  }

  if (hasOwn(body, 'trainerId')) {
    update.trainerId = parseOptionalId(body, 'trainerId');
  }

  if (hasOwn(body, 'userId')) {
    update.userId = parseOptionalId(body, 'userId');
  }

  if (hasOwn(body, 'sessionTypeId')) {
    update.sessionTypeId = parseOptionalId(body, 'sessionTypeId');
  }

  if (hasOwn(body, 'clientName')) {
    update.clientName = parseOptionalText(body, 'clientName', MAX_LOCATION_LENGTH);
  }

  return update;
}

export function hasEditableScheduleFields(update = {}) {
  return [
    'sessionDate',
    'endDate',
    'duration',
    'trainerId',
    'userId',
  ].some((key) => hasOwn(update, key));
}
