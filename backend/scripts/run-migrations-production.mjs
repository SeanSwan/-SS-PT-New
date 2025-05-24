#!/usr/bin/env node

/**
 * Production Migration Runner
 * ==========================
 * This script runs database migrations in production environment.
 * It's designed to be safe and idempotent.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

console.log('🔄 Starting Production Database Migration');
console.log('========================================');

async function runMigrations() {
  try {
    console.log('📂 Backend directory:', backendDir);
    
    // Change to backend directory for migrations
    process.chdir(backendDir);
    
    console.log('🗄️ Running database migrations...');
    
    // Run migrations with explicit production environment
    const migrationCommand = 'npx sequelize-cli db:migrate --config config/config.js --migrations-path migrations --models-path models --env production';
    
    console.log('💻 Command:', migrationCommand);
    
    const { stdout, stderr } = await execAsync(migrationCommand);
    
    if (stdout) {
      console.log('📋 Migration Output:');
      console.log(stdout);
    }
    
    if (stderr) {
      console.log('⚠️ Migration Warnings/Errors:');
      console.log(stderr);
    }
    
    console.log('✅ Migration process completed successfully!');
    console.log('🚀 Your database schema should now be up to date.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.stdout) {
      console.log('📋 Command Output:', error.stdout);
    }
    
    if (error.stderr) {
      console.log('❌ Command Errors:', error.stderr);
    }
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Ensure DATABASE_URL is set correctly in your environment');
    console.log('2. Verify your database connection is working');
    console.log('3. Check that sequelize-cli is installed');
    console.log('4. Ensure migrations directory exists and contains valid migration files');
    
    process.exit(1);
  }
}

// Add some environment checks
console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET (hidden for security)' : 'NOT SET');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required for production migrations');
  process.exit(1);
}

runMigrations();
