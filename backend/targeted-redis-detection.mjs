/**
 * Targeted Redis Connection Detection Test
 * =======================================
 * Tests each component individually to pinpoint the exact source of Redis connections
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 TARGETED Redis Connection Detection');
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);

// Capture any ioredis-related console output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

let redisErrors = [];
let redisWarnings = [];
let redisLogs = [];

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('ECONNREFUSED') || message.includes('6379')) {
    redisErrors.push(message);
    originalConsoleError('🚨 REDIS ERROR CAPTURED:', message);
  } else {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('ECONNREFUSED') || message.includes('6379')) {
    redisWarnings.push(message);
    originalConsoleWarn('⚠️ REDIS WARNING CAPTURED:', message);
  } else {
    originalConsoleWarn(...args);
  }
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('ECONNREFUSED') || message.includes('6379')) {
    redisLogs.push(message);
    originalConsoleLog('📝 REDIS LOG CAPTURED:', message);
  } else {
    originalConsoleLog(...args);
  }
};

async function testComponent(name, importFn) {
  console.log(`\\n🧪 Testing: ${name}`);
  const initialRedisErrors = redisErrors.length;
  const initialRedisWarnings = redisWarnings.length;
  
  try {
    await importFn();
    console.log(`✅ ${name} imported successfully`);
    
    const newErrors = redisErrors.length - initialRedisErrors;
    const newWarnings = redisWarnings.length - initialRedisWarnings;
    
    if (newErrors > 0 || newWarnings > 0) {
      console.log(`🎯 FOUND REDIS CONNECTION SOURCE: ${name}`);
      console.log(`   - New errors: ${newErrors}`);
      console.log(`   - New warnings: ${newWarnings}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return false;
  }
}

// Test each component step by step
async function runDetectionTests() {
  console.log('\\n=== COMPONENT-BY-COMPONENT REDIS DETECTION ===');
  
  let foundSource = false;
  
  // Test 1: Database module (first in startup sequence)
  foundSource = await testComponent('Database Module', async () => {
    await import('./database.mjs');
  }) || foundSource;
  
  // Test 2: Model associations (happens after database)
  foundSource = await testComponent('Model Associations', async () => {
    const setupAssociations = await import('./setupAssociations.mjs');
    // Don't actually run it, just import
  }) || foundSource;
  
  // Test 3: Redis Wrapper directly
  foundSource = await testComponent('Redis Wrapper', async () => {
    const { redis } = await import('./services/cache/redisWrapper.mjs');
    // Just import, don't use
  }) || foundSource;
  
  // Test 4: MCP Health Manager
  foundSource = await testComponent('MCP Health Manager', async () => {
    await import('./utils/monitoring/mcpHealthManager.mjs');
  }) || foundSource;
  
  // Test 5: MCP Analytics
  foundSource = await testComponent('MCP Analytics', async () => {
    await import('./services/monitoring/MCPAnalytics.mjs');
  }) || foundSource;
  
  // Test 6: Core App creation
  foundSource = await testComponent('Core App', async () => {
    const { createApp } = await import('./core/app.mjs');
    // Just import, don't create
  }) || foundSource;
  
  // Test 7: Startup process
  foundSource = await testComponent('Startup Process', async () => {
    await import('./core/startup.mjs');
  }) || foundSource;
  
  console.log('\\n=== DETECTION RESULTS ===');
  console.log(`Total Redis errors captured: ${redisErrors.length}`);
  console.log(`Total Redis warnings captured: ${redisWarnings.length}`);
  console.log(`Total Redis logs captured: ${redisLogs.length}`);
  
  if (foundSource) {
    console.log('\\n🎯 REDIS CONNECTION SOURCE IDENTIFIED!');
  } else {
    console.log('\\n🤔 No Redis connection sources found in component tests');
    console.log('   This suggests the issue might be in a dependency or startup timing');
  }
  
  // Show all captured Redis messages
  if (redisErrors.length > 0) {
    console.log('\\n🚨 CAPTURED REDIS ERRORS:');
    redisErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
  }
  
  if (redisWarnings.length > 0) {
    console.log('\\n⚠️ CAPTURED REDIS WARNINGS:');
    redisWarnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
  }
  
  if (redisLogs.length > 0) {
    console.log('\\n📝 CAPTURED REDIS LOGS:');
    redisLogs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`));
  }
}

// Run the detection tests
await runDetectionTests();

process.exit(0);
