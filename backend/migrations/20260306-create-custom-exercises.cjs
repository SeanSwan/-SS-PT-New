'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('custom_exercises')) {
      console.log('[Migration] custom_exercises table already exists, skipping');
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('custom_exercises', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        trainerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          field: 'trainerId',
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        category: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'custom',
        },
        baseExerciseKey: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: 'baseExerciseKey',
        },
        mechanicsSchema: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
          field: 'mechanicsSchema',
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'draft',
        },
        version: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        parentVersionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'custom_exercises', key: 'id' },
          field: 'parentVersionId',
        },
        validationResult: {
          type: Sequelize.JSONB,
          allowNull: true,
          field: 'validationResult',
        },
        usageCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'usageCount',
        },
        isPublic: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'isPublic',
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
      }, { transaction });

      await queryInterface.addIndex('custom_exercises', ['trainerId'],
        { name: 'idx_custom_exercise_trainer', transaction });
      await queryInterface.addIndex('custom_exercises', ['slug', 'trainerId'],
        { name: 'idx_custom_exercise_slug_trainer', unique: true, transaction });
      await queryInterface.addIndex('custom_exercises', ['status'],
        { name: 'idx_custom_exercise_status', transaction });
      await queryInterface.addIndex('custom_exercises', ['baseExerciseKey'],
        { name: 'idx_custom_exercise_base', transaction });
      await queryInterface.addIndex('custom_exercises', ['parentVersionId'],
        { name: 'idx_custom_exercise_parent', transaction });

      await transaction.commit();
      console.log('[Migration] Created custom_exercises table with indexes');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('custom_exercises');
  },
};
