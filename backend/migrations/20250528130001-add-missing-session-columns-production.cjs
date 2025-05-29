/**
 * PRODUCTION DATABASE MIGRATION
 * ==============================
 * This migration adds the missing columns to production
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing session columns for production...');
    
    // Check if columns exist before adding them
    const tableDescription = await queryInterface.describeTable('sessions');
    
    // Add reason column if it doesn't exist
    if (!tableDescription.reason) {
      await queryInterface.addColumn('sessions', 'reason', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason for blocked time'
      });
      console.log('✅ Added reason column');
    }
    
    // Add isRecurring column if it doesn't exist  
    if (!tableDescription.isRecurring) {
      await queryInterface.addColumn('sessions', 'isRecurring', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is recurring'
      });
      console.log('✅ Added isRecurring column');
    }
    
    // Add recurringPattern column if it doesn't exist
    if (!tableDescription.recurringPattern) {
      await queryInterface.addColumn('sessions', 'recurringPattern', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Pattern for recurring times'
      });
      console.log('✅ Added recurringPattern column');
    }
    
    console.log('🎉 Production session columns migration complete!');
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns if we need to rollback
    await queryInterface.removeColumn('sessions', 'reason');
    await queryInterface.removeColumn('sessions', 'isRecurring'); 
    await queryInterface.removeColumn('sessions', 'recurringPattern');
    console.log('⏪ Rolled back session columns');
  }
};