#!/usr/bin/env node

/**
 * EMERGENCY SESSION FIX - SEQUELIZE VERSION
 * =========================================
 * Uses existing Sequelize setup to add missing Session columns
 */

import dotenv from 'dotenv';
dotenv.config();

async function emergencySessionFix() {
  console.log('🚨 EMERGENCY SESSION COLUMN FIX (SEQUELIZE)');
  console.log('==========================================');
  
  try {
    // Use existing database setup
    console.log('📦 Loading database connection...');
    const { default: sequelize } = await import('./backend/database.mjs');
    
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Check existing columns
    console.log('\n🔍 Checking sessions table structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY column_name;
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Current columns:', existingColumns.join(', '));
    
    // Add missing columns
    const columnsToAdd = [
      { name: 'reason', sql: 'ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);' },
      { name: 'isRecurring', sql: 'ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;' },
      { name: 'recurringPattern', sql: 'ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;' }
    ];
    
    let columnsAdded = 0;
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`\n❌ Missing column: ${col.name} - ADDING NOW...`);
        try {
          await sequelize.query(col.sql);
          console.log(`✅ Successfully added ${col.name} column`);
          columnsAdded++;
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`✅ Column ${col.name} already exists (detected during add)`);
          } else {
            console.error(`❌ Failed to add ${col.name}:`, error.message);
          }
        }
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }
    
    // Test the Session model
    console.log('\n🧪 Testing Session model access...');
    try {
      const { default: Session } = await import('./backend/models/Session.mjs');
      const sessionCount = await Session.count();
      console.log(`✅ Session model test PASSED - ${sessionCount} sessions accessible`);
    } catch (modelError) {
      console.error('❌ Session model test FAILED:', modelError.message);
      
      // Try direct SQL test
      console.log('🔄 Trying direct SQL test...');
      try {
        const [testResult] = await sequelize.query(`
          SELECT COUNT(*) as count FROM sessions;
        `);
        console.log(`✅ Direct SQL test PASSED - ${testResult[0].count} sessions in table`);
      } catch (sqlError) {
        console.error('❌ Direct SQL test FAILED:', sqlError.message);
      }
    }
    
    await sequelize.close();
    
    console.log('\n🎉 EMERGENCY SESSION FIX COMPLETED!');
    console.log(`📊 Added ${columnsAdded} missing columns`);
    console.log('📅 Session errors should now be resolved');
    console.log('\n🧪 TEST NOW:');
    console.log('Visit: https://ss-pt-new.onrender.com');
    console.log('Check: Client dashboard sessions should load without errors');
    
    return { success: true, columnsAdded };
    
  } catch (error) {
    console.error('\n💥 EMERGENCY SESSION FIX FAILED:', error.message);
    console.error('Error details:', error.stack);
    
    console.log('\n🚨 ALTERNATIVE SOLUTIONS:');
    console.log('1. Run this in Render console: node ../emergency-session-fix-sequelize.mjs');
    console.log('2. Check if DATABASE_URL points to production database');
    console.log('3. Verify database permissions allow ALTER TABLE');
    
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  emergencySessionFix()
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
}

export default emergencySessionFix;
