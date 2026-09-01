/**
 * approveCaptureWorkoutService.mjs
 * =================================
 * ONE-transaction approval for PLAUD-sourced workouts (blueprint Slice 1;
 * PLAUD-AUTO-INGEST-REBUILD-BLUEPRINT-2026-09-01.md Part 8.4).
 *
 * Replaces the adminWorkoutLoggerController seam that (F1) committed the
 * workout in logWorkoutForClient's own transaction, then wrote the
 * WorkoutSession UUID into approved_workout_form_id — a column whose FK
 * targets daily_workout_forms → guaranteed violation, orphaned workout,
 * re-approvable merge — and (F2) never handled 'plaud_merge_segment'.
 *
 * Flow (single transaction; any failure = full rollback, nothing orphaned):
 *   1. Lock the merge request FOR UPDATE; validate ownership/client/status/
 *      approve-once. Rejection happens BEFORE any workout write.
 *   2. logWorkoutForClient joins this transaction (engagement suppressed).
 *   3. finalizeMerge=true (source=plaud_merge): flip the merge request to
 *      approved, record approved_workout_session_id, purge the cipher.
 *      finalizeMerge=false (source=plaud_merge_segment): write only — the
 *      standalone /approve endpoint closes multi-segment reviews.
 *   4. Commit, then run engagement (XP + auto-post) best-effort post-commit.
 *
 * Errors: WorkoutLogError passes through (DUPLICATE_DATE → 409 upstream);
 * MergeApprovalError maps to 409 MERGE_NOT_APPROVABLE.
 */

import logger from '../../utils/logger.mjs';
import {
  logWorkoutForClient,
  awardEngagementForWorkout,
} from './workoutLogService.mjs';

export class MergeApprovalError extends Error {
  constructor(message, code = 'MERGE_NOT_APPROVABLE') {
    super(message);
    this.name = 'MergeApprovalError';
    this.code = code;
  }
}

export async function approvePlaudMergeWorkout({
  mergeRequestId,
  clientId,
  exercises,
  date,
  notes,
  title,
  duration,
  intensity,
  actingUserId,
  actingRole,
  sequelize,
  finalizeMerge,
  suppressEngagementSideEffects = false,
}) {
  const numericClientId = Number(clientId);
  const transaction = await sequelize.transaction();
  let committed = false;
  let writeResult;

  try {
    // 1 — lock + validate before any workout write
    const [mergeRows] = await sequelize.query(
      `SELECT id, status, user_id, client_id, approved_workout_session_id
         FROM plaud_merge_requests
        WHERE merge_request_id = :mergeRequestId
        FOR UPDATE`,
      { replacements: { mergeRequestId }, transaction },
    );
    const merge = mergeRows?.[0];
    const approvable = Boolean(
      merge
      && Number(merge.client_id) === numericClientId
      && (actingRole === 'admin' || Number(merge.user_id) === Number(actingUserId))
      && merge.status === 'completed'
      && merge.approved_workout_session_id == null,
    );
    if (!approvable) {
      throw new MergeApprovalError(
        'merge request not in approvable state (wrong owner / wrong client / already approved / not completed)',
      );
    }

    // 2 — workout write joins THIS transaction; engagement runs post-commit
    writeResult = await logWorkoutForClient({
      clientId: numericClientId,
      exercises,
      date,
      notes,
      title,
      duration,
      intensity,
      trainerId: actingUserId ?? null,
      sequelize,
      suppressEngagementSideEffects: true,
      transaction,
    });

    // 3 — whole-merge finalization (F1 fix: workout_sessions linkage + cipher purge)
    if (finalizeMerge) {
      const [updatedRows] = await sequelize.query(
        `UPDATE plaud_merge_requests
            SET status                      = 'approved',
                approved_workout_session_id = :sessionId,
                approved_at                 = NOW(),
                payload_cipher              = NULL,
                payload_iv                  = NULL,
                payload_tag                 = NULL,
                cipher_purged_at            = NOW()
          WHERE id = :id
            AND status = 'completed'
            AND approved_workout_session_id IS NULL
        RETURNING id`,
        { replacements: { sessionId: writeResult.sessionId, id: merge.id }, transaction },
      );
      if (!updatedRows || updatedRows.length === 0) {
        // Row is locked, so this should be unreachable — belt and braces.
        throw new MergeApprovalError(
          'merge request changed state during approval; nothing was logged',
        );
      }
    }

    await transaction.commit();
    committed = true;
  } catch (err) {
    if (!committed) {
      try { await transaction.rollback(); } catch (_) { /* already rolled back */ }
    }
    throw err;
  }

  // 4 — post-commit engagement, best-effort by contract
  let xp = null;
  if (!suppressEngagementSideEffects) {
    try {
      xp = await awardEngagementForWorkout({
        sequelize,
        clientId: numericClientId,
        sessionId: writeResult.sessionId,
        duration: writeResult.duration,
        exerciseCount: writeResult.exerciseCount,
        workoutDate: writeResult.date,
        trainerId: actingUserId ?? null,
      });
    } catch (engagementErr) {
      logger.warn(
        `[approveCaptureWorkout] engagement failed for session ${writeResult.sessionId}: ${engagementErr.message}`,
      );
      xp = null;
    }
  }

  return {
    ...writeResult,
    xp,
    xpAwarded: xp?.pointsAwarded ?? null,
    streakDays: xp?.streakDays ?? null,
    mergeApproved: Boolean(finalizeMerge),
  };
}
