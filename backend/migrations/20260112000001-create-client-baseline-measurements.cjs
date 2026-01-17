'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_baseline_measurements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      recordedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      takenAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      restingHeartRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bloodPressureSystolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bloodPressureDiastolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      benchPressWeight: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      benchPressReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      squatWeight: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      squatReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      deadliftWeight: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      deadliftReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      overheadPressWeight: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      overheadPressReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pullUpsReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pullUpsAssisted: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      flexibilityNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rangeOfMotion: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      injuryNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      painLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('client_baseline_measurements', ['userId']);
    await queryInterface.addIndex('client_baseline_measurements', ['takenAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_baseline_measurements');
  },
};
