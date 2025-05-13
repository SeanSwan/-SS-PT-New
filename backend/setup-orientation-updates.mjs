#!/usr/bin/env node
// setup-orientation-updates.mjs
// Script to run the orientation model updates

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: ${command}`);
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`⚠️ Warning: ${stderr}`);
      }
      console.log(`✅ Output: ${stdout}`);
      resolve(stdout);
    });
  });
};

async function setupOrientationUpdates() {
  try {
    console.log('🔧 Setting up orientation model updates...\n');
    
    // Run the migration
    console.log('1. Running database migration...');
    await runCommand('npm run migrate');
    
    console.log('\n✅ Orientation updates completed successfully!');
    console.log('\nThe following updates have been applied:');
    console.log('- Made userId nullable in orientation table');
    console.log('- Added status enum field');
    console.log('- Added assignedTrainer field');
    console.log('- Added scheduledDate field');
    console.log('- Added completedDate field');
    console.log('- Added source field');
    console.log('\nYou can now restart your servers to use the updated orientation system.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nTo fix this issue:');
    console.log('1. Make sure your database is running');
    console.log('2. Check your .env file has correct database credentials');
    console.log('3. Run the migration manually: npm run migrate');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupOrientationUpdates();
}

export default setupOrientationUpdates;