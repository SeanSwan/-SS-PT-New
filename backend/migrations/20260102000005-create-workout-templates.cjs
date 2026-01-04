'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('workout_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      templateName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      exercises: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of exercise objects with sets, reps, weight',
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        comment: 'Duration in minutes',
      },
      targetIntensity: {
        type: Sequelize.INTEGER,
        validate: {
          min: 1,
          max: 10,
        },
      },
      category: {
        type: Sequelize.STRING,
        comment: 'e.g., Upper Body, Lower Body, Full Body, Cardio',
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'If true, other users can see and use this template',
      },
      useCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times this template has been used',
      },
      lastUsed: {
        type: Sequelize.DATE,
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

    // Add indexes
    await queryInterface.addIndex('workout_templates', ['userId']);
    await queryInterface.addIndex('workout_templates', ['templateName']);
    await queryInterface.addIndex('workout_templates', ['category']);
    await queryInterface.addIndex('workout_templates', ['isPublic']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('workout_templates');
  },
};
