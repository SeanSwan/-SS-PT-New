#!/usr/bin/env node

/**
 * SIMPLIFIED Render Production Start Script
 * ========================================
 * Minimal startup script to ensure backend starts reliably on Render
 */

import { spawn } from 'child_process';

console.log('🚀 SwanStudios Backend Starting on Render');
console.log('==========================================');
console.log('🔍 Environment:', process.env.NODE_ENV || 'not set');
console.log('🌐 Port:', process.env.PORT || '10000');
console.log('🗄️ Database:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED');

// Simplified server startup - no complex migration logic
async function startServer() {
  console.log('\n🚀 Starting Application Server');
  console.log('------------------------------');
  
  // Start the main server directly
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

// Start immediately
startServer().catch(error => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
