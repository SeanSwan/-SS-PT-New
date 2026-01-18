'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableCheck = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.workout_templates') AS table_name",
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (!tableCheck[0]?.table_name) {
        await queryInterface.createTable('workout_templates', {
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
        }, { transaction });
      } else {
        const columns = await queryInterface.describeTable('workout_templates', { transaction });

        if (!columns.userId) {
          await queryInterface.addColumn('workout_templates', 'userId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
        }

        if (!columns.templateName) {
          await queryInterface.addColumn('workout_templates', 'templateName', {
            type: Sequelize.STRING,
            allowNull: false
          }, { transaction });
        }

        if (!columns.description) {
          await queryInterface.addColumn('workout_templates', 'description', {
            type: Sequelize.TEXT
          }, { transaction });
        }

        if (!columns.exercises) {
          await queryInterface.addColumn('workout_templates', 'exercises', {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: []
          }, { transaction });
        }

        if (!columns.estimatedDuration) {
          await queryInterface.addColumn('workout_templates', 'estimatedDuration', {
            type: Sequelize.INTEGER
          }, { transaction });
        }

        if (!columns.targetIntensity) {
          await queryInterface.addColumn('workout_templates', 'targetIntensity', {
            type: Sequelize.INTEGER,
            validate: {
              min: 1,
              max: 10
            }
          }, { transaction });
        }

        if (!columns.category) {
          await queryInterface.addColumn('workout_templates', 'category', {
            type: Sequelize.STRING
          }, { transaction });
        }

        if (!columns.isPublic) {
          await queryInterface.addColumn('workout_templates', 'isPublic', {
            type: Sequelize.BOOLEAN,
            defaultValue: false
          }, { transaction });
        }

        if (!columns.useCount) {
          await queryInterface.addColumn('workout_templates', 'useCount', {
            type: Sequelize.INTEGER,
            defaultValue: 0
          }, { transaction });
        }

        if (!columns.lastUsed) {
          await queryInterface.addColumn('workout_templates', 'lastUsed', {
            type: Sequelize.DATE
          }, { transaction });
        }

        if (!columns.createdAt) {
          await queryInterface.addColumn('workout_templates', 'createdAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }, { transaction });
        }

        if (!columns.updatedAt) {
          await queryInterface.addColumn('workout_templates', 'updatedAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }, { transaction });
        }
      }

      // Add indexes (ignore if already present)
      try {
        await queryInterface.addIndex('workout_templates', ['userId'], { transaction });
      } catch (error) {
        if (!`${error.message}`.includes('already exists')) {
          throw error;
        }
      }

      try {
        await queryInterface.addIndex('workout_templates', ['templateName'], { transaction });
      } catch (error) {
        if (!`${error.message}`.includes('already exists')) {
          throw error;
        }
      }

      try {
        await queryInterface.addIndex('workout_templates', ['category'], { transaction });
      } catch (error) {
        if (!`${error.message}`.includes('already exists')) {
          throw error;
        }
      }

      try {
        await queryInterface.addIndex('workout_templates', ['isPublic'], { transaction });
      } catch (error) {
        if (!`${error.message}`.includes('already exists')) {
          throw error;
        }
      }

      await transaction.commit();
      console.log('Workout templates migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Error migrating workout_templates:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('workout_templates');
  },
};
