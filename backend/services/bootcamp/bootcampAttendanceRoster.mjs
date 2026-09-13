/**
 * ============================================================================
 * FILE: bootcampAttendanceRoster.mjs
 *
 * WHY THIS MODULE EXISTS. `recordBootcampAttendanceWithin` answered every submission after the first
 * with `{ alreadyRecorded: true, created: 0 }` — the guard was `if (classLog.attendance?.recordedAt)`
 * and NOTHING compared the submitted roster to the stored one. The route answers **200** for that
 * result (`bootcampRoutes.mjs:357`). So:
 *
 *   R1  POST /class-logs/500/attendance {attendees:[{userId:11}]}   -> 201, one form for 11
 *       (the response is lost)
 *   R2  POST the CORRECTED roster {attendees:[11,12,13]}            -> 200 success, created 0
 *
 * Clients 12 and 13 were present, received no `DailyWorkoutForm`, and therefore have no chart entry
 * and no streak — while the trainer was told the submission succeeded. There is no reversal path
 * (the route header is explicit: no force flag), so the roster could not be corrected without DB
 * access. The explicit no-show variant is worse: `{attendees:[], noShowConfirmed:true}` locks the
 * class as recorded-with-nobody-present, and every later real roster is discarded just as quietly.
 *
 * THE RULE IT WAS MISSING is already the packet's own: §5 line 216 — "differing date or performed
 * payload is conflict, not an overwrite" — which the taught-log sibling implements as a 409
 * (`bootcampCrud.mjs` `resolveIdempotentLog`). Attendance simply had no `payloadHash` and no
 * comparison. Hostile review, round 129, MED.
 *
 * WHY A SEPARATE FILE rather than private helpers: adding the comparison inline pushed
 * `bootcampAttendance.mjs` from 298 lines to 366 — over the rule-4 cap of 300, in a file that was
 * under it. Rule 4 and this packet's own §7 both say to split by MOVING CODE, never by rewording the
 * explanation away, so the invariant and its reasoning live here and the service imports them.
 *
 * LIMITS, stated so a pass is not over-read:
 *  - This compares ROSTERS. It does not decide whether a conflict should be overridable: there is no
 *    force flag by design, and adding one is a product decision, not a repair.
 *  - A stored record with no `attendees` array (an older shape) names nobody, so any named-roster
 *    resend conflicts. That is the safe direction — the alternative silently discards a roster the
 *    trainer believes was recorded.
 * ============================================================================
 */

/**
 * Does this submission name exactly the roster already on the record?
 *
 * Both sides are normalized the way the WRITER normalizes: positive-integer `userId`s and trimmed
 * guest names, deduplicated (an attendee listed twice is one person; the builder already dedupes
 * `registered`, so a legacy row carrying a duplicate must not read as a conflict). Order is
 * irrelevant — the comparison sorts — so a roster that merely arrives in a different order is an
 * honest retry, which is the behaviour the no-op path exists for.
 *
 * @param {{registered: number[], guests: string[]}} payload built by `buildAttendancePayloads`, so
 *   the comparison uses the module's OWN normalization rather than a second copy that could drift.
 * @param {object|null|undefined} storedAttendance the `attendance` object already on the class log.
 * @returns {boolean} true when the submission names the same people and guests.
 */
export function namesSameRoster(payload, storedAttendance) {
  const storedAttendees = Array.isArray(storedAttendance?.attendees) ? storedAttendance.attendees : [];
  const storedIds = new Set();
  const storedGuests = new Set();
  for (const attendee of storedAttendees) {
    const userId = Number(attendee?.userId);
    if (Number.isInteger(userId) && userId > 0) {
      storedIds.add(userId);
      continue;
    }
    const guest = typeof attendee?.guest === 'string' ? attendee.guest.trim() : '';
    if (guest) storedGuests.add(guest);
  }
  return sameMembers(storedIds, payload?.registered) && sameMembers(storedGuests, payload?.guests);
}

/**
 * Set-equality over members; ONE comparator so both sides sort identically.
 *
 * `Array.from` rather than an `Array.isArray` guard, and that is a repaired defect rather than a
 * style choice: the caller passes a `Set` for the stored side and an array for the submitted one, so
 * an `Array.isArray(values) ? values : []` normalizer silently turned the stored roster into `[]` —
 * which made every honest retry look like a conflict. The control test that asserts an IDENTICAL
 * resend is still a no-op is what caught it, which is the reason that control exists.
 */
function sameMembers(left, right) {
  const normalize = (values) => [...new Set(Array.from(values ?? []))].sort();
  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * 409 — the roster on the record differs from the submitted one.
 *
 * The message is CLIENT-VISIBLE: the attendance route answers `message: status >= 500 ? … :
 * error.message` (`bootcampRoutes.mjs:361`), so this sentence is what the trainer reads. It names
 * what happened and what stands, and deliberately does NOT echo the stored record — no ids, no
 * `recordedAt`, no `workoutFormIds`.
 */
export function attendanceRosterConflict(
  message = 'Attendance for this class was already recorded with a different roster. '
    + 'The original record stands; review it before recording again.',
) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

/**
 * The whole already-recorded decision, so the service keeps a three-line guard and this file owns the
 * rule. Returns the no-op result for an honest resend; throws 409 when the submission names a
 * different roster.
 *
 * @param {{registered: number[], guests: string[]}} payload from `buildAttendancePayloads`.
 * @param {object} storedAttendance the `attendance` object on the class log (already recorded).
 * @returns {{alreadyRecorded: true, attendance: object, created: 0}}
 */
export function resolveRecordedAttendance(payload, storedAttendance) {
  if (!namesSameRoster(payload, storedAttendance)) throw attendanceRosterConflict();
  return { alreadyRecorded: true, attendance: storedAttendance, created: 0 };
}

export default namesSameRoster;
