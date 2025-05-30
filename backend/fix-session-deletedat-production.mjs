#!/usr/bin/env node

/**
 * SESSION DELETEDAT COLUMN FIX - PRODUCTION DEPLOYMENT
 * ====================================================
 * 
 * This script fixes the persistent "column Session.deletedAt does not exist" error
 * by running the migration to add the missing deletedAt column to the sessions table.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logHeader = (message) => {
  console.log(`\n${colors.bright}${colors.cyan}================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================${colors.reset}\n`);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');

async function main() {
  try {
    logHeader('🔧 SESSION DELETEDAT COLUMN FIX - PRODUCTION DEPLOYMENT');
    
    logInfo('Root Cause: Session model has paranoid: true but sessions table lacks deletedAt column');
    logInfo('Solution: Add missing deletedAt column to sessions table');
    console.log();
    
    // Check if we're in the backend directory
    const backendDir = resolve(__dirname, 'backend');
    process.chdir(backendDir);
    logInfo(`Working directory: ${process.cwd()}`);
    
    // Check if migration file exists
    const migrationFile = '20250530000000-add-sessions-deletedat-column.cjs';
    const migrationPath = resolve(backendDir, 'migrations', migrationFile);
    
    try {
      const fs = await import('fs');
      if (!fs.existsSync(migrationPath)) {
        logError(`Migration file not found: ${migrationPath}`);
        logError('Please ensure the migration file exists before running this script.');
        process.exit(1);
      }
      logSuccess(`Migration file found: ${migrationFile}`);
    } catch (error) {
      logError(`Error checking migration file: ${error.message}`);
      process.exit(1);
    }
    
    // Check database connection
    logInfo('Testing database connection...');
    try {
      await execAsync('node -e "import(\'./database.mjs\').then(db => db.default.authenticate().then(() => console.log(\'✅ Database connected\')).catch(e => {console.error(\'❌ Database error:\', e.message); process.exit(1);}))"');
      logSuccess('Database connection verified');
    } catch (error) {
      logError(`Database connection failed: ${error.message}`);
      logError('Please check your DATABASE_URL and database server status.');
      process.exit(1);
    }
    
    // Run the migration
    logInfo('Running migration to add deletedAt column to sessions table...');
    try {
      const { stdout, stderr } = await execAsync(`npx sequelize-cli db:migrate --migrations-path migrations --config config/config.cjs --env production --specific --to ${migrationFile.replace('.cjs', '')}`);
      
      if (stderr && !stderr.includes('Sequelize')) {
        logWarning(`Migration stderr: ${stderr}`);
      }
      
      if (stdout) {
        logInfo(`Migration output: ${stdout}`);
      }
      
      logSuccess('Migration completed successfully');
    } catch (error) {
      // Check if the error is about the migration already being run
      if (error.message.includes('already executed') || error.message.includes('already exists')) {
        logWarning('Migration already executed - this is expected if run before');
        logSuccess('Column likely already exists');
      } else {
        logError(`Migration failed: ${error.message}`);
        logError('Please check the error details above and database logs.');
        process.exit(1);
      }
    }
    
    // Test the fix by running a simple Session query
    logInfo('Testing Session model query to verify fix...');
    try {
      await execAsync('node -e "import(\'./models/Session.mjs\').then(Session => Session.default.findAll({limit: 1}).then(() => console.log(\'✅ Session query successful\')).catch(e => {console.error(\'❌ Session query failed:\', e.message); process.exit(1);}))"');
      logSuccess('Session model query test PASSED');
    } catch (error) {
      logError(`Session query test FAILED: ${error.message}`);
      logError('The migration may not have fixed the issue completely.');
      process.exit(1);
    }
    
    // Final verification
    logInfo('Verifying database schema...');
    try {
      await execAsync('node -e "import(\'./database.mjs\').then(db => db.default.query(\'SELECT column_name FROM information_schema.columns WHERE table_name = \\\'sessions\\\' AND column_name = \\\'deletedAt\\\';\').then(([results]) => { if (results.length > 0) { console.log(\'✅ deletedAt column exists in sessions table\'); } else { console.error(\'❌ deletedAt column still missing\'); process.exit(1); } }).catch(e => {console.error(\'❌ Schema verification failed:\', e.message); process.exit(1);}))"');
      logSuccess('Database schema verification PASSED');
    } catch (error) {
      logError(`Schema verification FAILED: ${error.message}`);
      process.exit(1);
    }
    
    // Success summary
    logHeader('🎉 SESSION DELETEDAT COLUMN FIX COMPLETED SUCCESSFULLY');
    logSuccess('✅ Migration executed successfully');
    logSuccess('✅ deletedAt column added to sessions table');
    logSuccess('✅ Session model queries now work');
    logSuccess('✅ Database schema verified');
    console.log();
    logInfo('The "column Session.deletedAt does not exist" error should now be resolved!');
    logInfo('Your application should work normally now.');
    console.log();
    logWarning('Next steps:');
    console.log('  1. Restart your application server');
    console.log('  2. Test the problematic API endpoints');
    console.log('  3. Verify no more deletedAt column errors appear');
    console.log();
    logSuccess('🚀 Fix deployment completed successfully!');
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    logError('Please check the error details and try again.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Run the script
main().catch(error => {
  logError(`Script execution failed: ${error.message}`);
  process.exit(1);
});
