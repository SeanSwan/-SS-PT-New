'use strict';

/**
 * Migration: Create daily_macro_logs table
 * Phase A3 of Enterprise Dashboard Enhancement Plan
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes('daily_macro_logs')) {
        await queryInterface.createTable('daily_macro_logs', {
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
          date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          mealType: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'snack',
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          calories: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          protein: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          carbs: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          fat: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          fiber: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          sugar: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          sodium: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          items: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          source: {
            type: Sequelize.STRING(30),
            allowNull: false,
            defaultValue: 'manual',
          },
          aiConversationId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'ai_conversations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        }, { transaction });

        await queryInterface.addIndex('daily_macro_logs', ['userId', 'date'], { transaction });
        await queryInterface.addIndex('daily_macro_logs', ['userId', 'date', 'mealType'], { transaction });
        await queryInterface.addIndex('daily_macro_logs', ['date'], { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_macro_logs');
  },
};
