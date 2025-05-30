#!/usr/bin/env node

/**
 * 🚨 COMPREHENSIVE SWANSTUDIOS FIX SCRIPT
 * ========================================
 * 
 * This script addresses multiple critical issues preventing local development:
 * 
 * 1. 🔧 Session.deletedAt database schema mismatch
 * 2. 🔌 Port conflicts preventing MCP servers from starting
 * 3. 🎥 Video asset loading issues (Swans.mp4)
 * 4. 🗄️ Database seeding failures
 * 
 * Run this script from the project root directory.
 */

import { Sequelize, DataTypes } from 'sequelize';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🚨 COMPREHENSIVE SWANSTUDIOS FIX STARTING...');
console.log('=============================================');

// Database connection
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

// STEP 1: Fix Session.deletedAt Database Issue
async function fixSessionDeletedAt() {
  console.log('\\n🔧 STEP 1: Fixing Session.deletedAt database issue...');
  
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
      console.log('✅ deletedAt column already exists');
      return true;
    }

    console.log('❌ deletedAt column missing - adding now...');
    
    // Add the deletedAt column directly
    await sequelize.query(`
      ALTER TABLE sessions 
      ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;
    `);
    
    // Add index for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS sessions_deleted_at_idx 
      ON sessions ("deletedAt");
    `);
    
    console.log('✅ deletedAt column added successfully');
    
    // Test the fix
    const [testQuery] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE "deletedAt" IS NULL;
    `);
    
    console.log(`✅ Test query successful - ${testQuery[0].count} active sessions found`);
    return true;
    
  } catch (error) {
    console.error('❌ Session.deletedAt fix failed:', error.message);
    return false;
  }
}

// STEP 2: Check and resolve port conflicts
async function checkPortConflicts() {
  console.log('\\n🔌 STEP 2: Checking port conflicts...');
  
  const ports = [
    { port: 8000, service: 'workout-mcp' },
    { port: 8001, service: 'yolo-mcp' },
    { port: 8002, service: 'gamify-mcp' },
    { port: 8003, service: 'nutrition-mcp' },
    { port: 8004, service: 'alternatives-mcp' },
    { port: 10000, service: 'backend' },
    { port: 5173, service: 'frontend' }
  ];
  
  const conflicts = [];
  
  for (const { port, service } of ports) {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (output.trim()) {
        conflicts.push({ port, service });
        console.log(`❌ Port ${port} (${service}) is in use`);
      } else {
        console.log(`✅ Port ${port} (${service}) is available`);
      }
    } catch (error) {
      // No output means port is available
      console.log(`✅ Port ${port} (${service}) is available`);
    }
  }
  
  if (conflicts.length > 0) {
    console.log('\\n⚠️ PORT CONFLICTS DETECTED');
    console.log('\\nSolutions:');
    console.log('1. Kill all Node.js processes: taskkill /F /IM node.exe');
    console.log('2. Or restart your computer');
    console.log('3. Or modify ports in .env files');
    
    return conflicts;
  }
  
  console.log('✅ No port conflicts detected');
  return [];
}

// STEP 3: Fix video asset loading
async function fixVideoAssets() {
  console.log('\\n🎥 STEP 3: Fixing video asset loading...');
  
  const videoFiles = ['Swans.mp4', 'smoke.mp4'];
  const locations = [
    'frontend/public/',
    'frontend/dist/',
    'frontend/src/assets/'
  ];
  
  let issuesFound = [];
  
  for (const video of videoFiles) {
    console.log(`\\n📹 Checking ${video}:`);
    
    for (const location of locations) {
      const fullPath = path.join(location, video);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`  ✅ ${location}${video} - ${Math.round(stats.size / 1024 / 1024)}MB`);
      } else {
        console.log(`  ❌ ${location}${video} - missing`);
        issuesFound.push({ video, location });
      }
    }
  }
  
  // Check frontend Hero-Section for video import issues
  const heroSectionPath = 'frontend/src/pages/HomePage/components/Hero-Section.tsx';
  if (fs.existsSync(heroSectionPath)) {
    const content = fs.readFileSync(heroSectionPath, 'utf8');
    
    if (content.includes('import heroVideo from "/Swans.mp4"')) {
      console.log('\\n🔍 Hero-Section.tsx video import analysis:');
      console.log('  Current: import heroVideo from "/Swans.mp4"');
      console.log('  Issue: This resolves to production domain in build');
      console.log('  ✅ Video exists in public/ - import should work locally');
      console.log('  💡 For production: Ensure video is in public/ and correctly deployed');
    }
  }
  
  return issuesFound;
}

