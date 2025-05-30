#!/usr/bin/env node

/**
 * 🚀 RENDER PRODUCTION MIGRATION RUNNER
 * =====================================
 * 
 * This script runs the official Sequelize migration on production
 * using the existing migration file we created.
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🚀 RENDER PRODUCTION MIGRATION');
console.log('==============================');

async function runProductionMigration() {
  try {
    console.log('📁 Changing to backend directory...');
    process.chdir('./backend');

    console.log('🔧 Running Sequelize migration on PRODUCTION...');
    console.log('Migration: 20250530000000-add-sessions-deletedat-column.cjs');

    // Run the migration against production database
    const migrationCommand = 'npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env production';
    
    console.log('⚡ Executing migration...');
    const output = execSync(migrationCommand, { 
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    console.log('📋 Migration output:');
    console.log(output);
    
    console.log('\n🎉 PRODUCTION MIGRATION COMPLETE!');
    console.log('=================================');
    console.log('✅ deletedAt column added to production sessions table');
    console.log('✅ Migration recorded in production SequelizeMeta');
    console.log('✅ Production database ready for deployment');
    
    // Go back to root directory
    process.chdir('..');
    
    return true;

  } catch (error) {
    console.error('❌ Production migration failed:', error.message);
    
    if (error.stdout) {
      console.log('📋 Migration stdout:', error.stdout);
    }
    if (error.stderr) {
      console.log('📋 Migration stderr:', error.stderr);
    }
    
    console.log('\n💡 Alternative approaches:');
    console.log('1. Use: node fix-production-database.mjs (direct SQL)');
    console.log('2. Or manually add column via Render dashboard');
    console.log('3. Or contact Render support for database access');
    
    // Go back to root directory
    try {
      process.chdir('..');
    } catch (chdirError) {
      // Ignore chdir errors in cleanup
    }
    
    return false;
  }
}

runProductionMigration();