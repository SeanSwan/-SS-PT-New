/**
 * Simple Redis Issue Reproduction Test
 * ===================================== 
 * Tests what happens when we start the server without Redis suppression
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment like the main server does
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (existsSync(envPath)) {
  console.log(`[Test] Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Test] Warning: .env file not found. Using environment variables from system.`);
  dotenv.config();
}

console.log('=== REDIS CONFIGURATION CHECK ===');
console.log(`REDIS_ENABLED: "${process.env.REDIS_ENABLED}"`);
console.log(`REDIS_URL: "${process.env.REDIS_URL}"`);
console.log(`NODE_ENV: "${process.env.NODE_ENV}"`);

// Capture any Redis-related console output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let redisMessages = [];

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('ECONNREFUSED') || message.includes('6379') || message.includes('redis')) {
    redisMessages.push({ type: 'error', message, timestamp: Date.now() });
    originalConsoleError('🚨 REDIS ERROR CAPTURED:', message);
  } else {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('ECONNREFUSED') || message.includes('6379') || message.includes('redis')) {
    redisMessages.push({ type: 'warn', message, timestamp: Date.now() });
    originalConsoleWarn('⚠️ REDIS WARNING CAPTURED:', message);
  } else {
    originalConsoleWarn(...args);
  }
};

async function testServerStartup() {
  console.log('\n=== TESTING SERVER STARTUP SEQUENCE ===');
  
  try {
    console.log('1. Testing Database Import...');
    await import('./database.mjs');
    console.log('✅ Database imported');
    
    console.log('2. Testing Model Associations...');
    await import('./setupAssociations.mjs');
    console.log('✅ Model associations imported');
    
    console.log('3. Testing Core App...');
    const { createApp } = await import('./core/app.mjs');
    console.log('✅ Core app imported');
    
    console.log('4. Testing Startup Process...');
    await import('./core/startup.mjs');
    console.log('✅ Startup process imported');
    
    console.log('5. Waiting for any delayed Redis connections...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Error during startup test:', error.message);
  }
  
  console.log('\n=== REDIS MESSAGE ANALYSIS ===');
  console.log(`Total Redis messages captured: ${redisMessages.length}`);
  
  if (redisMessages.length > 0) {
    console.log('\n📋 CAPTURED REDIS MESSAGES:');
    redisMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.type.toUpperCase()}] ${msg.message}`);
    });
    
    console.log('\n🎯 REDIS CONNECTION ISSUE CONFIRMED!');
    console.log('The issue occurs during server startup despite REDIS_ENABLED being false.');
  } else {
    console.log('\n✅ No Redis connection issues detected');
    console.log('The Redis wrapper is working correctly.');
  }
}

await testServerStartup();
process.exit(0);
