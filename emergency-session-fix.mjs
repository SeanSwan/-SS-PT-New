#!/usr/bin/env node

/**
 * EMERGENCY PRODUCTION COLUMN FIX
 * ===============================
 * Run this directly in Render console to add missing Session columns
 * This is a MINIMAL, TARGETED fix for the Session.reason error
 */

// Simple fix using raw SQL - no imports needed
async function emergencyColumnFix() {
  console.log('🚨 EMERGENCY SESSION COLUMN FIX');
  console.log('===============================');
  
  try {
    // Use native pg module directly
    const { Client } = await import('pg');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔌 Connecting to production database...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Check current columns
    console.log('\n🔍 Checking current session table structure...');
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY column_name;
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Current columns:', existingColumns.join(', '));
    
    // Add missing columns one by one
    const columnsToAdd = [
      { name: 'reason', sql: 'ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);' },
      { name: 'isRecurring', sql: 'ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;' },
      { name: 'recurringPattern', sql: 'ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;' }
    ];
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`\n❌ Missing column: ${col.name} - ADDING NOW...`);
        try {
          await client.query(col.sql);
          console.log(`✅ Successfully added ${col.name} column`);
        } catch (error) {
          console.error(`❌ Failed to add ${col.name}:`, error.message);
        }
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }
    
    // Test the fix
    console.log('\n🧪 Testing session query...');
    try {
      const { rows } = await client.query(`
        SELECT id, "sessionDate", duration, "userId", "trainerId", location, notes, reason, "isRecurring", "recurringPattern", status
        FROM sessions 
        LIMIT 1;
      `);
      console.log('✅ Session query test PASSED - columns are accessible');
    } catch (testError) {
      console.error('❌ Session query test FAILED:', testError.message);
    }
    
    await client.end();
    console.log('\n🎉 EMERGENCY FIX COMPLETED!');
    console.log('📅 Session errors should now be resolved');
    
  } catch (error) {
    console.error('\n💥 EMERGENCY FIX FAILED:', error.message);
    console.error('Full error:', error);
  }
}

// Run immediately
emergencyColumnFix().catch(console.error);
