/**
 * ============================================================================
 * FILE: backend/services/bootcamp/sprintSlotTaughtLog.mjs
 *
 * PURPOSE: derive the ONE taught-log payload a Sprint confirmation must write, from the
 *   slot's own generated snapshot. Contract §5 line 216: "A generated slot transitions to
 *   taught, gets one class log, links classLogId and updates the distinct taught count in
 *   the same transaction." This module owns the first half of that sentence; the
 *   transaction, the link and the count live in `sprintConfirmSlot.mjs`.
 *
 * WHY A DERIVATION MODULE RATHER THAN AN INLINE OBJECT
 *   The payload is hashed (`bootcampTaughtIdentity.mjs`) and that hash is what makes a
 *   retry a retry instead of a conflict (§5 line 220). So every field must be a PURE
 *   function of the slot row — a field that changes between two calls on unchanged data
 *   would turn an honest retry into a 409. Keeping the derivation pure and separately
 *   tested is what makes that property checkable.
 *
 * WHAT IS DELIBERATELY ABSENT
 *   `actualParticipants` is NOT set from `expectedParticipants`. §5 line 222 says it
 *   plainly: "Prescribed work seconds/rounds are not measured elapsed time;
 *   expectedParticipants is not actual attendance." Confirming a class does not observe
 *   who showed up, so the log asserts no attendance and the prescription is recorded as a
 *   PRESCRIPTION in `executionSummary`.
 *
 * The performed list is the main-board exercises in slot order — the same predicate the
 * builder UI uses for its own taught log (`BootcampBuilderPlacement.ts:11`, `isMainBoardExercise`:
 * `!board || board === 'main'`), so the two write paths agree on what "performed" means.
 * §5 line 224: "Old rows with no board are treated as the trainer-attested performed list."
 * ============================================================================
 */

import { normalizeClassDate, sprintSlotOperationKey } from './bootcampTaughtIdentity.mjs';
import { EXECUTION_SUMMARY_KINDS, TRAINER_ATTESTED_PRESCRIPTION } from './bootcampExecutionSummary.mjs';

// Re-exported so a caller that reads the derivation keeps finding the vocabulary here; the
// table itself lives with the other value domains so the route and this module cannot drift.
export { EXECUTION_SUMMARY_KINDS };

/** Why a slot cannot produce a taught log. All mean "no invented history" (§5 line 216). */
export const NOT_CONFIRMABLE = Object.freeze({
  NOT_GENERATED: 'SLOT_NOT_GENERATED',
  NO_SNAPSHOT: 'SLOT_HAS_NO_SNAPSHOT',
  NO_EXERCISES: 'SLOT_SNAPSHOT_HAS_NO_EXERCISES',
  USED_DATE_INVALID: 'USED_DATE_INVALID',
});

/**
 * A real `YYYY-MM-DD` date as a UTC instant, or `null`.
 *
 * `usedDate` used to be only `.trim()`ed and then written straight into a DATEONLY column, so
 * `{"usedDate":"yesterday"}` reached the driver and surfaced as a generic 400/500 instead of a
 * field-specific rejection (integration review, round 104). It is validated here, where the
 * value is chosen, so the caller can fail with a message about the field.
 */
const parseDateOnly = (value) => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const real = utc.getUTCFullYear() === Number(year)
    && utc.getUTCMonth() === Number(month) - 1
    && utc.getUTCDate() === Number(day);
  return real ? utc : null;
};

/** `YYYY-MM-DD` for a UTC instant. */
const toDateOnly = (date) => date.toISOString().slice(0, 10);

const isMainBoard = (exercise) => !exercise?.board || exercise.board === 'main';

const positiveOrNull = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
);

/**
 * A confirmed class is TRAINER-ATTESTED: the trainer says this class happened and used this
 * prescription. It is NOT `runner_measured` — nothing measured elapsed time.
 */
function buildExecutionSummary(snapshot, exercisesUsed) {
  return {
    kind: TRAINER_ATTESTED_PRESCRIPTION,
    // The PRESCRIPTION, named as such. `workSec` is the interval the class was built with,
    // never an observed duration; `rounds`/`stationCount` are structure, not completions.
    prescribed: {
      workSec: positiveOrNull(snapshot?.exerciseDurationSec),
      rounds: positiveOrNull(snapshot?.rounds),
      stationCount: positiveOrNull(snapshot?.stationCount),
      exercisesPerStation: positiveOrNull(snapshot?.exercisesPerStation),
      targetDurationMin: positiveOrNull(snapshot?.targetDuration),
    },
    expectedParticipants: positiveOrNull(snapshot?.expectedParticipants),
    performedCount: exercisesUsed.length,
    notes: 'Prescribed values, not measured elapsed time or observed attendance.',
  };
}

/**
 * Build the taught-log payload for one Sprint slot.
 *
 * @returns {{ ok: true, payload: object } | { ok: false, reason: string }}
 *   `ok: false` means the slot has no confirmable data. The caller must FAIL the
 *   confirmation rather than write a log from an invented or empty snapshot.
 */
export function buildSlotTaughtLogPayload({ slot, trainerId, usedDate }) {
  const snapshot = slot?.generatedClassData;

  // §5 line 216: "Confirmation of planned/empty data fails." A `planned` slot has not been
  // generated, so there is nothing to confirm and nothing to log.
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return { ok: false, reason: NOT_CONFIRMABLE.NO_SNAPSHOT };
  }
  if (slot.status === 'planned' || slot.status === 'skipped') {
    return { ok: false, reason: NOT_CONFIRMABLE.NOT_GENERATED };
  }

  const exercisesUsed = (Array.isArray(snapshot.exercises) ? snapshot.exercises : [])
    .filter(isMainBoard)
    .map((exercise) => ({
      exerciseName: exercise.exerciseName,
      stationIndex: exercise.stationIndex ?? null,
      durationSec: exercise.durationSec,
    }))
    .filter((exercise) => typeof exercise.exerciseName === 'string' && exercise.exerciseName.trim() !== '');

  if (exercisesUsed.length === 0) {
    // §5 line 216: "absent snapshots require manual review and no invented history."
    return { ok: false, reason: NOT_CONFIRMABLE.NO_EXERCISES };
  }

  // The taught date, VALIDATED and CANONICALIZED before it is hashed or stored.
  //
  // Two defects met here (integration review, round 104): a non-date string reached the
  // DATEONLY column and surfaced as a driver error, and a NON-CANONICAL date was hashed raw
  // while `logBootcampClass` hashes the normalized value — so `2026-9-3` and `2026-09-03`
  // produced two different hashes for one stored row and an honest retry became a 409.
  const rawDate = usedDate ?? slot.scheduledDate;
  const parsedDate = parseDateOnly(rawDate);
  if (!parsedDate) return { ok: false, reason: NOT_CONFIRMABLE.USED_DATE_INVALID };
  const classDate = normalizeClassDate(toDateOnly(parsedDate));

  return {
    ok: true,
    payload: {
      trainerId,
      // §5 line 218: the owned SLOT is the operation identity for this log.
      operationKey: sprintSlotOperationKey(slot.id),
      templateId: slot.templateId ?? null,
      classDate,
      dayType: slot.dayType || snapshot.dayType || null,
      exercisesUsed,
      executionSummary: buildExecutionSummary(snapshot, exercisesUsed),
    },
  };
}

export default buildSlotTaughtLogPayload;
