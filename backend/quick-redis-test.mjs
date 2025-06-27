/**
 * Quick Redis Fix Test
 * ===================
 * Simplified test to check if Redis blocker is working
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('=== QUICK REDIS FIX CHECK ===');
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);
console.log(`Expected behavior: Redis should be disabled, no connection attempts`);

// Import the Redis blocker
import './utils/redisConnectionBlocker.mjs';

console.log('\n1. Testing Redis Wrapper import...');
const { redis } = await import('./services/cache/redisWrapper.mjs');

console.log('2. Testing Redis operations...');
await redis.set('test', 'hello');
const value = await redis.get('test');
console.log(`   Retrieved value: ${value}`);

const status = redis.getStatus();
console.log('3. Redis Status:');
console.log(`   - Enabled: ${status.enabled}`);
console.log(`   - Connected: ${status.connected}`);
console.log(`   - Using memory fallback: ${status.using_memory_fallback}`);
console.log(`   - Memory cache size: ${status.memory_cache_size}`);

console.log('\n✅ Quick test completed successfully!');

if (!status.enabled && status.using_memory_fallback) {
  console.log('🎉 SUCCESS: Redis is properly disabled and using memory fallback');
} else {
  console.log('⚠️ WARNING: Redis status might not be as expected');
}

process.exit(0);
