/**
 * ============================================================================
 * FILE: sprintConfirmSlot.mjs — R-H29 / R-H04 (slice C) + H29b (contract §5 line 216).
 *
 * Exactly-once taught confirmation, atomic against BOTH concurrency and a partial
 * failure, AND — since H29b — the ONE class log §5 line 216 requires it to write.
 *
 * THE FOUR DEFECTS THIS CLOSES
 *   1. S08 left `confirmSlotUsed` NON-IDEMPOTENT by design: it incremented
 *      `totalClassesCompleted` once per REQUEST, so a double-click, a retry after
 *      a lost response, or two tabs inflated a counter the objective requires
 *      preserved.
 *   2. The first fix for (1) tested `wasUsed` in JavaScript and then wrote. That
 *      stops SEQUENTIAL retries only — a double-click sends both requests before
 *      either commits, so both passed the guard and both incremented.
 *   3. (H29b) §5 line 216 — "A generated slot transitions to taught, GETS ONE CLASS
 *      LOG, LINKS classLogId and updates the distinct taught count in the same
 *      transaction." The log and the link did not exist: confirming a Sprint class
 *      left the taught history empty and `classLogId` null forever, and the
 *      `sprint-slot:<slotId>` operation key §5 line 218 names was produced by NOBODY.
 *   4. (H29b) An already-taught slot with no log — a legacy row — had no path to get
 *      one, and no path refused to invent one either.
 *
 * THE GUARANTEES, IN ORDER
 *   - Sprint row lock, THEN slot row lock (§5 line 216, "locks Sprint then slot").
 *   - The conditional UPDATE (`where: { wasUsed: false }`) is STILL the claim, so the
 *     database decides which concurrent caller counts. The row lock is what makes the
 *     log/link write that follows safe, not a replacement for it.
 *   - One log per slot, keyed `sprint-slot:<slotId>` (§5 line 218), written through the
 *     SAME `logBootcampClass` the ordinary endpoint uses, in THIS transaction.
 *   - A retry whose payload changed is a 409, not an overwrite (§5 line 216/220).
 *   - Planned/empty/absent snapshots FAIL with no write (§5 line 216, "no invented history").
 * ============================================================================
 */

import sequelize from '../../database.mjs';
import { getBootcampClassLog, getBootcampSprint, getSprintClassSlot } from '../../models/index.mjs';
import { logBootcampClass } from './bootcampCrud.mjs';
import { hashTaughtPayload } from './bootcampTaughtIdentity.mjs';
import { SprintCalendarValidationError, SprintTaughtConflictError } from './sprintCalendarContract.mjs';
import { NOT_CONFIRMABLE, buildSlotTaughtLogPayload } from './sprintSlotTaughtLog.mjs';
import {
  SprintObjectNotFoundError,
  normalizePositiveSafeInteger,
  requireChildOfSprint,
  requireOwnedSprint,
} from './sprintAccess.mjs';

const NOT_CONFIRMABLE_MESSAGES = {
  [NOT_CONFIRMABLE.NOT_GENERATED]: 'Only a generated class can be confirmed; this slot has no generated class yet.',
  [NOT_CONFIRMABLE.NO_SNAPSHOT]: 'This slot has no saved class snapshot, so there is nothing to confirm. Review it manually.',
  [NOT_CONFIRMABLE.NO_EXERCISES]: 'This slot\'s saved class snapshot lists no performed exercises, so there is nothing to confirm. Review it manually.',
  [NOT_CONFIRMABLE.USED_DATE_INVALID]: 'The date used must be a real YYYY-MM-DD date.',
};

/** The UTC date, the same clock the attendance path compares against. */
const utcToday = () => new Date().toISOString().slice(0, 10);

function notConfirmable(reason) {
  return new SprintCalendarValidationError(reason, NOT_CONFIRMABLE_MESSAGES[reason]);
}

