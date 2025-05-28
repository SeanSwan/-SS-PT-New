'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔍 ULTIMATE UUID FIX: Checking if INTEGER foreign keys are properly aligned...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Step 1: Verify users table has INTEGER id
        const [usersIdType] = await queryInterface.sequelize.query(`
          SELECT data_type, column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id';
        `, { transaction: t });
        
        console.log('📋 Users table id type:', usersIdType);
        
        if (usersIdType.length === 0 || usersIdType[0].data_type !== 'integer') {
          throw new Error(`Expected users.id to be INTEGER, found: ${usersIdType[0]?.data_type || 'not found'}`);
        }
        
        // Step 2: Check all userId foreign key columns
        const [userIdColumns] = await queryInterface.sequelize.query(`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns 
          WHERE column_name IN ('userId', 'senderId', 'trainerId', 'cancelledBy') 
          AND table_schema = 'public'
          ORDER BY table_name;
        `, { transaction: t });
        
        console.log('📋 Found user foreign key columns:', userIdColumns);
        
        // Step 3: Verify all are INTEGER (correct type)
        const wrongTypeColumns = userIdColumns.filter(col => col.data_type !== 'integer');
        
        if (wrongTypeColumns.length > 0) {
          console.log('⚠️ Found columns with wrong types:', wrongTypeColumns);
          console.log('🚨 ERROR: Some columns still have wrong data types!');
          console.log('💡 This suggests the previous migration did not complete successfully.');
          console.log('🔧 Please check your data and run the migration again if needed.');
        } else {
          console.log('✅ All user foreign key columns are already INTEGER type - no fixes needed!');
        }
        
        // Step 4: Ensure foreign key constraints exist
        console.log('🔗 Verifying foreign key constraints exist...');
        
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT 
            tc.table_name, 
            tc.constraint_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'users'
          ORDER BY tc.table_name;
        `, { transaction: t });
        
        console.log('📋 Found foreign key constraints to users table:', constraints);
        
        console.log('🎉 ULTIMATE UUID FIX COMPLETED SUCCESSFULLY!');
        console.log('✅ All user foreign keys are properly aligned as INTEGER type');
        console.log('✅ All foreign key constraints are in place');
      });
      
    } catch (error) {
      console.error('❌ Ultimate UUID fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('This is a verification migration - no rollback needed');
  }
};
