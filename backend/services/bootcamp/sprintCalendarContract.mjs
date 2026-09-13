/**
 * ============================================================================
 * FILE: sprintCalendarContract.mjs — S07 / R-H06.
 * Pure, timezone-independent Sprint calendar scaffolding.
 *
 * THE DEFECT THIS CLOSES (baseline sprintService.buildSprintSchedule)
 *   `new Date('2026-03-02')` parses as UTC midnight, then `.getDay()` and
 *   `.setDate()` operate in the HOST's LOCAL time, and the result is formatted
 *   back with `.toISOString()` in UTC. Anywhere west of UTC that reads the
 *   previous local day, so the weekday is off by one; across a DST boundary the
 *   local offset changes mid-loop and can shift a whole date. The same sprint
 *   therefore scaffolded DIFFERENT dates on different machines.
 *
 * THE RULE HERE
 *   A date is a calendar date string (YYYY-MM-DD) and nothing else. All
 *   arithmetic goes through Date.UTC components, which have no DST and no host
 *   offset. No local getDay/setDate, no toISOString on a locally-built Date.
 *
 * PURITY: no I/O, no clock, no ORM. Validation returns reason CODES so callers
 * can log a sanitized reason without leaking input.
 * ============================================================================
 */

// The REAL class-format / class-style vocabularies. Imported rather than
// duplicated so a Sprint default can never drift from what a save will accept.
import { CLASS_FORMATS, CLASS_STYLES, DAY_TYPES } from './bootcampTemplateRules.mjs';

export class SprintCalendarValidationError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = 'SprintCalendarValidationError';
    this.status = 400;
    this.code = 'SPRINT_CALENDAR_INVALID';
    this.reason = code;
  }
}

/**
 * 409 — the taught confirmation's payload disagrees with the log that confirmation already
 * wrote. §5 line 216: "Retry returns the existing linked log/slot; differing date or
 * performed payload is conflict, not an overwrite." Carries a client-safe message so the
 * route's allowlist can hand it to the trainer instead of the generic envelope.
 */
export class SprintTaughtConflictError extends Error {
  constructor(message = 'This class was already confirmed with different details') {
    super(message);
    this.name = 'SprintTaughtConflictError';
    this.status = 409;
    this.code = 'SPRINT_TAUGHT_CONFLICT';
  }
}

const fail = (reason, message) => { throw new SprintCalendarValidationError(reason, message); };

export const WEEKDAY_INDEX = Object.freeze({
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
});

export const SUPPORTED_FOCUS = Object.freeze([
  'lower_body', 'upper_body', 'full_body', 'cardio', 'custom',
]);

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict YYYY-MM-DD with a real round-trip (rejects 2026-02-30, 2026-13-01). */
export function parseDateOnly(value) {
  if (typeof value !== 'string') fail('DATE_NOT_STRING', 'startDate must be a YYYY-MM-DD string');
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) fail('DATE_NOT_DATE_ONLY', 'startDate must be a YYYY-MM-DD date-only string');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year
    || utc.getUTCMonth() !== month - 1
    || utc.getUTCDate() !== day
  ) {
    fail('DATE_NOT_REAL', 'startDate is not a real calendar date');
  }
  return value.trim();
}

