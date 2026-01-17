'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('body_measurements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      recordedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      measurementDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      // Weight & Body Composition
      weight: {
        type: Sequelize.DECIMAL(5, 2),
      },
      weightUnit: {
        type: Sequelize.ENUM('lbs', 'kg'),
        defaultValue: 'lbs',
      },
      bodyFatPercentage: {
        type: Sequelize.DECIMAL(4, 2),
      },
      muscleMassPercentage: {
        type: Sequelize.DECIMAL(4, 2),
      },
      bmi: {
        type: Sequelize.DECIMAL(4, 2),
      },
      // Circumferences
      circumferenceUnit: {
        type: Sequelize.ENUM('inches', 'cm'),
        defaultValue: 'inches',
      },
      // Upper Body
      neck: Sequelize.DECIMAL(4, 2),
      shoulders: Sequelize.DECIMAL(5, 2),
      chest: Sequelize.DECIMAL(5, 2),
      upperChest: Sequelize.DECIMAL(5, 2),
      underChest: Sequelize.DECIMAL(5, 2),
      rightBicep: Sequelize.DECIMAL(4, 2),
      leftBicep: Sequelize.DECIMAL(4, 2),
      rightForearm: Sequelize.DECIMAL(4, 2),
      leftForearm: Sequelize.DECIMAL(4, 2),
      // Core
      naturalWaist: Sequelize.DECIMAL(5, 2),
      umbilicus: Sequelize.DECIMAL(5, 2),
      lowerWaist: Sequelize.DECIMAL(5, 2),
      // Lower Body
      hips: Sequelize.DECIMAL(5, 2),
      rightThigh: Sequelize.DECIMAL(5, 2),
      leftThigh: Sequelize.DECIMAL(5, 2),
      rightCalf: Sequelize.DECIMAL(4, 2),
      leftCalf: Sequelize.DECIMAL(4, 2),
      // Additional Metrics
      visceralFatLevel: Sequelize.INTEGER,
      metabolicAge: Sequelize.INTEGER,
      boneMass: Sequelize.DECIMAL(4, 2),
      waterPercentage: Sequelize.DECIMAL(4, 2),
      // Auto-calculated Data
      comparisonData: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      hasProgress: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      progressScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      milestonesAchieved: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      // Context
      notes: Sequelize.TEXT,
      clientNotes: Sequelize.TEXT,
      measurementMethod: {
        type: Sequelize.ENUM('manual_tape', 'smart_scale', 'dexa_scan', 'caliper', 'import'),
        defaultValue: 'manual_tape',
      },
      photoUrls: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      // Quality Control
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verifiedBy: Sequelize.UUID,
      verifiedAt: Sequelize.DATE,
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('body_measurements', ['userId', 'measurementDate']);
    await queryInterface.addIndex('body_measurements', ['userId', 'createdAt']);
    await queryInterface.addIndex('body_measurements', ['measurementDate']);
    await queryInterface.addIndex('body_measurements', ['hasProgress']);
    await queryInterface.addIndex('body_measurements', ['progressScore']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('body_measurements');
  },
};
