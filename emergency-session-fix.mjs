#!/usr/bin/env node

/**
 * 🚨 EMERGENCY SESSION.DELETEDAT FIX SCRIPT
 * ==========================================
 * 
 * This script addresses the critical Session.deletedAt column error
 * and port conflicts that are preventing local development.
 * 
 * Issues Fixed:
 * 1. Session.deletedAt column missing from database
 * 2. Port conflicts preventing services from starting
 * 3. Database migration status verification
 */

import { Sequelize, DataTypes } from 'sequelize';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

console.log('🚨 EMERGENCY SESSION.DELETEDAT FIX STARTING...');
console.log('==================================================');

async function step1_checkSessionsTable() {
  console.log('\n📋 STEP 1: Checking current sessions table structure...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if deletedAt column exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ deletedAt column already exists - no migration needed');
      return true;
    } else {
      console.log('❌ deletedAt column MISSING - migration required');
      return false;
    }
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

async function step2_runMigration() {
  console.log('\n🔧 STEP 2: Running Session.deletedAt migration...');
  
  try {
    // Change to backend directory
    process.chdir('./backend');
    console.log('📁 Changed to backend directory');
    
    // Run the specific migration that adds deletedAt column
    console.log('🔄 Running migration: 20250530000000-add-sessions-deletedat-column.cjs');
    
    const migrationCommand = 'npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env development';
    
    const output = execSync(migrationCommand, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('📋 Migration output:');
    console.log(output);
    console.log('✅ Migration completed successfully');
    
    // Go back to root directory
    process.chdir('..');
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stdout) {
      console.log('📋 Migration stdout:', error.stdout);
    }
    if (error.stderr) {
      console.log('📋 Migration stderr:', error.stderr);
    }
    process.chdir('..');
    return false;
  }
}

async function step3_verifyFix() {
  console.log('\n✅ STEP 3: Verifying Session.deletedAt fix...');
  
  try {
    // Check if deletedAt column now exists
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ deletedAt column verified - exists in sessions table');
      console.log(`   Type: ${columns[0].data_type}`);
      
      // Test a simple Session query that would have failed before
      const [testQuery] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE "deletedAt" IS NULL;
      `);
      
      console.log(`✅ Test query successful - ${testQuery[0].count} active sessions found`);
      return true;
    } else {
      console.log('❌ deletedAt column still missing after migration');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function step4_checkPortConflicts() {
  console.log('\n🔍 STEP 4: Checking for port conflicts...');
  
  const ports = [8000, 8001, 8002, 8003, 8004, 10000, 5173];
  const conflicts = [];
  
  for (const port of ports) {
    try {
      // On Windows, use netstat to check port usage
      const output = execSync(`netstat -ano | findstr :${port}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (output.trim()) {
        conflicts.push(port);
        console.log(`❌ Port ${port} is in use:`);
        console.log(`   ${output.trim().split('\\n')[0]}`);
      }
    } catch (error) {
      // No output means port is available
      console.log(`✅ Port ${port} is available`);
    }
  }
  
  if (conflicts.length > 0) {
    console.log('\\n⚠️ PORT CONFLICTS DETECTED:');
    console.log('Solutions:');
    console.log('1. Kill conflicting processes:');
    conflicts.forEach(port => {
      console.log(`   taskkill /F /IM node.exe (if port ${port} is from Node.js)`);
    });
    console.log('2. Or restart your computer to clear all processes');
    console.log('3. Or use different ports in .env configuration');
  }
  
  return conflicts.length === 0;
}

async function step5_testSessionsAPI() {
  console.log('\n🧪 STEP 5: Testing Sessions API endpoint...');
  
  try {
    // Import Session model to test if it works now
    const { default: Session } = await import('./backend/models/Session.mjs');
    
    // Try a simple findAll query that was failing before
    const sessions = await Session.findAll({
      limit: 1,
      attributes: ['id', 'sessionDate', 'status']
    });
    
    console.log('✅ Session.findAll() works - no more deletedAt error!');
    console.log(`   Found ${sessions.length} session(s) in test query`);
    
    return true;
  } catch (error) {
    console.error('❌ Session model test failed:', error.message);
    if (error.message.includes('deletedAt')) {
      console.log('   The deletedAt column error persists');
    }
    return false;
  }
}

// Main execution
async function runEmergencyFix() {
  try {
    // Step 1: Check current state
    const deletedAtExists = await step1_checkSessionsTable();
    
    // Step 2: Run migration if needed
    if (!deletedAtExists) {
      const migrationSuccess = await step2_runMigration();
      if (!migrationSuccess) {
        console.log('\\n❌ CRITICAL: Migration failed - manual intervention required');
        console.log('\\nManual steps:');
        console.log('1. cd backend');
        console.log('2. npx sequelize-cli db:migrate --env development');
        console.log('3. Verify with: psql -d swanstudios -c "\\d sessions"');
        return;
      }
    }
    
    // Step 3: Verify the fix
    const verifySuccess = await step3_verifyFix();
    if (!verifySuccess) {
      console.log('\\n❌ CRITICAL: Verification failed');
      return;
    }
    
    // Step 4: Check ports
    await step4_checkPortConflicts();
    
    // Step 5: Test Sessions API
    const apiTestSuccess = await step5_testSessionsAPI();
    
    if (apiTestSuccess) {
      console.log('\\n🎉 SUCCESS: SESSION.DELETEDAT ERROR FIXED!');
      console.log('============================================');
      console.log('✅ Sessions table has deletedAt column');
      console.log('✅ Session model queries work properly');
      console.log('✅ Backend APIs should now function');
      console.log('\\n🚀 Next steps:');
      console.log('1. Start your development servers: npm run start-debug');
      console.log('2. Test your frontend at http://localhost:5173');
      console.log('3. Verify API endpoints work without 500 errors');
    } else {
      console.log('\\n⚠️ Session API test failed - additional debugging needed');
    }
    
  } catch (error) {
    console.error('\\n💥 EMERGENCY FIX FAILED:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
runEmergencyFix();