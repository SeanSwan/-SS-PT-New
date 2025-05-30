/**
 * CRITICAL FIX: Add missing deletedAt column to sessions table
 * ============================================================
 * 
 * PROBLEM: Session model has paranoid: true but sessions table lacks deletedAt column
 * SOLUTION: Add the deletedAt column for soft delete functionality
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 CRITICAL FIX: Adding missing deletedAt column to sessions table...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Check if deletedAt column already exists in sessions table
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'sessions' AND column_name = 'deletedAt';
        `, { transaction: t });
        
        if (columns.length > 0) {
          console.log('✅ deletedAt column already exists in sessions table - skipping');
          return;
        }
        
        console.log('➕ Adding deletedAt column to sessions table...');
        
        // Add the deletedAt column for paranoid mode
        await queryInterface.addColumn('sessions', 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp for soft deletes (paranoid mode)'
        }, { transaction: t });
        
        console.log('✅ deletedAt column added successfully to sessions table');
        
        // Add index for better performance on soft delete queries
        await queryInterface.addIndex('sessions', ['deletedAt'], {
          name: 'sessions_deleted_at_idx',
          transaction: t
        });
        
        console.log('✅ Index added for sessions.deletedAt column');
        console.log('🎉 SESSION COLUMN SESSION.DELETEDAT ERROR FIXED!');
        
      });
      
    } catch (error) {
      console.error('❌ Failed to add deletedAt column to sessions table:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back deletedAt column addition from sessions table...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Drop the index first
        await queryInterface.removeIndex('sessions', 'sessions_deleted_at_idx', { transaction: t });
        
        // Remove the deletedAt column
        await queryInterface.removeColumn('sessions', 'deletedAt', { transaction: t });
        
        console.log('✅ deletedAt column removed from sessions table');
        
      });
    } catch (error) {
      console.error('❌ Failed to rollback deletedAt column from sessions table:', error.message);
      throw error;
    }
  }
};
