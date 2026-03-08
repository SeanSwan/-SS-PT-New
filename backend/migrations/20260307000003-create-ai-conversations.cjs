'use strict';

/**
 * Migration: Create ai_conversations table
 * Phase A1 of Enterprise Dashboard Enhancement Plan
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes('ai_conversations')) {
        await queryInterface.createTable('ai_conversations', {
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
          role: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING(200),
            allowNull: true,
          },
          context: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'general',
          },
          messages: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'active',
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          messageCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          lastMessageAt: {
            type: Sequelize.DATE,
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
        }, { transaction });

        await queryInterface.addIndex('ai_conversations', ['userId'], { transaction });
        await queryInterface.addIndex('ai_conversations', ['userId', 'status'], { transaction });
        await queryInterface.addIndex('ai_conversations', ['lastMessageAt'], { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_conversations');
  },
};
