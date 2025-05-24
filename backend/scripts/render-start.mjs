#!/usr/bin/env node

/**
 * Render Production Start Script
 * ==============================
 * This script ensures the database is properly set up before starting the server.
 * It runs migrations first, then starts the server.
 */

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 SwanStudios Production Startup');
console.log('=================================');

// Environment check
console.log('🔍 Environment:', process.env.NODE_ENV || 'not set');
console.log('🗄️ Database:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED');

async function runMigrations() {
  try {
    console.log('\n📋 Step 1: Running Database Migrations');
    console.log('--------------------------------------');
    
    const migrationCommand = 'npx sequelize-cli db:migrate --config config/config.js --migrations-path migrations --models-path models --env production';
    
    const { stdout, stderr } = await execAsync(migrationCommand, { timeout: 60000 }); // 60 second timeout
    
    if (stdout) {
      console.log('✅ Migration output:', stdout);
    }
    
    if (stderr && !stderr.includes('Executing') && !stderr.includes('Loaded configuration')) {
      console.log('⚠️ Migration warnings:', stderr);
    }
    
    console.log('✅ Database migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Don't fail the entire startup for migration errors - the server might still work
    console.log('⚠️ Continuing with server startup despite migration issues...');
    console.log('💡 Database schema issues may cause seeding to fail, but core server should work');
  }
}

async function startServer() {
  console.log('\n🚀 Step 2: Starting Application Server');
  console.log('-------------------------------------');
  
  // Start the main server
  const serverProcess = spawn('node', ['server.mjs'], {
    stdio: 'inherit',
    env: process.env
  });
  
  serverProcess.on('error', (err) => {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`📊 Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle shutdown signals
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });
}

async function main() {
  try {
    // Only run migrations if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      await runMigrations();
    } else {
      console.log('⚠️ Skipping migrations - DATABASE_URL not configured');
    }
    
    // Start the server
    await startServer();
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main();
