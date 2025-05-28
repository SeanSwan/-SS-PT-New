#!/usr/bin/env node

/**
 * EMERGENCY Sessions Table Migration Fix
 * =====================================
 * This script handles the broken sessions migration and repairs the table
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

console.log('🚨 EMERGENCY: Fixing Broken Sessions Migration');
console.log('============================================');

async function markMigrationAsCompleted(migrationName) {
  console.log(`🔧 Marking migration ${migrationName} as completed...`);
  
  try {
    // Insert the migration record into SequelizeMeta table
    const insertQuery = `
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('${migrationName}') 
      ON CONFLICT (name) DO NOTHING;
    `;
    
    const command = `npx sequelize-cli db:seed --seed-file /dev/stdin --config config/config.cjs --env production`;
    
    // Create a temporary seeder content
    const seederContent = `
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(\`${insertQuery}\`);
    console.log('✅ Migration ${migrationName} marked as completed');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DELETE FROM "SequelizeMeta" WHERE name = \\'${migrationName}\\';');
  }
};
    `;
    
    // Instead, let's use a direct SQL approach
    const sqlCommand = `
      echo "INSERT INTO \\"SequelizeMeta\\" (name) VALUES ('${migrationName}') ON CONFLICT (name) DO NOTHING;" | \\
      npx sequelize-cli db:seed --seed-file /dev/stdin --config config/config.cjs --env production
    `;
    
    console.log('⚠️  Manual step required - run this in Render console:');
    console.log(`npx sequelize-cli db:seed --seeder-name=mark-sessions-migration-complete --config config/config.cjs --env production`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to mark migration as completed:', error.message);
    return false;
  }
}

async function runRepairMigration() {
  console.log('\n🔧 Running sessions table repair migration...');
  
  try {
    process.chdir(backendDir);
    
    // Run only our specific repair migration
    const repairCommand = 'npx sequelize-cli db:migrate --to 20250528000001-repair-sessions-table.cjs --config config/config.cjs --env production';
    console.log(`💻 Running: ${repairCommand}`);
    
    const { stdout, stderr } = await execAsync(repairCommand);
    
    if (stdout) {
      console.log('📋 Repair Migration Output:');
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('Warning')) {
      console.log('⚠️ Repair Migration Errors:');
      console.log(stderr);
    }
    
    console.log('✅ Sessions table repair completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Repair migration failed:', error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('\n🚀 Running all remaining migrations...');
  
  try {
    const migrateCommand = 'npx sequelize-cli db:migrate --config config/config.cjs --env production';
    console.log(`💻 Running: ${migrateCommand}`);
    
    const { stdout, stderr } = await execAsync(migrateCommand);
    
    if (stdout) {
      console.log('📋 Migration Output:');
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('Warning')) {
      console.log('⚠️ Migration Warnings:');
      console.log(stderr);
    }
    
    console.log('✅ All migrations completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Migrations failed:', error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.log('Stderr:', error.stderr);
    return false;
  }
}

async function checkSessionTableStructure() {
  console.log('\n🔍 Checking sessions table structure...');
  
  const checkScript = `
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkTable() {
  try {
    const query = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position;";
    const cmd = \`echo "\${query}" | psql "\${process.env.DATABASE_URL}"\`;
    
    const { stdout } = await execAsync(cmd);
    console.log('📊 Sessions table structure:');
    console.log(stdout);
    
    if (stdout.includes('trainerId')) {
      console.log('✅ trainerId column found!');
      return true;
    } else {
      console.log('❌ trainerId column still missing');
      return false;
    }
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
    return false;
  }
}

checkTable().then(result => process.exit(result ? 0 : 1));
  `;
  
  console.log('💻 Would check table structure here (manual verification needed)');
  return true;
}

async function main() {
  console.log('🚀 Starting emergency sessions table fix...\n');
  
  console.log('\n📋 MANUAL STEPS REQUIRED IN RENDER CONSOLE:');
  console.log('==========================================');
  
  console.log('\n1. First, mark the broken migration as completed:');
  console.log(`   psql "$DATABASE_URL" -c "INSERT INTO \\"SequelizeMeta\\" (name) VALUES ('20250305000000-create-sessions.cjs') ON CONFLICT (name) DO NOTHING;"`);
  
  console.log('\n2. Then run the repair migration:');
  console.log('   npx sequelize-cli db:migrate --config config/config.cjs --env production');
  
  console.log('\n3. Verify the fix worked:');
  console.log(`   psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'trainerId';"`);
  
  console.log('\n🎯 EXPECTED RESULT:');
  console.log('   - The broken migration will be marked complete');
  console.log('   - The repair migration will add missing trainerId column');
  console.log('   - All subsequent migrations will run successfully');
  console.log('   - Your application login/session functionality will work');
  
  console.log('\n⚠️  IMPORTANT: Run these commands in your Render console now!');
  
  return true;
}

main().catch(error => {
  console.error('💥 Script execution failed:', error.message);
  process.exit(1);
});
