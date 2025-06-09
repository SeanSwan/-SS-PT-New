#!/usr/bin/env node

/**
 * EMERGENCY Render Start Script - Diagnostic Mode
 * ==============================================
 * Temporarily use minimal server to diagnose routing issues
 */

import { spawn } from 'child_process';

console.log('🚨 EMERGENCY DIAGNOSTIC MODE - SwanStudios Backend');
console.log('================================================');
console.log('🔍 Environment:', process.env.NODE_ENV || 'not set');
console.log('🌐 Port:', process.env.PORT || '10000');
console.log('🗄️ Database:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED');
console.log('');
console.log('⚠️  Using emergency diagnostic server to isolate routing issues');
console.log('⚠️  This bypasses database connections and complex initialization');

// Start emergency diagnostic server
async function startEmergencyServer() {
  console.log('\n🚨 Starting Emergency Diagnostic Server');
  console.log('---------------------------------------');
  
  // Use the emergency health check server
  const serverProcess = spawn('node', ['scripts/emergency-health-check.mjs'], {
    stdio: 'inherit',
    env: process.env
  });
  
  serverProcess.on('error', (err) => {
    console.error('❌ Emergency server startup error:', err);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`📊 Emergency server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle shutdown signals
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down emergency server...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down emergency server...');
    serverProcess.kill('SIGINT');
  });
}

// Start emergency server immediately
startEmergencyServer().catch(error => {
  console.error('❌ Emergency startup failed:', error);
  process.exit(1);
});
