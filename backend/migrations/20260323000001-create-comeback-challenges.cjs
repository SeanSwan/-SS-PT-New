'use strict';

/**
 * Migration: Create ComebackChallenges table
 * ==========================================
 * Re-engagement system driven by Loss Aversion + Commitment/Consistency psychology.
 * When a user misses workouts, the system creates a challenge to bring them back.
 *
 * Triggers:
 *   - 7d missed → "Welcome Back Challenge" (complete 3 workouts for 2x XP)
 *   - 30d missed → "Fresh Start" (reduced daily goal)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if table already exists
      const [tables] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.\"ComebackChallenges\"') AS exists",
        { transaction }
      );
      if (tables[0]?.exists) {
        await transaction.commit();
        console.log('ComebackChallenges table already exists, skipping');
        return;
      }

      await queryInterface.createTable('ComebackChallenges', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: {
          type: Sequelize.ENUM('welcome_back', 'fresh_start', 'streak_recovery'),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('pending', 'accepted', 'completed', 'expired'),
          allowNull: false,
          defaultValue: 'pending',
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        targetWorkouts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 3,
        },
        completedWorkouts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        xpMultiplier: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 2.0,
        },
        bonusXP: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        daysMissed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        acceptedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }, { transaction });

      // Index for quick lookups
      await queryInterface.addIndex('ComebackChallenges', ['userId', 'status'], {
        name: 'idx_comeback_user_status',
        transaction,
      });

      await transaction.commit();
      console.log('Created ComebackChallenges table');
    } catch (error) {
      await transaction.rollback();
      console.error('Failed to create ComebackChallenges:', error.message);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ComebackChallenges');
  },
};
