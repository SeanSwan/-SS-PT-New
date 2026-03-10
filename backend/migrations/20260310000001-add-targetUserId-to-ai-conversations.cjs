'use strict';

/**
 * Migration: Add targetUserId column to ai_conversations table
 * Fixes: AI Chat 500 error — model expects this column but migration didn't create it
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if column already exists (idempotent)
      const tableDesc = await queryInterface.describeTable('ai_conversations', { transaction }).catch(() => null);

      if (!tableDesc) {
        console.log('ai_conversations table does not exist yet — skipping column add');
        await transaction.commit();
        return;
      }

      if (!tableDesc.targetUserId) {
        await queryInterface.addColumn('ai_conversations', 'targetUserId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }, { transaction });

        await queryInterface.addIndex('ai_conversations', ['targetUserId'], {
          name: 'ai_conversations_target_user_id_idx',
          transaction,
        });

        console.log('✅ Added targetUserId column to ai_conversations');
      } else {
        console.log('targetUserId column already exists — skipping');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ai_conversations', 'targetUserId');
  },
};
