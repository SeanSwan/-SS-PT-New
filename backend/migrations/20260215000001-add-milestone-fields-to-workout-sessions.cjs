'use strict';

/**
 * Migration: Add milestone tracking fields to workout_sessions
 * =============================================================
 *
 * PURPOSE:
 * Enable milestone tagging on individual workout sessions so the
 * gamification system can flag notable workouts (e.g., 100th workout,
 * first 60-min session, 30-day streak workout) for Trophy Case display.
 *
 * FIELDS ADDED:
 * - isMilestone: boolean flag (default false)
 * - milestoneType: descriptive string (nullable) e.g. 'workout_count_100'
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableCheck = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.workout_sessions') AS table_name",
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (!tableCheck[0]?.table_name) {
        await transaction.commit();
        console.log('Skipping migration: workout_sessions table does not exist');
        return;
      }

      // Check if columns already exist (idempotency)
      const columnRows = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'workout_sessions'
         AND column_name IN ('isMilestone', 'milestoneType')`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      const existingCols = columnRows.map(c => c.column_name);

      if (!existingCols.includes('isMilestone')) {
        await queryInterface.addColumn(
          'workout_sessions',
          'isMilestone',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether this workout session represents a milestone achievement'
          },
          { transaction }
        );
      }

      if (!existingCols.includes('milestoneType')) {
        await queryInterface.addColumn(
          'workout_sessions',
          'milestoneType',
          {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
            comment: 'Type of milestone, e.g. workout_count_100, streak_30, first_60min'
          },
          { transaction }
        );
      }

      // Index for querying milestones (Trophy Case) — skip if already exists
      const indexCheck = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes
         WHERE tablename = 'workout_sessions'
         AND indexname = 'workout_sessions_user_milestone_idx'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (indexCheck.length === 0) {
        await queryInterface.addIndex(
          'workout_sessions',
          ['userId', 'isMilestone'],
          {
            name: 'workout_sessions_user_milestone_idx',
            where: { isMilestone: true },
            transaction
          }
        );
      }

      await transaction.commit();
      console.log('Successfully added isMilestone and milestoneType to workout_sessions');

    } catch (error) {
      await transaction.rollback();
      console.error('Error adding milestone fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex(
        'workout_sessions',
        'workout_sessions_user_milestone_idx',
        { transaction }
      );

      await queryInterface.removeColumn('workout_sessions', 'milestoneType', { transaction });
      await queryInterface.removeColumn('workout_sessions', 'isMilestone', { transaction });

      await transaction.commit();
      console.log('Successfully removed milestone fields from workout_sessions');

    } catch (error) {
      await transaction.rollback();
      console.error('Error removing milestone fields:', error);
      throw error;
    }
  }
};
