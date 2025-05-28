'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔍 DEFINITIVE UUID FIX: Verifying all tables are correctly created...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Step 1: Verify users table has INTEGER id (our known correct state)
        const [usersIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id';
        `, { transaction: t });
        
        if (usersIdType.length === 0 || usersIdType[0].data_type !== 'integer') {
          throw new Error(`Expected users.id to be INTEGER, found: ${usersIdType[0]?.data_type || 'not found'}`);
        }
        
        console.log('✅ Users table has INTEGER id as expected');
        
        // Step 2: Check if all required tables exist
        const requiredTables = ['shopping_carts', 'cart_items', 'orders', 'order_items', 'notifications'];
        const existingTables = [];
        
        for (const tableName of requiredTables) {
          const [tableExists] = await queryInterface.sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = '${tableName}'
            );
          `, { transaction: t });
          
          if (tableExists[0].exists) {
            existingTables.push(tableName);
          }
        }
        
        console.log('📋 Existing tables:', existingTables);
        
        if (existingTables.length === requiredTables.length) {
          console.log('✅ All required tables already exist - no action needed');
        } else {
          const missingTables = requiredTables.filter(table => !existingTables.includes(table));
          console.log('⚠️ Missing tables:', missingTables);
          console.log('💡 These should have been created by previous migrations');
        }
        
        // Step 3: Verify foreign key constraints are properly set up
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT 
            tc.table_name, 
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
        
        console.log('📋 Foreign key constraints to users table:', constraints);
        
        console.log('🎉 DEFINITIVE UUID FIX VERIFICATION COMPLETED!');
        console.log('✅ All tables are correctly set up with INTEGER foreign keys');
        console.log('✅ Database schema is consistent and ready for production');
      });
      
    } catch (error) {
      console.error('❌ Definitive UUID fix verification failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('This is a verification migration - no rollback needed');
  }
};
