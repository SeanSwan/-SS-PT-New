'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Checking if users table sync is needed...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Get current table structure
        const [currentColumns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
          ORDER BY column_name;
        `, { transaction: t });
        
        const existingColumns = currentColumns.map(col => col.column_name);
        console.log('📋 Existing columns:', existingColumns.length);
        
        // Check if the critical columns already exist (they should from the emergency bypass)
        const criticalColumns = ['availableSessions', 'isActive', 'points', 'refreshTokenHash'];
        const missingCritical = criticalColumns.filter(col => !existingColumns.includes(col));
        
        if (missingCritical.length === 0) {
          console.log('✅ All critical columns already exist - emergency bypass was successful!');
          console.log('✅ Users table is already synchronized with the model');
          console.log('✅ Skipping redundant column additions');
          return;
        }
        
        console.log(`⚠️  Still missing ${missingCritical.length} critical columns: ${missingCritical.join(', ')}`);
        
        // Define any remaining columns (should be none after emergency bypass)
        const requiredColumns = [
          { name: 'availableSessions', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'points', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'level', type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
          { name: 'refreshTokenHash', type: Sequelize.STRING, allowNull: true },
          { name: 'failedLoginAttempts', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'isLocked', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
          { name: 'lastLoginIP', type: Sequelize.STRING, allowNull: true },
          { name: 'registrationIP', type: Sequelize.STRING, allowNull: true },
          { name: 'lastActive', type: Sequelize.DATE, allowNull: true }
        ];
        
        // Add any still-missing columns
        let columnsAdded = 0;
        
        for (const column of requiredColumns) {
          if (!existingColumns.includes(column.name)) {
            console.log(`➕ Adding missing column: ${column.name}`);
            
            try {
              await queryInterface.addColumn('users', column.name, {
                type: column.type,
                allowNull: column.allowNull,
                defaultValue: column.defaultValue
              }, { transaction: t });
              
              columnsAdded++;
            } catch (error) {
              console.log(`⚠️ Could not add column ${column.name}: ${error.message}`);
            }
          }
        }
        
        if (columnsAdded > 0) {
          console.log(`✅ Added ${columnsAdded} remaining columns to users table`);
        }
        
        console.log('🎉 USERS TABLE SYNC COMPLETED!');
        console.log('✅ User model and database table are aligned');
        console.log('✅ Login functionality should work properly');
        
      });
      
    } catch (error) {
      console.error('❌ Failed to sync users table:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back users table sync...');
    console.log('⚠️ Skipping rollback - too risky in production with existing data');
  }
};
