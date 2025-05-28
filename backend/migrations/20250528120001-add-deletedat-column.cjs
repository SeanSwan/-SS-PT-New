'use strict';

/**
 * CRITICAL FIX: Add missing deletedAt column for paranoid mode
 * This column is required because User model has paranoid: true
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing deletedAt column for soft deletes...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Check if deletedAt column already exists
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'deletedAt';
        `, { transaction: t });
        
        if (columns.length > 0) {
          console.log('✅ deletedAt column already exists - skipping');
          return;
        }
        
        console.log('➕ Adding deletedAt column...');
        
        // Add the deletedAt column for paranoid mode
        await queryInterface.addColumn('users', 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp for soft deletes (paranoid mode)'
        }, { transaction: t });
        
        console.log('✅ deletedAt column added successfully');
        
        // Add index for better performance on soft delete queries
        await queryInterface.addIndex('users', ['deletedAt'], {
          name: 'users_deleted_at_idx',
          transaction: t
        });
        
        console.log('✅ Index added for deletedAt column');
        console.log('🎉 LOGIN SHOULD NOW WORK!');
        
      });
      
    } catch (error) {
      console.error('❌ Failed to add deletedAt column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back deletedAt column addition...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Drop the index first
        await queryInterface.removeIndex('users', 'users_deleted_at_idx', { transaction: t });
        
        // Remove the deletedAt column
        await queryInterface.removeColumn('users', 'deletedAt', { transaction: t });
        
        console.log('✅ deletedAt column removed');
        
      });
    } catch (error) {
      console.error('❌ Failed to rollback deletedAt column:', error.message);
      throw error;
    }
  }
};
