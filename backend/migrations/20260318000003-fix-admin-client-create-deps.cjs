'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure client_progress table exists (required by admin createClient endpoint)
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.client_progress') AS exists",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0]?.exists) {
      console.log('[Migration] Creating client_progress table');
      await queryInterface.createTable('client_progress', {
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
        level: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          allowNull: false,
        },
        totalXP: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        weeklyXP: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        monthlyXP: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        currentStreak: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        longestStreak: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        totalWorkoutsLogged: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        lastWorkoutDate: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      console.log('[Migration] client_progress table created');
    } else {
      console.log('[Migration] client_progress table already exists, skipping');
    }
  },

  async down(queryInterface) {
    // Don't drop the table on rollback to avoid data loss
    console.log('[Migration] Rollback is a no-op for client_progress table');
  },
};
