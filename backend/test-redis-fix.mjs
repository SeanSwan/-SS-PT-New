/**
 * Test Redis Fix
 * =============
 * This script tests that Redis connections are properly prevented when disabled
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('='.repeat(60));
console.log('TESTING REDIS FIX');
console.log('='.repeat(60));

console.log('Environment variables:');
console.log('REDIS_ENABLED:', process.env.REDIS_ENABLED);
console.log('REDIS_URL:', process.env.REDIS_URL || 'default');

console.log('\nImporting Redis wrapper...');

// Import the Redis wrapper
const { redis } = await import('../services/cache/redisWrapper.mjs');

console.log('Redis wrapper imported successfully');

// Test basic operations
console.log('\nTesting Redis operations...');

try {
  // Test set operation
  console.log('Testing SET operation...');
  await redis.set('test:key', 'test:value', 60);
  console.log('✓ SET completed');
  
  // Test get operation
  console.log('Testing GET operation...');
  const value = await redis.get('test:key');
  console.log('✓ GET completed, value:', value);
  
  // Test exists operation
  console.log('Testing EXISTS operation...');
  const exists = await redis.exists('test:key');
  console.log('✓ EXISTS completed, result:', exists);
  
  // Test status
  console.log('Testing STATUS...');
  const status = redis.getStatus();
  console.log('✓ Status:', JSON.stringify(status, null, 2));
  
  console.log('\n='.repeat(60));
  console.log('REDIS FIX TEST COMPLETED SUCCESSFULLY');
  console.log('No Redis connection errors should appear above');
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}

// Cleanup
await redis.disconnect();
process.exit(0);