export async function confirmSlotUsed(sprintId, slotId, actor, body) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();
  const ClassLog = getBootcampClassLog();

  // S08/R-H03: authorize the Sprint BEFORE the status guard, the slot read or the
  // catalog access. An explicit admin may operate another trainer's Sprint; the
  // stored trainerId remains the data owner.
  const authorized = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });
  const authorizedId = authorized.sprintId;
  const normalizedSlotId = normalizePositiveSafeInteger(slotId, 'slot identifier');
  const requestedUsedDate = typeof body?.usedDate === 'string' && body.usedDate.trim()
    ? body.usedDate.trim()
    : null;

  return sequelize.transaction(async (transaction) => {
    // §5 line 216 — "Sprint confirmation locks Sprint then slot." The lock is taken on the
    // Sprint FIRST and in this order; taking the slot lock first would let two confirmations
    // of different slots interleave with a Sprint-scoped writer.
    const lockedSprint = await BootcampSprint.findByPk(authorizedId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedSprint || Number(lockedSprint.trainerId) !== authorized.dataOwnerTrainerId) {
      // Non-disclosing, and it also catches a Sprint re-assigned between the authorization
      // read and the lock.
      throw new SprintObjectNotFoundError();
    }
    const sprint = lockedSprint;

    const slot = requireChildOfSprint(
      await SprintClassSlot.findOne({
        where: { id: normalizedSlotId, sprintId: authorizedId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      }),
      authorizedId,
    );

    const derived = buildSlotTaughtLogPayload({
      slot,
      trainerId: authorized.dataOwnerTrainerId,
      usedDate: requestedUsedDate,
    });
    if (!derived.ok) throw notConfirmable(derived.reason);
    const { payload } = derived;

    // A class cannot be confirmed as TAUGHT before the day it was taught: attendance refuses a
    // future-dated class (`bootcampAttendance.mjs` compares against the same UTC today), so
    // accepting one here would teach the slot, count it, link it — and leave attendance
    // impossible until that date arrives, with the payload hash then blocking any correction
    // through the confirmation (integration review, round 104). Same rule, same clock, so the
    // two ends cannot disagree.
    if (payload.classDate > utcToday()) {
      throw new SprintCalendarValidationError(
        'USED_DATE_IN_FUTURE',
        'A class cannot be confirmed as taught before its date; set the date you actually taught it.',
      );
    }

    // A retry must return the log this confirmation already wrote — or, if the retry's
    // payload disagrees with it, say so. §5 line 216: "differing date or performed payload
    // is conflict, not an overwrite."
    if (slot.classLogId) {
      const linked = await ClassLog.findByPk(slot.classLogId, { transaction });
      const incomingHash = hashTaughtPayload(payload);
      if (!linked) throw new SprintTaughtConflictError('This class is linked to a log that no longer exists. Review it manually.');
      // A legacy linked row may carry NO hash, and then there is nothing to compare against, so
      // the retry returns the existing log (external review, round 99, LOW-5). Conflicting
      // instead would break every pre-H29 link on the strength of a field that never existed
      // when it was written.
      if (linked.payloadHash && linked.payloadHash !== incomingHash) {
        throw new SprintTaughtConflictError();
      }
      return slot;
    }

    // The ATOMIC claim — the UPDATE *is* the guard, so two CONCURRENT confirmations cannot
    // both count. `classLogId` is set below, once the log exists.
    const taughtOnArrival = slot.wasUsed === true;
    const taughtAt = {
      wasUsed: true,
      usedDate: requestedUsedDate || slot.scheduledDate,
      trainerConfirmedAt: new Date(),
      status: 'taught',
    };
    const [claimed] = await SprintClassSlot.update(taughtAt, {
      where: { id: normalizedSlotId, sprintId: authorizedId, wasUsed: false },
      transaction,
    });

    if (claimed === 0 && !taughtOnArrival) {
      // Another caller claimed the slot between our read and our write. It owns the log, so
      // this call writes NOTHING. What this branch IS and IS NOT (external review, round 99,
      // MED-2 / LOW-2): under the slot row lock taken above it is UNREACHABLE in PostgreSQL —
      // the lock, not this test, is what serializes two confirmations — so it is kept only as
      // a defence for a caller that reaches the service without the lock.
      const winner = await SprintClassSlot.findOne({
        where: { id: normalizedSlotId, sprintId: authorizedId },
        transaction,
      });
      return winner ?? slot;
    }

    // Only the caller that CLAIMED the slot counts it. A legacy `taught` slot with no log
    // still gets its log and link below — §5 line 216, "without an extra transition" — but
    // never a second count.
    if (claimed > 0) await sprint.increment('totalClassesCompleted', { transaction });

    let log;
    try {
      log = await logBootcampClass(payload, { transaction });
    } catch (err) {
      // §5 line 220 requires the loser to "re-read the winning log after the losing
      // transaction rolls back, then compare hashes". That re-read CANNOT happen here: a
      // unique violation has already aborted THIS transaction, so any further query fails with
      // 25P02 (which is why `logBootcampClass` refuses to re-query when handed a transaction).
      // The rollback and the re-read therefore belong to the caller — which retries and finds
      // the winner through the `slot.classLogId` arm above. An earlier comment here claimed the
      // re-read happened inside this path; it did not (external review, round 99, MED-2).
      if (err?.name !== 'SequelizeUniqueConstraintError') throw err;
      throw new SprintTaughtConflictError('This class was confirmed concurrently. Reload the slot and try again.');
    }

    await SprintClassSlot.update({ classLogId: log.id }, {
      where: { id: normalizedSlotId, sprintId: authorizedId },
      transaction,
    });

    // `SprintClassSlot.update` is a STATIC model method — it does NOT mutate this instance,
    // so returning the snapshot would report the PRE-write state.
    return Object.assign(slot, taughtAt, { classLogId: log.id });
  });
}

export default confirmSlotUsed;
