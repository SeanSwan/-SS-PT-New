/**
 * Migration: Add missing User table columns
 * Adds columns that are in the model but missing from production
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if masterPromptJson column exists
      const [results] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'masterPromptJson';`,
        { transaction }
      );

      if (results.length === 0) {
        console.log('Adding masterPromptJson column...');
        await queryInterface.addColumn('Users', 'masterPromptJson', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Complete client master prompt JSON (v3.0 schema) for AI-powered coaching'
        }, { transaction });
        console.log('✅ Added masterPromptJson column');
      } else {
        console.log('⏭️  masterPromptJson column already exists');
      }

      // Check if spiritName column exists
      const [spiritResults] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'spiritName';`,
        { transaction }
      );

      if (spiritResults.length === 0) {
        console.log('Adding spiritName column...');
        await queryInterface.addColumn('Users', 'spiritName', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Client spirit name for privacy (e.g., "Golden Hawk", "Silver Crane")'
        }, { transaction });
        console.log('✅ Added spiritName column');
      } else {
        console.log('⏭️  spiritName column already exists');
      }

      await transaction.commit();
      console.log('✅ Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn('Users', 'masterPromptJson', { transaction });
      await queryInterface.removeColumn('Users', 'spiritName', { transaction });
      await transaction.commit();
      console.log('✅ Rollback completed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
