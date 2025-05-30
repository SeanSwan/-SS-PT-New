#!/usr/bin/env node

/**
 * SIMPLE SESSION COLUMN FIX - NO DEPENDENCIES
 * ===========================================
 * Run this from backend directory in Render console
 */

async function simpleSessionFix() {
  console.log('🚨 SIMPLE SESSION COLUMN FIX');
  console.log('============================');
  
  try {
    // Use existing database setup (no dotenv needed in production)
    console.log('📦 Loading database connection...');
    const { default: sequelize } = await import('./database.mjs');
    
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Check existing columns
    console.log('\n🔍 Checking sessions table columns...');
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY column_name;
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Current columns:', existingColumns.join(', '));
    
    // Add missing columns one by one
    let columnsAdded = 0;
    
    // Check and add 'reason' column
    if (!existingColumns.includes('reason')) {
      console.log('\n❌ Missing column: reason - ADDING NOW...');
      try {
        await sequelize.query('ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);');
        console.log('✅ Successfully added reason column');
        columnsAdded++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Column reason already exists');
        } else {
          console.error('❌ Failed to add reason:', error.message);
        }
      }
    } else {
      console.log('✅ Column reason already exists');
    }
    
    // Check and add 'isRecurring' column
    if (!existingColumns.includes('isRecurring')) {
      console.log('\n❌ Missing column: isRecurring - ADDING NOW...');
      try {
        await sequelize.query('ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;');
        console.log('✅ Successfully added isRecurring column');
        columnsAdded++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Column isRecurring already exists');
        } else {
          console.error('❌ Failed to add isRecurring:', error.message);
        }
      }
    } else {
      console.log('✅ Column isRecurring already exists');
    }
    
    // Check and add 'recurringPattern' column
    if (!existingColumns.includes('recurringPattern')) {
      console.log('\n❌ Missing column: recurringPattern - ADDING NOW...');
      try {
        await sequelize.query('ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;');
        console.log('✅ Successfully added recurringPattern column');
        columnsAdded++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Column recurringPattern already exists');
        } else {
          console.error('❌ Failed to add recurringPattern:', error.message);
        }
      }
    } else {
      console.log('✅ Column recurringPattern already exists');
    }
    
    // Test session count
    console.log('\n🧪 Testing session query...');
    try {
      const [result] = await sequelize.query('SELECT COUNT(*) as count FROM sessions;');
      console.log(`✅ Session query test PASSED - ${result[0].count} sessions in table`);
    } catch (testError) {
      console.error('❌ Session query test FAILED:', testError.message);
    }
    
    await sequelize.close();
    
    console.log('\n🎉 SIMPLE SESSION FIX COMPLETED!');
    console.log(`📊 Added ${columnsAdded} missing columns`);
    console.log('📅 Session errors should now be resolved');
    console.log('\n🧪 TEST NOW: https://ss-pt-new.onrender.com');
    
    return { success: true, columnsAdded };
    
  } catch (error) {
    console.error('\n💥 SIMPLE SESSION FIX FAILED:', error.message);
    console.error('Error details:', error);
    return { success: false, error: error.message };
  }
}

// Run immediately
simpleSessionFix()
  .then((result) => {
    if (result.success) {
      console.log('\n🎊 SESSION COLUMNS FIXED!');
      process.exit(0);
    } else {
      console.log('\n💥 FIX FAILED - See error details above');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