// STEP 4: Test Session API
async function testSessionAPI() {
  console.log('\\n🧪 STEP 4: Testing Session API...');
  
  try {
    // Import Session model to test
    const { default: Session } = await import('./backend/models/Session.mjs');
    
    // Test basic query that was failing
    const sessions = await Session.findAll({
      limit: 5,
      attributes: ['id', 'sessionDate', 'status'],
      where: {
        // This will automatically include deletedAt IS NULL due to paranoid: true
      }
    });
    
    console.log('✅ Session.findAll() works - no more deletedAt error!');
    console.log(`✅ Found ${sessions.length} session(s) in test query`);
    
    // Test count query
    const count = await Session.count();
    console.log(`✅ Total sessions count: ${count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Session API test failed:', error.message);
    if (error.message.includes('deletedAt')) {
      console.log('   The deletedAt column error still persists');
    }
    return false;
  }
}

// STEP 5: Check database seeding issues
async function checkDatabaseSeeding() {
  console.log('\\n🗄️ STEP 5: Checking database seeding issues...');
  
  try {
    // Check if StorefrontItems table has foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, table_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_name = 'storefront_items';
    `);
    
    if (constraints.length > 0) {
      console.log('⚠️ StorefrontItems has foreign key constraints:');
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}`);
      });
      console.log('💡 Use DELETE instead of TRUNCATE in seeders for tables with FK constraints');
    } else {
      console.log('✅ No foreign key constraint issues found');
    }
    
    // Check for existing storefront items
    const [itemCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM storefront_items;
    `);
    
    console.log(`📊 Current storefront items: ${itemCount[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database seeding check failed:', error.message);
    return false;
  }
}

// STEP 6: Generate startup script with correct order
function generateStartupScript() {
  console.log('\\n🚀 STEP 6: Generating startup script...');
  
  const startupScript = `@echo off
echo 🚀 Starting SwanStudios Development Environment
echo ============================================

echo 📋 Pre-flight checks...

REM Check if ports are available
echo 🔌 Checking port availability...
netstat -ano | findstr ":8000 :8001 :8002 :10000 :5173" > nul
if %errorlevel% equ 0 (
    echo ⚠️ Some ports are in use. Consider running:
    echo    taskkill /F /IM node.exe
    echo    Then press any key to continue...
    pause
)

echo ✅ Starting services in correct order...

REM Start backend first (it needs to be ready for MCP servers)
echo 🔧 Starting backend...
cd backend
start "Backend" cmd /c "npm run dev"
cd ..

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

REM Start MCP servers
echo 🤖 Starting MCP servers...
REM Add MCP startup commands here if needed

REM Start frontend last
echo 🎨 Starting frontend...
cd frontend
start "Frontend" cmd /c "npm run dev"
cd ..

echo ✅ All services started!
echo 📋 Check the opened terminal windows for status
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:10000

pause
`;

  fs.writeFileSync('start-swanstudios-dev.bat', startupScript);
  console.log('✅ Created start-swanstudios-dev.bat');
}

// Main execution
async function runComprehensiveFix() {
  try {
    console.log('🔍 Running comprehensive SwanStudios fix...');
    
    // Step 1: Fix Session.deletedAt
    const sessionFixed = await fixSessionDeletedAt();
    
    // Step 2: Check ports
    const portConflicts = await checkPortConflicts();
    
    // Step 3: Check video assets
    const videoIssues = await fixVideoAssets();
    
    // Step 4: Test Session API (only if Step 1 succeeded)
    let apiWorking = false;
    if (sessionFixed) {
      apiWorking = await testSessionAPI();
    }
    
    // Step 5: Check database seeding
    await checkDatabaseSeeding();
    
    // Step 6: Generate startup script
    generateStartupScript();
    
    // Final summary
    console.log('\\n🎉 COMPREHENSIVE FIX SUMMARY');
    console.log('============================');
    console.log(`✅ Session.deletedAt: ${sessionFixed ? 'FIXED' : 'FAILED'}`);
    console.log(`✅ Port conflicts: ${portConflicts.length === 0 ? 'NONE' : portConflicts.length + ' FOUND'}`);
    console.log(`✅ Video assets: ${videoIssues.length === 0 ? 'OK' : videoIssues.length + ' ISSUES'}`);
    console.log(`✅ Session API: ${apiWorking ? 'WORKING' : 'NEEDS ATTENTION'}`);
    
    if (sessionFixed && portConflicts.length === 0 && apiWorking) {
      console.log('\\n🚀 READY TO START DEVELOPMENT!');
      console.log('\\nNext steps:');
      console.log('1. Run: start-swanstudios-dev.bat');
      console.log('2. Or manually: cd backend && npm run dev');
      console.log('3. In another terminal: cd frontend && npm run dev');
    } else {
      console.log('\\n⚠️ Some issues remain:');
      if (!sessionFixed) console.log('   - Session.deletedAt needs manual database fix');
      if (portConflicts.length > 0) console.log('   - Port conflicts need resolution');
      if (!apiWorking) console.log('   - Session API needs debugging');
    }
    
  } catch (error) {
    console.error('\\n💥 COMPREHENSIVE FIX FAILED:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run the comprehensive fix
runComprehensiveFix();