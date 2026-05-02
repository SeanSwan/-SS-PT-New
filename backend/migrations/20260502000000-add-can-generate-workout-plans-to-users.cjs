/**
 * Migration: Add `canGenerateWorkoutPlans` flag to "Users"
 * =========================================================
 *
 * L5 (2026-05-02) of the Long-Horizon Workout Plan workstream.
 *
 * WHAT: adds a boolean per-user permission flag, default false. Pre-L5
 *       users with existing plan history are backfilled to true so
 *       admin / trainer-driven flows keep working immediately.
 *
 * WHY: opens the workout plan generator to client self-service when an
 *      admin enables it for that specific client. Backend gate is
 *      additionally protected by the `ENABLE_CLIENT_PLAN_SELFGEN` env
 *      flag (off by default) - this column on its own grants nothing
 *      until the env flag is flipped.
 *
 * SAFETY: idempotent column-add via information_schema check; targets
 *         the canonical PascalCase `"Users"` table (Codex 2026-05-02
 *         pre-impl review + Rule 58 schema-drift detection — there is
 *         a stale `users` table that must NOT be the FK / column target).
 *         Wrapped in a transaction so a failed backfill rolls back the
 *         column add too.
 *
 * REVERSIBILITY: down() drops the column. Nothing else depends on this
 *                column in the same migration window so the down is
 *                clean.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1) Idempotent column-add. Fail-safe re-run is supported.
      const [existing] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'canGenerateWorkoutPlans';`,
        { transaction }
      );

      if (existing.length === 0) {
        console.log('Adding canGenerateWorkoutPlans column to "Users"...');
        await queryInterface.addColumn(
          'Users',
          'canGenerateWorkoutPlans',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'L5: per-client opt-in for self-service workout plan generation. Default false (security default). Admin can enable per client. Backend additionally requires ENABLE_CLIENT_PLAN_SELFGEN env flag.',
          },
          { transaction }
        );
        console.log('✅ canGenerateWorkoutPlans column added');
      } else {
        console.log('⏭️  canGenerateWorkoutPlans column already exists - skipping add');
      }

      // 2) Backfill: any user with existing plan history keeps the flag
      //    true so admin/trainer-driven flows are not affected on rollout.
      //    Clients who reach the route directly are still gated by the
      //    env flag, so this backfill is a "no regression" safety net,
      //    not a "new client capability."
      //
      //    workout_plans.userId is camelCase per the model file
      //    (backend/models/WorkoutPlan.mjs:55), but the table itself is
      //    snake_case `workout_plans` - we quote `"userId"` so Postgres
      //    treats the case-sensitive column name correctly.
      const [updateResult] = await queryInterface.sequelize.query(
        `UPDATE "Users"
         SET "canGenerateWorkoutPlans" = true
         WHERE id IN (SELECT DISTINCT "userId" FROM workout_plans);`,
        { transaction }
      );
      console.log(`✅ Backfill complete - flag set to true for users with plan history`);

      await transaction.commit();
      console.log('✅ L5 migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ L5 migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop only if column exists - safe re-run.
      const [existing] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'canGenerateWorkoutPlans';`,
        { transaction }
      );
      if (existing.length > 0) {
        await queryInterface.removeColumn('Users', 'canGenerateWorkoutPlans', { transaction });
        console.log('✅ canGenerateWorkoutPlans column removed');
      } else {
        console.log('⏭️  canGenerateWorkoutPlans column already absent');
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ L5 migration rollback failed:', error.message);
      throw error;
    }
  },
};
