'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists (idempotent)
    try {
      await queryInterface.describeTable('Exercises');
      console.log('Exercises table already exists, skipping creation');
      return;
    } catch (e) {
      // Table doesn't exist, create it
    }

    // Create the ENUM type first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Exercises_exerciseType" AS ENUM (
          'core', 'balance', 'stability', 'flexibility', 'calisthenics',
          'isolation', 'stabilizers', 'injury_prevention', 'injury_recovery', 'compound'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('Exercises', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      videoUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      exerciseType: {
        type: Sequelize.ENUM(
          'core', 'balance', 'stability', 'flexibility', 'calisthenics',
          'isolation', 'stabilizers', 'injury_prevention', 'injury_recovery', 'compound'
        ),
        allowNull: false,
      },
      primaryMuscles: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      secondaryMuscles: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      difficulty: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      progressionPath: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      prerequisites: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      equipmentNeeded: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      canBePerformedAtHome: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      coachingCues: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      contraindicationNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      safetyTips: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recommendedSets: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      recommendedReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      recommendedDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      restInterval: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      scientificReferences: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      unlockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      isPopular: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      experiencePointsEarned: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      targetProgressionRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Exercises');
  },
};
