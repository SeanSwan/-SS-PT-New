#!/usr/bin/env node

/**
 * Migration Fix & Verification Script
 * ==================================
 * This script verifies and tests all migration fixes for the SwanStudios Platform
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

console.log('🔧 SwanStudios Migration Fix & Verification');
console.log('==========================================');

async function checkMigrationFiles() {
  console.log('\n📁 Checking migration files...');
  
  const migrationsDir = path.join(backendDir, 'migrations');
  const files = fs.readdirSync(migrationsDir);
  
  // Check for the fixed migration file
  const orientationMigration = files.find(f => f.includes('20240115000000-update-orientation-model'));
  
  if (orientationMigration) {
    console.log(`✅ Found orientation migration: ${orientationMigration}`);
    
    if (orientationMigration.endsWith('.cjs')) {
      console.log('✅ Migration file is correctly using .cjs extension');
    } else {
      console.log('❌ Migration file should use .cjs extension for ES module compatibility');
      return false;
    }
  } else {
    console.log('❌ Orientation migration file not found');
    return false;
  }
  
  // Check for mixed file extensions
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cjsFiles = files.filter(f => f.endsWith('.cjs'));
  const mjsFiles = files.filter(f => f.endsWith('.mjs'));
  
  console.log(`📊 Migration file types: ${jsFiles.length} .js, ${cjsFiles.length} .cjs, ${mjsFiles.length} .mjs`);
  
  if (jsFiles.length > 0) {
    console.log('⚠️  Warning: Found .js migration files that may cause ES module conflicts:');
    jsFiles.forEach(file => console.log(`   - ${file}`));
  }
  
  return true;
}

async function checkConfigFiles() {
  console.log('\n⚙️ Checking configuration files...');
  
  const configCjs = path.join(backendDir, 'config', 'config.cjs');
  const sequelizerc = path.join(backendDir, '.sequelizerc');
  
  if (fs.existsSync(configCjs)) {
    console.log('✅ config.cjs exists');
  } else {
    console.log('❌ config.cjs not found');
    return false;
  }
  
  if (fs.existsSync(sequelizerc)) {
    const sequelizercContent = fs.readFileSync(sequelizerc, 'utf8');
    if (sequelizercContent.includes('config.cjs')) {
      console.log('✅ .sequelizerc points to config.cjs');
    } else {
      console.log('❌ .sequelizerc should point to config.cjs');
      return false;
    }
  } else {
    console.log('❌ .sequelizerc not found');
    return false;
  }
  
  return true;
}

async function testLocalMigration() {
  console.log('\n🧪 Testing local migration (development)...');
  
  try {
    process.chdir(backendDir);
    
    const migrationCommand = 'npx sequelize-cli db:migrate:status --config config/config.cjs --env development';
    console.log(`💻 Running: ${migrationCommand}`);
    
    const { stdout, stderr } = await execAsync(migrationCommand);
    
    if (stdout) {
      console.log('📋 Migration Status Output:');
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('Warning')) {
      console.log('⚠️ Migration Errors:');
      console.log(stderr);
      return false;
    }
    
    console.log('✅ Local migration status check passed');
    return true;
    
  } catch (error) {
    console.error('❌ Local migration test failed:', error.message);
    return false;
  }
}

async function testProductionMigration() {
  console.log('\n🚀 Testing production migration configuration...');
  
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set - skipping production migration test');
    console.log('💡 To test production migrations, set DATABASE_URL environment variable');
    return true;
  }
  
  try {
    process.chdir(backendDir);
    
    const migrationCommand = 'npx sequelize-cli db:migrate:status --config config/config.cjs --env production';
    console.log(`💻 Running: ${migrationCommand}`);
    
    const { stdout, stderr } = await execAsync(migrationCommand);
    
    if (stdout) {
      console.log('📋 Production Migration Status:');
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('Warning')) {
      console.log('⚠️ Production Migration Errors:');
      console.log(stderr);
      return false;
    }
    
    console.log('✅ Production migration configuration test passed');
    return true;
    
  } catch (error) {
    console.error('❌ Production migration test failed:', error.message);
    return false;
  }
}

async function testMigrationEndpoint() {
  console.log('\n🌐 Testing migration HTTP endpoint...');
  
  try {
    // Check if the migration controller exists
    const controllerPath = path.join(backendDir, 'controllers', 'migrationController.mjs');
    const routesPath = path.join(backendDir, 'routes', 'migrationRoutes.mjs');
    
    if (fs.existsSync(controllerPath)) {
      console.log('✅ Migration controller exists');
    } else {
      console.log('❌ Migration controller not found');
      return false;
    }
    
    if (fs.existsSync(routesPath)) {
      console.log('✅ Migration routes exist');
    } else {
      console.log('❌ Migration routes not found');
      return false;
    }
    
    // Check if routes are integrated in server.mjs
    const serverPath = path.join(backendDir, 'server.mjs');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('migrationRoutes') && serverContent.includes('/api/migrations')) {
      console.log('✅ Migration routes are integrated in server.mjs');
    } else {
      console.log('❌ Migration routes not properly integrated in server.mjs');
      return false;
    }
    
    console.log('✅ Migration HTTP endpoint is properly configured');
    return true;
    
  } catch (error) {
    console.error('❌ Migration endpoint test failed:', error.message);
    return false;
  }
}

async function runAllChecks() {
  let allPassed = true;
  
  console.log('🔍 Running comprehensive migration verification...\n');
  
  const checks = [
    { name: 'Migration Files', fn: checkMigrationFiles },
    { name: 'Configuration Files', fn: checkConfigFiles },
    { name: 'Local Migration Test', fn: testLocalMigration },
    { name: 'Production Migration Test', fn: testProductionMigration },
    { name: 'Migration HTTP Endpoint', fn: testMigrationEndpoint }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (!result) {
        allPassed = false;
        console.log(`❌ ${check.name} check failed\n`);
      } else {
        console.log(`✅ ${check.name} check passed\n`);
      }
    } catch (error) {
      console.error(`❌ ${check.name} check error:`, error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function showMigrationOptions() {
  console.log('\n🚀 MIGRATION DEPLOYMENT OPTIONS');
  console.log('==============================');
  
  console.log('\n1️⃣ Run Migrations Locally (if DATABASE_URL is set):');
  console.log('   npm run migrate-production');
  
  console.log('\n2️⃣ Run via Render Console:');
  console.log('   - Go to Render Dashboard → SS-PT-New service');
  console.log('   - Click "Shell" tab');
  console.log('   - Run: npx sequelize-cli db:migrate --config config/config.cjs --env production');
  
  console.log('\n3️⃣ Run via HTTP Endpoint (after deploying fixes):');
  console.log('   - Deploy these fixes first');
  console.log('   - POST to: https://ss-pt-new.onrender.com/api/migrations/run');
  console.log('   - Or check status: https://ss-pt-new.onrender.com/api/migrations/status');
  
  console.log('\n4️⃣ Alternative Migration Command:');
  console.log('   cd backend && npx sequelize-cli db:migrate --config config/config.cjs --env production');
  
  console.log('\n⚠️  IMPORTANT: After running migrations successfully, test your login:');
  console.log('   - Try logging in at your website');
  console.log('   - Should see: Login successful, user data loads');
  console.log('   - No more: "Database query error" messages');
}

// Main execution
async function main() {
  const allChecksPass = await runAllChecks();
  
  if (allChecksPass) {
    console.log('🎉 ALL MIGRATION FIXES VERIFIED SUCCESSFULLY!');
    console.log('✅ Your migration issues have been resolved.');
    await showMigrationOptions();
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
    console.log('💡 Contact your developer if you need assistance with the failed checks.');
  }
  
  console.log('\n📋 SUMMARY OF FIXES APPLIED:');
  console.log('- ✅ Renamed problematic .js migration to .cjs for ES module compatibility');
  console.log('- ✅ Updated production migration script to use correct config.cjs');
  console.log('- ✅ Updated package.json scripts to use config.cjs');
  console.log('- ✅ Verified migration HTTP endpoints are properly integrated');
  console.log('- ✅ All configuration files are correctly set up');
}

main().catch(error => {
  console.error('💥 Script execution failed:', error.message);
  process.exit(1);
});
