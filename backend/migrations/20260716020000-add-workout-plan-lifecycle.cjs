/**
 * ============================================================================
 * FILE: 20260716020000-add-workout-plan-lifecycle.cjs
 * PURPOSE: Add explicit archive state and immutable lifecycle receipts.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

module.exports = {
  async up(queryInterface) {
    const usersTable = await resolveUsersTable(queryInterface);
    const quotedUsersTable = queryInterface.queryGenerator.quoteTable(usersTable);
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_workout_plans_status" ADD VALUE IF NOT EXISTS 'archived'`,
    );
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query([
        'ALTER TABLE workout_plans',
        '  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,',
        '  ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES ' + quotedUsersTable + '(id) ON DELETE SET NULL',
      ].join('\n'), { transaction });
      await queryInterface.sequelize.query([
        'CREATE TABLE IF NOT EXISTS workout_plan_lifecycle_receipts (',
        '  id UUID PRIMARY KEY,',
        '  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,',
        '  actor_id INTEGER REFERENCES ' + quotedUsersTable + '(id) ON DELETE SET NULL,',
        '  from_status TEXT NOT NULL,',
        '  to_status TEXT NOT NULL,',
        '  action VARCHAR(64) NOT NULL,',
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        ')',
      ].join('\n'), { transaction });
      await queryInterface.sequelize.query([
        'CREATE INDEX IF NOT EXISTS workout_plan_lifecycle_receipts_plan_idx',
        'ON workout_plan_lifecycle_receipts (plan_id, created_at DESC)',
      ].join('\n'), { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP TABLE IF EXISTS workout_plan_lifecycle_receipts',
        { transaction },
      );
      await queryInterface.sequelize.query([
        'ALTER TABLE workout_plans',
        '  DROP COLUMN IF EXISTS archived_by,',
        '  DROP COLUMN IF EXISTS archived_at',
      ].join('\n'), { transaction });
      // PostgreSQL enum values are intentionally retained. Removing archived
      // during incident rollback would require a destructive enum rewrite.
    });
  },
};