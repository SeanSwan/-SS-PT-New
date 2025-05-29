/**
 * EMERGENCY PRODUCTION DATABASE FIX
 * =================================
 * Manually adds missing columns to production database
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚨 EMERGENCY: Adding missing session columns to production...');
    
    try {
      // Get table description to see what columns exist
      const tableInfo = await queryInterface.describeTable('sessions');
      console.log('Current session columns:', Object.keys(tableInfo));
      
      // Add reason column if missing
      if (!tableInfo.reason) {
        console.log('Adding reason column...');
        await queryInterface.addColumn('sessions', 'reason', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added reason column');
      } else {
        console.log('✅ reason column already exists');
      }
      
      // Add isRecurring column if missing
      if (!tableInfo.isRecurring) {
        console.log('Adding isRecurring column...');
        await queryInterface.addColumn('sessions', 'isRecurring', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('✅ Added isRecurring column');
      } else {
        console.log('✅ isRecurring column already exists');
      }
      
      // Add recurringPattern column if missing
      if (!tableInfo.recurringPattern) {
        console.log('Adding recurringPattern column...');
        await queryInterface.addColumn('sessions', 'recurringPattern', {
          type: Sequelize.JSON,
          allowNull: true
        });
        console.log('✅ Added recurringPattern column');
      } else {
        console.log('✅ recurringPattern column already exists');
      }
      
      console.log('🎉 Emergency database fix completed successfully!');
      
    } catch (error) {
      console.error('❌ Emergency fix failed:', error.message);
      
      // Try alternative approach - raw SQL
      console.log('Trying raw SQL approach...');
      
      try {
        // Check and add columns with raw SQL
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            -- Add reason column if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'sessions' AND column_name = 'reason'
            ) THEN
              ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);
            END IF;
            
            -- Add isRecurring column if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'sessions' AND column_name = 'isRecurring'
            ) THEN
              ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;
            END IF;
            
            -- Add recurringPattern column if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'sessions' AND column_name = 'recurringPattern'
            ) THEN
              ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;
            END IF;
          END $$;
        `);
        
        console.log('✅ Raw SQL fix completed successfully!');
        
      } catch (sqlError) {
        console.error('❌ Raw SQL fix also failed:', sqlError.message);
        throw sqlError;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back emergency fix...');
    await queryInterface.removeColumn('sessions', 'reason');
    await queryInterface.removeColumn('sessions', 'isRecurring');
    await queryInterface.removeColumn('sessions', 'recurringPattern');
  }
};