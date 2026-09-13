/**
 * ============================================================================
 * FILE: sprintUpdateContract.mjs — S08 / hostile-review S06-F-sprint.
 *
 * PURPOSE: validation for PARTIAL updates to a Sprint's weeks and class slots.
 *          Pure: no I/O, no clock, no ORM.
 *
 * THE DEFECT THIS CLOSES
 *   `SprintClassSlot.dayType`, `.classFormat` and `.classStyle` are all
 *   STRING(30) — NOT enums (models/SprintClassSlot.mjs:40-51). So an invalid
 *   value does not fail at insert. It is copied into every class generated from
 *   that slot (`sprintGenerator` → `generateBootcampClass`, which returns
 *   `classFormat: requestedClassFormat` verbatim) and from there into a saved
 *   template's real enum columns, which makes those classes unsavable.
 *
 *   The create path already closed this poison chain. The UPDATE path was left
 *   open, so `PUT .../slots/:id { classFormat: 'garbage' }` reintroduced it.
 *
 * Only keys actually PRESENT are validated and returned, so a partial update
 * stays partial rather than being defaulted.
 * ============================================================================
 */

import { PROGRESSION_STRATEGIES, SprintCalendarValidationError } from './sprintCalendarContract.mjs';
import { CLASS_FORMATS, CLASS_STYLES, DAY_TYPES } from './bootcampTemplateRules.mjs';

const fail = (reason, message) => { throw new SprintCalendarValidationError(reason, message); };

/** models/SprintClassSlot.mjs:56 — `status` isIn members. */
export const SLOT_STATUSES = Object.freeze(['planned', 'generated', 'taught', 'skipped']);

/** A required enum member. `''` is rejected: it is a value the client sent, not absence. */
const vocabulary = (value, allowed, code, field) => {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    fail(code, `${field} is not a supported value`);
  }
  return value;
};

const text = (value, code, field) => {
  if (value !== null && typeof value !== 'string') fail(code, `${field} must be text`);
  return value;
};

/**
 * Validate a partial update to a Sprint row.
 *
 * `progressionStrategy` is a REAL domain, and the create path has always validated it
 * (`sprintCalendarContract.mjs` PROGRESSION_STRATEGIES). The UPDATE path filtered the field by
 * NAME only, so `PUT /sprints/:id {progressionStrategy:'nonsense'}` persisted an out-of-enum
 * value — and `resolveWeekPolicy` silently falls back to `linear` while still recording
 * `source: 'strategy'`, which made the generator print "from the nonsense strategy" (external
 * review, round 103, F10). The value is validated here, where the other slot/week vocabulary
 * lives, so the route's filter cannot reintroduce it.
 */
export function validateSprintUpdate(updates = {}) {
  const filtered = {};
  const allowed = ['name', 'defaultFormat', 'defaultStyle', 'progressionStrategy', 'spaceProfileId', 'notes', 'status'];
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }
  if (filtered.progressionStrategy !== undefined) {
    vocabulary(filtered.progressionStrategy, PROGRESSION_STRATEGIES, 'STRATEGY_UNSUPPORTED', 'progressionStrategy');
  }
  return filtered;
}

/** Validate a partial update to a class slot. */
export function validateSlotUpdate(updates = {}) {
  const filtered = {};
  if (updates.dayType !== undefined) {
    filtered.dayType = vocabulary(updates.dayType, DAY_TYPES, 'DAY_TYPE_UNSUPPORTED', 'dayType');
  }
  if (updates.classFormat !== undefined) {
    filtered.classFormat = vocabulary(updates.classFormat, CLASS_FORMATS, 'FORMAT_UNSUPPORTED', 'classFormat');
  }
  if (updates.classStyle !== undefined) {
    filtered.classStyle = vocabulary(updates.classStyle, CLASS_STYLES, 'STYLE_UNSUPPORTED', 'classStyle');
  }
  if (updates.status !== undefined) {
    filtered.status = vocabulary(updates.status, SLOT_STATUSES, 'STATUS_UNSUPPORTED', 'status');
    // §5 line 216: "A generated slot transitions to taught, GETS ONE CLASS LOG, LINKS
    // classLogId and updates the distinct taught count in the same transaction." A generic
    // slot UPDATE cannot do any of that, and used to park a slot in `taught` with NO log, NO
    // link, NO used date and NO count — the exact state the confirmation transaction exists to
    // make impossible (external review, round 99, MED-3). `taught` is therefore owned by
    // `PUT /sprints/:sprintId/slots/:slotId/confirm` alone.
    if (filtered.status === 'taught') {
      fail(
        'TAUGHT_REQUIRES_CONFIRMATION',
        'A slot becomes taught through the confirmation endpoint (or the end of class), not a status edit',
      );
    }
  }
  if (updates.notes !== undefined) {
    filtered.notes = text(updates.notes, 'NOTES_NOT_TEXT', 'notes');
  }
  return filtered;
}

/**
 * Validate a partial update to a week. `isDeloadWeek` drives `intensityModifier`
 * and WINS over a directly supplied modifier, exactly as the baseline did.
 */
export function validateWeekUpdate(updates = {}) {
  const filtered = {};
  if (updates.theme !== undefined) filtered.theme = text(updates.theme, 'THEME_NOT_TEXT', 'theme');
  if (updates.notes !== undefined) filtered.notes = text(updates.notes, 'NOTES_NOT_TEXT', 'notes');

  if (updates.isDeloadWeek !== undefined) {
    if (typeof updates.isDeloadWeek !== 'boolean') {
      fail('DELOAD_NOT_BOOLEAN', 'isDeloadWeek must be true or false');
    }
    filtered.isDeloadWeek = updates.isDeloadWeek;
    filtered.intensityModifier = updates.isDeloadWeek ? 0.7 : 1.0;
  } else if (updates.intensityModifier !== undefined) {
    const modifier = updates.intensityModifier;
    if (typeof modifier !== 'number' || !Number.isFinite(modifier)) {
      fail('MODIFIER_NOT_FINITE', 'intensityModifier must be a finite number');
    }
    filtered.intensityModifier = modifier;
  }
  return filtered;
}
