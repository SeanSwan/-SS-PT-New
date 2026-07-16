/**
 * ============================================================================
 * FILE: 20260715012000-create-workout-plan-completion-receipts.cjs
 * PURPOSE: Create immutable WorkoutPlan completion evidence storage.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates the receipt table, retention-aware foreign keys,
 * positive-value checks, and idempotency/read indexes atomically.
 * HOW IT FITS IN THE APP: Runs after WorkoutPlan identity backfill and before
 * completion writers require receipt creation.
 * KEY DECISIONS: Privacy deletion cascades account/plan/form evidence; deleting a
 * session only nulls that optional link; rollback drops only this additive table.
 * NASM PROTOCOL CONTEXT: Makes completed prescription history durable.
 */

'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

const INDEXES = [
  [['idempotency_key'], { unique: true, name: 'workout_plan_completion_receipts_idempotency_unique' }],
  [['daily_workout_form_id'], { unique: true, name: 'workout_plan_completion_receipts_daily_form_unique' }],
  [['workout_plan_id', 'prescribed_revision'], { name: 'idx_workout_plan_completion_receipts_plan_revision' }],
  [['client_id', 'scheduled_date'], { name: 'idx_workout_plan_completion_receipts_client_date' }],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersTable = await resolveUsersTable(queryInterface);
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('workout_plan_completion_receipts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        workout_plan_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'workout_plans', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        day_key: { type: Sequelize.STRING(64), allowNull: false },
        assignment_id: { type: Sequelize.STRING(255), allowNull: false },
        occurrence_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        scheduled_date: { type: Sequelize.DATEONLY, allowNull: false },
        prescribed_revision: { type: Sequelize.INTEGER, allowNull: false },
        prescribed_hash: { type: Sequelize.CHAR(64), allowNull: false },
        exercise_snapshot: { type: Sequelize.JSONB, allowNull: false },
        daily_workout_form_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'daily_workout_forms', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        workout_session_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'workout_sessions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        idempotency_key: { type: Sequelize.STRING(80), allowNull: false },
        completed_at: { type: Sequelize.DATE, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });

      await queryInterface.sequelize.query(
        `ALTER TABLE workout_plan_completion_receipts
         ADD CONSTRAINT workout_plan_completion_occurrence_positive CHECK (occurrence_index > 0),
         ADD CONSTRAINT workout_plan_completion_revision_positive CHECK (prescribed_revision > 0),
         ADD CONSTRAINT workout_plan_completion_day_key_format CHECK (day_key ~ '^w[1-9][0-9]*:d[1-9][0-9]*$'),
         ADD CONSTRAINT workout_plan_completion_hash_format CHECK (prescribed_hash ~ '^[0-9a-f]{64}$'),
         ADD CONSTRAINT workout_plan_completion_idempotency_format CHECK (idempotency_key ~ '^wpc:[0-9a-f]{64}$')`,
        { transaction },
      );
      for (const [fields, options] of INDEXES) {
        await queryInterface.addIndex(
          'workout_plan_completion_receipts',
          fields,
          { ...options, transaction },
        );
      }
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction((transaction) => (
      queryInterface.dropTable('workout_plan_completion_receipts', { transaction })
    ));
  },
};
