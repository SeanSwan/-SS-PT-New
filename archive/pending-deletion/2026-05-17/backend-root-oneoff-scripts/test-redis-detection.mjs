/**
 * Test Script: Detect Redis Connection Issues
 * ===========================================
 * This script will help us identify where the Redis connection errors are coming from
 * by running a minimal version of our server startup process.
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Testing for Redis connection issues...');
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// Test 1: Import our redisWrapper to see if it causes any issues
console.log('\n📦 Test 1: Importing redisWrapper...');
try {
  const { redis } = await import('./services/cache/redisWrapper.mjs');
  console.log('✅ redisWrapper imported successfully');
  
  // Test basic operations
  console.log('🧪 Testing basic Redis operations...');
  await redis.set('test-key', 'test-value');
  const result = await redis.get('test-key');
  console.log(`✅ Redis test successful: ${result}`);
  
  const status = redis.getStatus();
  console.log('📊 Redis status:', status);
} catch (error) {
  console.error('❌ Error with redisWrapper:', error.message);
}

// Test 2: Import database to see if it causes issues
console.log('\n📦 Test 2: Importing database...');
try {
  const sequelize = await import('./database.mjs');
  console.log('✅ Database imported successfully');
} catch (error) {
  console.error('❌ Error with database:', error.message);
}

// Test 3: Import MCPAnalytics to see if it causes issues
console.log('\n📦 Test 3: Importing MCPAnalytics...');
try {
  const { mcpAnalytics } = await import('./services/monitoring/MCPAnalytics.mjs');
  console.log('✅ MCPAnalytics imported successfully');
} catch (error) {
  console.error('❌ Error with MCPAnalytics:', error.message);
}

// Test 4: Full server startup test
console.log('\n📦 Test 4: Testing full server startup...');
try {
  const { createApp } = await import('./core/app.mjs');
  const app = await createApp();
  console.log('✅ App created successfully');
  
  // Don't actually start the server, just test creation
  process.exit(0);
} catch (error) {
  console.error('❌ Error creating app:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
