'use strict';

/**
 * Migration: Add sessionType and sessionId to WorkoutSessions
 * ===========================================================
 *
 * PURPOSE:
 * Distinguishes between solo self-logged workouts and trainer-led sessions
 *
 * FIELDS ADDED:
 * - sessionType: 'solo' | 'trainer-led'
 * - sessionId: Reference to Session table for trainer-led workouts
 * - trainerId: Reference to trainer for trainer-led workouts
 *
 * BUSINESS LOGIC:
 * - Solo workouts: Client logs workout independently, NO session credits deducted
 * - Trainer-led: Linked to a booked Session, session credits ARE deducted
 *
 * DEFAULT BEHAVIOR:
 * - Existing records default to 'solo' (backward compatibility)
 * - New workout logs default to 'solo' unless explicitly marked trainer-led
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add sessionType field
      await queryInterface.addColumn(
        'workout_sessions',
        'sessionType',
        {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'solo',
          comment: 'Type of workout session: solo (self-logged) or trainer-led (with trainer)'
        },
        { transaction }
      );

      // Add sessionId foreign key (references Session table for trainer-led workouts)
      await queryInterface.addColumn(
        'workout_sessions',
        'sessionId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'sessions',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Reference to booked Session for trainer-led workouts'
        },
        { transaction }
      );

      // Add trainerId field (denormalized for quick queries)
      await queryInterface.addColumn(
        'workout_sessions',
        'trainerId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Trainer who led this session (null for solo workouts)'
        },
        { transaction }
      );

      // Add index on sessionType for fast filtering
      await queryInterface.addIndex(
        'workout_sessions',
        ['sessionType'],
        {
          name: 'workout_sessions_session_type_idx',
          transaction
        }
      );

      // Add composite index for userId + sessionType (common query pattern)
      await queryInterface.addIndex(
        'workout_sessions',
        ['userId', 'sessionType'],
        {
          name: 'workout_sessions_user_session_type_idx',
          transaction
        }
      );

      // Add index on sessionId for joins
      await queryInterface.addIndex(
        'workout_sessions',
        ['sessionId'],
        {
          name: 'workout_sessions_session_id_idx',
          transaction
        }
      );

      // Add constraint: if sessionType is 'trainer-led', sessionId must be present
      await queryInterface.sequelize.query(
        `
        ALTER TABLE workout_sessions
        ADD CONSTRAINT check_trainer_led_has_session
        CHECK (
          ("sessionType" = 'solo') OR
          ("sessionType" = 'trainer-led' AND "sessionId" IS NOT NULL)
        )
        `,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Successfully added sessionType, sessionId, and trainerId to workout_sessions');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding session type fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop constraint
      await queryInterface.sequelize.query(
        'ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS check_trainer_led_has_session',
        { transaction }
      );

      // Drop indexes
      await queryInterface.removeIndex(
        'workout_sessions',
        'workout_sessions_session_id_idx',
        { transaction }
      );

      await queryInterface.removeIndex(
        'workout_sessions',
        'workout_sessions_user_session_type_idx',
        { transaction }
      );

      await queryInterface.removeIndex(
        'workout_sessions',
        'workout_sessions_session_type_idx',
        { transaction }
      );

      // Drop columns
      await queryInterface.removeColumn('workout_sessions', 'trainerId', { transaction });
      await queryInterface.removeColumn('workout_sessions', 'sessionId', { transaction });
      await queryInterface.removeColumn('workout_sessions', 'sessionType', { transaction });

      await transaction.commit();
      console.log('✅ Successfully removed sessionType fields from workout_sessions');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing session type fields:', error);
      throw error;
    }
  }
};
