/**
 * MANUAL SESSION DELETEDAT COLUMN FIX
 * ===================================
 * 
 * This migration adds the missing deletedAt column to the sessions table
 * to fix the "column Session.deletedAt does not exist" error.
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding deletedAt column to sessions table...');
    
    try {
      // Check if deletedAt column already exists
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'deletedAt';
      `);
      
      if (columns.length > 0) {
        console.log('✅ deletedAt column already exists - skipping');
        return;
      }
      
      // Add the deletedAt column for paranoid mode
      await queryInterface.addColumn('sessions', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft deletes (paranoid mode)'
      });
      
      console.log('✅ deletedAt column added successfully to sessions table');
      
      // Add index for better performance
      await queryInterface.addIndex('sessions', ['deletedAt'], {
        name: 'sessions_deleted_at_idx'
      });
      
      console.log('✅ Index added for sessions.deletedAt column');
      console.log('🎉 SESSION DELETEDAT COLUMN FIX COMPLETED!');
      
    } catch (error) {
      console.error('❌ Failed to add deletedAt column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back deletedAt column from sessions table...');
    
    try {
      // Drop the index first
      await queryInterface.removeIndex('sessions', 'sessions_deleted_at_idx');
      
      // Remove the deletedAt column
      await queryInterface.removeColumn('sessions', 'deletedAt');
      
      console.log('✅ deletedAt column removed from sessions table');
      
    } catch (error) {
      console.error('❌ Failed to rollback deletedAt column:', error.message);
      throw error;
    }
  }
};
