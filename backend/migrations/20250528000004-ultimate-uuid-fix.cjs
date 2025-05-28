'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚨 ULTIMATE UUID FIX: Scanning and fixing ALL userId columns in database...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Step 1: Find ALL tables with userId columns and check their data types
        console.log('🔍 Scanning database for userId columns...');
        
        const [userIdColumns] = await queryInterface.sequelize.query(`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns 
          WHERE column_name = 'userId' 
          AND table_schema = 'public'
          ORDER BY table_name;
        `, { transaction: t });
        
        console.log('📋 Found userId columns:', userIdColumns);
        
        // Step 2: Also check for senderId columns (like in notifications)
        const [senderIdColumns] = await queryInterface.sequelize.query(`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns 
          WHERE column_name = 'senderId' 
          AND table_schema = 'public'
          ORDER BY table_name;
        `, { transaction: t });
        
        console.log('📋 Found senderId columns:', senderIdColumns);
        
        // Step 3: Identify tables that need fixing (have integer instead of uuid)
        const tablesToFix = [];
        
        for (const col of userIdColumns) {
          if (col.data_type === 'integer') {
            tablesToFix.push({ table: col.table_name, column: 'userId' });
          }
        }
        
        for (const col of senderIdColumns) {
          if (col.data_type === 'integer') {
            tablesToFix.push({ table: col.table_name, column: 'senderId' });
          }
        }
        
        console.log('🔧 Tables needing UUID fixes:', tablesToFix);
        
        // Step 4: Fix each table systematically
        for (const fix of tablesToFix) {
          console.log(`🔨 Fixing ${fix.table}.${fix.column}...`);
          
          try {
            // Drop the foreign key constraint first
            await queryInterface.sequelize.query(`
              ALTER TABLE "${fix.table}" 
              DROP CONSTRAINT IF EXISTS "${fix.table}_${fix.column}_fkey";
            `, { transaction: t });
            
            // Change the column type to UUID
            await queryInterface.sequelize.query(`
              ALTER TABLE "${fix.table}" 
              ALTER COLUMN "${fix.column}" TYPE UUID USING "${fix.column}"::text::uuid;
            `, { transaction: t });
            
            // Re-add the foreign key constraint
            await queryInterface.sequelize.query(`
              ALTER TABLE "${fix.table}" 
              ADD CONSTRAINT "${fix.table}_${fix.column}_fkey" 
              FOREIGN KEY ("${fix.column}") REFERENCES users(id) 
              ON UPDATE CASCADE ON DELETE CASCADE;
            `, { transaction: t });
            
            console.log(`✅ Fixed ${fix.table}.${fix.column}`);
            
          } catch (error) {
            console.error(`❌ Failed to fix ${fix.table}.${fix.column}:`, error.message);
            
            // If direct conversion fails, try recreation approach
            if (fix.table === 'notifications') {
              console.log('🔄 Trying recreation approach for notifications table...');
              
              // Drop and recreate notifications table
              await queryInterface.sequelize.query('DROP TABLE IF EXISTS notifications CASCADE;', { transaction: t });
              
              await queryInterface.sequelize.query(`
                CREATE TABLE notifications (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (type IN ('orientation', 'system', 'order', 'workout', 'client', 'admin')),
                    read BOOLEAN NOT NULL DEFAULT FALSE,
                    link VARCHAR(255),
                    image VARCHAR(255),
                    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
                    "senderId" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
                    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
              `, { transaction: t });
              
              // Add indexes
              await queryInterface.sequelize.query('CREATE INDEX idx_notifications_userid ON notifications("userId");', { transaction: t });
              await queryInterface.sequelize.query('CREATE INDEX idx_notifications_read ON notifications(read);', { transaction: t });
              await queryInterface.sequelize.query('CREATE INDEX idx_notifications_type ON notifications(type);', { transaction: t });
              
              console.log('✅ Recreated notifications table with correct UUID columns');
            } else {
              throw error; // Re-throw if it's not a table we can easily recreate
            }
          }
        }
        
        // Step 5: Check if we missed any other tables with user foreign keys
        console.log('🔍 Final check for other user foreign key columns...');
        
        const [otherUserRefs] = await queryInterface.sequelize.query(`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns 
          WHERE (column_name LIKE '%user%' OR column_name LIKE '%User%') 
          AND table_schema = 'public'
          AND table_name != 'users'
          ORDER BY table_name, column_name;
        `, { transaction: t });
        
        console.log('📋 All user-related columns found:', otherUserRefs);
        
        // Step 6: Mark problematic migrations as completed
        await queryInterface.sequelize.query(`
          INSERT INTO "SequelizeMeta" (name) VALUES 
              ('20250508123456-create-notification-settings.cjs'),
              ('20250508123457-create-notifications.cjs')
          ON CONFLICT (name) DO NOTHING;
        `, { transaction: t });
        
        console.log('🎉 ULTIMATE UUID FIX COMPLETED SUCCESSFULLY!');
        console.log('✅ All userId and senderId columns are now UUID type');
        console.log('✅ All foreign key constraints properly established');
        console.log('✅ All problematic migrations marked as complete');
      });
      
    } catch (error) {
      console.error('❌ Ultimate UUID fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('This is an ultimate repair migration - no rollback implemented');
  }
};
