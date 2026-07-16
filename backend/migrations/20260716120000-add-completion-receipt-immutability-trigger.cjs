/**
 * ============================================================================
 * FILE: 20260716120000-add-completion-receipt-immutability-trigger.cjs
 * PURPOSE: Enforce completion-receipt immutability at the DATABASE level.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Adds a BEFORE UPDATE trigger that rejects every UPDATE
 * on workout_plan_completion_receipts. The model's ORM hooks already fail
 * closed, but hooks are bypassable (Model.upsert, increment/decrement, raw
 * sequelize.query) — evidence records need the guarantee in the database.
 * HOW IT FITS IN THE APP: Receipts are the immutable proof that a prescribed
 * plan assignment was completed; downstream progress projections trust them.
 * KEY DECISIONS: UPDATE only — DELETE stays open ON PURPOSE because the
 * retention design deletes receipts via FK cascades (account/plan/form
 * deletion is the privacy path); a delete-blocking trigger would break those
 * cascades. Trigger + function creation is idempotent for safe re-runs.
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
