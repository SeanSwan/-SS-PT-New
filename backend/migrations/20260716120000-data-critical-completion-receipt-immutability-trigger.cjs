/**
 * ============================================================================
 * FILE: 20260716120000-data-critical-completion-receipt-immutability-trigger.cjs
 * PURPOSE: Enforce completion-receipt immutability at the DATABASE level.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Adds a BEFORE UPDATE trigger that rejects UPDATEs on
 * workout_plan_completion_receipts, with ONE legal exception (below). The
 * model's ORM hooks already fail closed, but hooks are bypassable
 * (Model.upsert, increment/decrement, raw sequelize.query) — evidence records
 * need the guarantee in the database.
 * HOW IT FITS IN THE APP: Receipts are the immutable proof that a prescribed
 * plan assignment was completed; downstream progress projections trust them.
 * KEY DECISIONS:
 * - DELETE stays open ON PURPOSE: the retention design deletes receipts via
 *   FK cascades (account/plan/form deletion is the privacy path); a
 *   delete-blocking trigger would break those cascades.
 * - The workout_sessions FK is ON DELETE SET NULL, which Postgres executes as
 *   an UPDATE on the receipt row (and fires user triggers). The function
 *   therefore ALLOWS exactly one transition: workout_session_id -> NULL with
 *   every other column identical (jsonb comparison, future-column-proof).
 *   Without this, deleting any workout session referenced by a receipt would
 *   500, and account-deletion cascades could abort on FK-action ordering.
 * - Filename carries "data-critical" so safe-migrate's fail-closed lane owns
 *   it: if this integrity control ever genuinely fails to install, the
 *   failure must block and retry, never be silently marked done.
 * NASM PROTOCOL CONTEXT: Completed acute-variable prescriptions stay exactly
 * as they were delivered, even against future application bugs.
 */

'use strict';

const TABLE = 'workout_plan_completion_receipts';
const FN = 'workout_plan_completion_receipts_block_update';
const TRIGGER = 'trg_workout_plan_completion_receipts_immutable';

module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION ${FN}() RETURNS trigger AS $$
         BEGIN
           -- Sole legal transition: the workout_sessions FK (ON DELETE SET
           -- NULL) nulling workout_session_id, all other columns unchanged.
           IF NEW.workout_session_id IS NULL
              AND OLD.workout_session_id IS NOT NULL
              AND (to_jsonb(NEW) - 'workout_session_id') = (to_jsonb(OLD) - 'workout_session_id') THEN
             RETURN NEW;
           END IF;
           RAISE EXCEPTION 'workout_plan_completion_receipts rows are immutable evidence records'
             USING ERRCODE = 'raise_exception';
         END;
         $$ LANGUAGE plpgsql`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DROP TRIGGER IF EXISTS ${TRIGGER} ON ${TABLE}`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE TRIGGER ${TRIGGER}
         BEFORE UPDATE ON ${TABLE}
         FOR EACH ROW EXECUTE FUNCTION ${FN}()`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP TRIGGER IF EXISTS ${TRIGGER} ON ${TABLE}`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DROP FUNCTION IF EXISTS ${FN}()`,
        { transaction },
      );
    });
  },
};
