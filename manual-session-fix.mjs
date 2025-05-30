#!/usr/bin/env node

/**
 * 🛠️ MANUAL SESSION.DELETEDAT FIX
 * ================================
 * 
 * This script manually adds the deletedAt column to the sessions table
 * using direct SQL commands. Use this if the migration approach fails.
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🛠️ MANUAL SESSION.DELETEDAT FIX');
console.log('===============================');

const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function manualFix() {
  try {
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL database');

    // Step 1: Check current table structure
    console.log('\\n📋 Checking current sessions table structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current sessions table columns:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name} (${col.data_type})`);
    });

    // Step 2: Check if deletedAt exists
    const deletedAtExists = columns.some(col => col.column_name === 'deletedAt');
    
    if (deletedAtExists) {
      console.log('\\n✅ deletedAt column already exists - no fix needed');
      return;
    }

    console.log('\\n❌ deletedAt column missing - adding now...');

    // Step 3: Add deletedAt column
    console.log('🔧 Adding deletedAt column...');
    await sequelize.query(`
      ALTER TABLE sessions 
      ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    console.log('✅ deletedAt column added');

    // Step 4: Add index for performance
    console.log('🔧 Adding index for deletedAt...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at 
      ON sessions ("deletedAt");
    `);
    console.log('✅ Index added');

    // Step 5: Update SequelizeMeta to record this as a migration
    console.log('🔧 Recording migration in SequelizeMeta...');
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20250530000000-add-sessions-deletedat-column.cjs')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Migration recorded');

    // Step 6: Test the fix
    console.log('\\n🧪 Testing the fix...');
    const [testResult] = await sequelize.query(`
      SELECT COUNT(*) as total_sessions,
             COUNT(*) FILTER (WHERE "deletedAt" IS NULL) as active_sessions,
             COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) as deleted_sessions
      FROM sessions;
    `);
    
    const stats = testResult[0];
    console.log(`✅ Test successful:`);
    console.log(`   Total sessions: ${stats.total_sessions}`);
    console.log(`   Active sessions: ${stats.active_sessions}`);
    console.log(`   Deleted sessions: ${stats.deleted_sessions}`);

    // Step 7: Verify table structure
    console.log('\\n📋 Verifying updated table structure...');
    const [updatedColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position;
    `);
    
    const deletedAtColumn = updatedColumns.find(col => col.column_name === 'deletedAt');
    if (deletedAtColumn) {
      console.log(`✅ deletedAt column confirmed: ${deletedAtColumn.data_type}, nullable: ${deletedAtColumn.is_nullable}`);
    }

    console.log('\\n🎉 SESSION.DELETEDAT MANUAL FIX COMPLETE!');
    console.log('==========================================');
    console.log('✅ deletedAt column added to sessions table');
    console.log('✅ Index created for performance');
    console.log('✅ Migration recorded in SequelizeMeta');
    console.log('✅ All Session model queries should now work');
    
    console.log('\\n🔧 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test your API endpoints');
    console.log('3. Check that frontend can load sessions data');

  } catch (error) {
    console.error('\\n❌ Manual fix failed:', error.message);
    
    if (error.message.includes('column "deletedAt" of relation "sessions" already exists')) {
      console.log('✅ Column already exists - fix not needed');
    } else if (error.message.includes('relation "sessions" does not exist')) {
      console.log('❌ Sessions table does not exist - run migrations first');
      console.log('   Try: cd backend && npx sequelize-cli db:migrate');
    } else {
      console.log('💡 Try running this script as database admin or check permissions');
    }
  } finally {
    await sequelize.close();
  }
}

manualFix();