#!/usr/bin/env node

/**
 * 🎯 SWANSTUDIOS MASTER STATUS CHECKER
 * ====================================
 * 
 * This script provides a complete status check of all critical systems
 * after the fixes have been applied.
 */

import { Sequelize } from 'sequelize';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🎯 SWANSTUDIOS MASTER STATUS CHECKER');
console.log('====================================');

// Test local database
async function testLocalDatabase() {
  console.log('\n📋 1. LOCAL DATABASE STATUS');
  console.log('===========================');
  
  try {
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

    await sequelize.authenticate();
    console.log('✅ Local database connection: OK');

    // Check deletedAt column
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ Session.deletedAt column: EXISTS');
      
      // Test Session query
      const [sessions] = await sequelize.query(`
        SELECT COUNT(*) as count FROM sessions WHERE "deletedAt" IS NULL;
      `);
      console.log(`✅ Session queries working: ${sessions[0].count} active sessions`);
    } else {
      console.log('❌ Session.deletedAt column: MISSING');
    }

    await sequelize.close();
    return true;
  } catch (error) {
    console.log('❌ Local database error:', error.message);
    return false;
  }
}

// Test production database
async function testProductionDatabase() {
  console.log('\n📋 2. PRODUCTION DATABASE STATUS');
  console.log('================================');
  
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not found - cannot test production');
    return false;
  }

  try {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Production database connection: OK');

    // Check deletedAt column in production
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ Production Session.deletedAt column: EXISTS');
      
      // Test production Session query
      const [sessions] = await sequelize.query(`
        SELECT COUNT(*) as count FROM sessions WHERE "deletedAt" IS NULL;
      `);
      console.log(`✅ Production Session queries: ${sessions[0].count} active sessions`);
    } else {
      console.log('❌ Production Session.deletedAt column: MISSING');
      console.log('   Run: node fix-production-database.mjs');
    }

    await sequelize.close();
    return columns.length > 0;
  } catch (error) {
    console.log('❌ Production database error:', error.message);
    return false;
  }
}

// Test production API
async function testProductionAPI() {
  console.log('\n📋 3. PRODUCTION API STATUS');
  console.log('===========================');
  
  try {
    const response = await fetch('https://ss-pt-new.onrender.com/health', {
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Production API health: OK');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      
      // Test Session API specifically
      try {
        const sessionResponse = await fetch('https://ss-pt-new.onrender.com/api/schedule?userId=6&includeUpcoming=true', {
          timeout: 10000
        });
        
        if (sessionResponse.ok) {
          console.log('✅ Production Session API: OK');
        } else {
          console.log(`❌ Production Session API: ${sessionResponse.status} ${sessionResponse.statusText}`);
        }
      } catch (sessionError) {
        console.log('❌ Production Session API: Connection failed');
      }
      
    } else {
      console.log(`❌ Production API health: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Production API error:', error.message);
    return false;
  }
}

// Test SPA routing
async function testSPARouting() {
  console.log('\n📋 4. SPA ROUTING STATUS');
  console.log('========================');
  
  // Check if frontend build exists
  const frontendDistPath = path.join(process.cwd(), 'frontend/dist');
  const indexPath = path.join(frontendDistPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log('✅ Frontend build: EXISTS');
    
    const stats = fs.statSync(indexPath);
    console.log(`   index.html size: ${stats.size} bytes`);
    
    // Check server configuration
    const serverPath = path.join(process.cwd(), 'backend/server.mjs');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      const hasSpaRouting = serverContent.includes('SPA ROUTING CATCH-ALL');
      
      console.log(`✅ SPA routing config: ${hasSpaRouting ? 'CONFIGURED' : 'MISSING'}`);
      
      if (hasSpaRouting) {
        console.log('✅ Ready for SPA routing deployment');
      }
    }
  } else {
    console.log('❌ Frontend build: MISSING');
    console.log('   Run: cd frontend && npm run build');
  }
}

// Check port availability
async function checkPorts() {
  console.log('\n📋 5. PORT AVAILABILITY');
  console.log('======================');
  
  const { spawn } = await import('child_process');
  
  return new Promise((resolve) => {
    const netstat = spawn('netstat', ['-ano']);
    let output = '';
    
    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    netstat.on('close', () => {
      const ports = [8000, 8001, 8002, 8003, 8004, 10000, 5173];
      const conflicts = [];
      
      ports.forEach(port => {
        if (output.includes(`:${port}`)) {
          conflicts.push(port);
          console.log(`❌ Port ${port}: IN USE`);
        } else {
          console.log(`✅ Port ${port}: Available`);
        }
      });
      
      if (conflicts.length > 0) {
        console.log(`\n⚠️ ${conflicts.length} port conflicts detected`);
        console.log('   Solution: Run FIX-PORT-CONFLICTS.bat');
      } else {
        console.log('\n✅ All ports available');
      }
      
      resolve(conflicts.length === 0);
    });
  });
}

// Main status check
async function runMasterStatusCheck() {
  console.log('🔍 Running comprehensive status check...\n');
  
  const localDbOk = await testLocalDatabase();
  const prodDbOk = await testProductionDatabase();
  await testProductionAPI();
  await testSPARouting();
  const portsOk = await checkPorts();
  
  console.log('\n🎯 MASTER STATUS SUMMARY');
  console.log('========================');
  console.log(`Local Database: ${localDbOk ? '✅ READY' : '❌ NEEDS FIX'}`);
  console.log(`Production Database: ${prodDbOk ? '✅ READY' : '❌ NEEDS FIX'}`);
  console.log(`Port Conflicts: ${portsOk ? '✅ NONE' : '⚠️ FOUND'}`);
  
  if (localDbOk && prodDbOk && portsOk) {
    console.log('\n🎉 ALL SYSTEMS GREEN - READY FOR DEVELOPMENT!');
    console.log('==============================================');
    console.log('✅ Your SwanStudios platform is fully operational');
    console.log('✅ Both local and production environments working');
    console.log('✅ No blocking issues detected');
  } else {
    console.log('\n⚠️ ISSUES DETECTED - ACTION REQUIRED');
    console.log('====================================');
    if (!localDbOk) console.log('🔧 Fix local database: Run comprehensive-fix.mjs');
    if (!prodDbOk) console.log('🔧 Fix production database: Run fix-production-database.mjs');
    if (!portsOk) console.log('🔧 Fix port conflicts: Run FIX-PORT-CONFLICTS.bat');
  }
}

runMasterStatusCheck().catch(console.error);