/** Calendar-day arithmetic with no DST and no host offset. */
export function addCalendarDays(dateOnly, days) {
  const [year, month, day] = parseDateOnly(dateOnly).split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = String(shifted.getUTCFullYear()).padStart(4, '0');
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday, read in UTC so the host zone cannot shift it. */
export function weekdayIndexOf(dateOnly) {
  const [year, month, day] = parseDateOnly(dateOnly).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function requireDurationWeeks(value) {
  if (!Number.isSafeInteger(value)) fail('DURATION_NOT_INTEGER', 'durationWeeks must be a whole number');
  if (value < 1 || value > 52) fail('DURATION_OUT_OF_RANGE', 'durationWeeks must be between 1 and 52');
  return value;
}

/** One to seven UNIQUE valid weekday names; trims and lowercases first. */
export function normalizeFrequencyPattern(value) {
  if (!Array.isArray(value)) fail('FREQUENCY_NOT_ARRAY', 'frequencyPattern must be an array');
  if (value.length < 1 || value.length > 7) {
    fail('FREQUENCY_COUNT_OUT_OF_RANGE', 'frequencyPattern must contain between 1 and 7 weekdays');
  }
  const seen = new Set();
  const normalized = [];
  for (const entry of value) {
    if (typeof entry !== 'string') fail('FREQUENCY_MEMBER_NOT_STRING', 'every weekday must be a string');
    const token = entry.trim().toLowerCase();
    // hasOwnProperty, NOT `in`: the `in` operator walks the prototype chain, so
    // ['constructor'] and ['__proto__'] passed the allowlist and produced
    // "0NaN-NaN-NaN" dates (hostile-review finding F4).
    if (!Object.prototype.hasOwnProperty.call(WEEKDAY_INDEX, token)) {
      fail('FREQUENCY_MEMBER_UNKNOWN', 'unknown weekday');
    }
    if (seen.has(token)) fail('FREQUENCY_DUPLICATE', 'duplicate weekday');
    seen.add(token);
    normalized.push(token);
  }
  return normalized;
}

/** Nonempty list of supported focus members. */
export function normalizeFocusRotation(value) {
  if (!Array.isArray(value)) fail('FOCUS_NOT_ARRAY', 'focusRotation must be an array');
  if (value.length === 0) fail('FOCUS_EMPTY', 'focusRotation must not be empty');
  const normalized = [];
  for (const entry of value) {
    if (typeof entry !== 'string') fail('FOCUS_MEMBER_NOT_STRING', 'every focus must be a string');
    const token = entry.trim().toLowerCase();
    if (!SUPPORTED_FOCUS.includes(token)) fail('FOCUS_MEMBER_UNSUPPORTED', 'unsupported focus');
    normalized.push(token);
  }
  return normalized;
}

/** Must equal the normalized weekday count when supplied. */
export function requireClassesPerWeek(value, weekdayCount) {
  if (value === undefined || value === null) return weekdayCount;
  if (!Number.isSafeInteger(value)) fail('CLASSES_NOT_INTEGER', 'classesPerWeek must be a whole number');
  if (value !== weekdayCount) {
    fail('CLASSES_MISMATCH', 'classesPerWeek must match the number of chosen weekdays');
  }
  return value;
}

/** The existing omitted-field defaults, preserved exactly. */
export const SPRINT_DEFAULTS = Object.freeze({
  durationWeeks: 12,
  frequencyPattern: Object.freeze(['monday', 'wednesday', 'friday']),
  focusRotation: Object.freeze(['lower_body', 'upper_body', 'full_body']),
  defaultFormat: 'stations_4x',
  defaultStyle: 'standard',
  progressionStrategy: 'linear',
});

/** models/BootcampSprint.mjs:74 — `progressionStrategy` isIn members. */
export const PROGRESSION_STRATEGIES = Object.freeze([
  'linear', 'undulating', 'block', 'random',
]);

/**
 * The Sprint's default format/style are STRING(30), not enums — so a bad value
 * does NOT fail at insert. It is copied into EVERY class generated from this
 * Sprint (`sprintGenerator` → `generateBootcampClass`, which returns
 * `classFormat: requestedClassFormat` verbatim), and from there into a saved
 * template's real enum columns. One bad default therefore silently POISONS every
 * class in the Sprint and makes each of them unsavable later.
 *
 * Rejecting it here — at creation, before any row exists — is the only place the
 * damage can be prevented rather than discovered per-class.
 */
function requireVocabularyMember(value, allowed, code, field, fallback) {
  const resolved = value === undefined || value === null || value === '' ? fallback : value;
  if (typeof resolved !== 'string' || !allowed.includes(resolved)) {
    fail(code, `${field} is not a supported value`);
  }
  return resolved;
}

export const requireDefaultFormat = (value) => requireVocabularyMember(
  value, CLASS_FORMATS, 'FORMAT_UNSUPPORTED', 'defaultFormat', SPRINT_DEFAULTS.defaultFormat,
);

export const requireDefaultStyle = (value) => requireVocabularyMember(
  value, CLASS_STYLES, 'STYLE_UNSUPPORTED', 'defaultStyle', SPRINT_DEFAULTS.defaultStyle,
);

export const requireProgressionStrategy = (value) => requireVocabularyMember(
  value, PROGRESSION_STRATEGIES, 'STRATEGY_UNSUPPORTED', 'progressionStrategy',
  SPRINT_DEFAULTS.progressionStrategy,
);

export function validateSprintCreateInput(params = {}) {
  const startDate = parseDateOnly(params.startDate);
  const durationWeeks = requireDurationWeeks(params.durationWeeks ?? SPRINT_DEFAULTS.durationWeeks);
  const frequencyPattern = normalizeFrequencyPattern(
    params.frequencyPattern ?? [...SPRINT_DEFAULTS.frequencyPattern],
  );
  const focusRotation = normalizeFocusRotation(params.focusRotation ?? [...SPRINT_DEFAULTS.focusRotation]);
  const classesPerWeek = requireClassesPerWeek(params.classesPerWeek, frequencyPattern.length);

  // S06/S07 hostile-review fix: these three were written to STRING(30)/STRING(20)
  // columns straight from the request body, unvalidated.
  const defaultFormat = requireDefaultFormat(params.defaultFormat);
  const defaultStyle = requireDefaultStyle(params.defaultStyle);
  const progressionStrategy = requireProgressionStrategy(params.progressionStrategy);

  return {
    startDate, durationWeeks, frequencyPattern, focusRotation, classesPerWeek,
    defaultFormat, defaultStyle, progressionStrategy,
  };
}

/** start + durationWeeks*7 - 1 calendar days. */
export function computeEndDate(startDate, durationWeeks) {
  return addCalendarDays(startDate, requireDurationWeeks(durationWeeks) * 7 - 1);
}

/**
 * Week one starts on the supplied start date. Each week covers seven calendar
 * dates, each chosen weekday occurs once inside that window, and the week's
 * occurrences are sorted CHRONOLOGICALLY before the rotating focus is assigned
 * across actual session order.
 */
export function buildSprintSchedule({
  startDate,
  durationWeeks,
  frequencyPattern,
  focusRotation,
}) {
  const start = parseDateOnly(startDate);
  const weeks = requireDurationWeeks(durationWeeks);
  const weekdays = normalizeFrequencyPattern(frequencyPattern);
  const focus = normalizeFocusRotation(focusRotation);
  const weekdayIndexes = weekdays.map(name => WEEKDAY_INDEX[name]);

  const schedule = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = addCalendarDays(start, w * 7);
    const weekEnd = addCalendarDays(weekStart, 6);
    const startDow = weekdayIndexOf(weekStart);

    const occurrences = weekdays.map((name, patternIndex) => {
      let offset = weekdayIndexes[patternIndex] - startDow;
      if (offset < 0) offset += 7;
      return {
        dayName: name,
        dayOfWeek: weekdayIndexes[patternIndex],
        patternIndex,
        scheduledDate: addCalendarDays(weekStart, offset),
      };
    });

    // Chronological assignment: the rotation follows the real session order,
    // not the order the caller happened to list the weekdays in.
    occurrences.sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : a.scheduledDate > b.scheduledDate ? 1 : 0));

    const isDeload = (w + 1) % 4 === 0;
    schedule.push({
      weekNumber: w + 1,
      startDate: weekStart,
      endDate: weekEnd,
      isDeloadWeek: isDeload,
      intensityModifier: isDeload ? 0.7 : 1.0,
      theme: isDeload ? 'Deload & Recovery' : null,
      slots: occurrences.map((occurrence, position) => ({
        dayOfWeek: occurrence.dayOfWeek,
        scheduledDate: occurrence.scheduledDate,
        dayType: focus[(w * weekdays.length + position) % focus.length],
      })),
    });
  }

  return schedule;
}

export default buildSprintSchedule;
