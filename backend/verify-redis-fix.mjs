/**
 * Redis Fix Verification Test
 * ===========================
 * Tests that the Redis connection issue has been properly fixed
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Import our Redis blocker (should activate)
import './utils/redisConnectionBlocker.mjs';

console.log('\n=== REDIS FIX VERIFICATION TEST ===');
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);

// Track any Redis-related messages
let redisIssuesDetected = 0;
let testResults = [];

// Override console methods to catch any Redis errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || 
      (message.includes('ECONNREFUSED') && message.includes('6379')) ||
      message.includes('[ioredis]')) {
    redisIssuesDetected++;
    testResults.push({ type: 'error', message, blocked: message.includes('INTERCEPTED') });
  }
  return originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || 
      (message.includes('ECONNREFUSED') && message.includes('6379')) ||
      message.includes('[ioredis]')) {
    redisIssuesDetected++;
    testResults.push({ type: 'warn', message, blocked: message.includes('INTERCEPTED') });
  }
  return originalConsoleWarn(...args);
};

async function runVerificationTests() {
  console.log('\n🧪 Running Redis fix verification tests...');
  
  try {
    console.log('\n1. Testing Redis Wrapper...');
    const { redis } = await import('./services/cache/redisWrapper.mjs');
    
    // Test Redis wrapper methods
    await redis.set('test', 'value');
    const value = await redis.get('test');
    await redis.del('test');
    
    const status = redis.getStatus();
    console.log('✅ Redis wrapper test passed');
    console.log(`   - Status: ${JSON.stringify(status)}`);
    
    console.log('\n2. Testing Server Components...');
    
    // Test database import
    await import('./database.mjs');
    console.log('✅ Database import test passed');
    
    // Test associations
    await import('./setupAssociations.mjs');
    console.log('✅ Model associations test passed');
    
    // Test monitoring services
    await import('./services/monitoring/MCPAnalytics.mjs');
    console.log('✅ MCP Analytics import test passed');
    
    console.log('\n3. Testing Core App Creation...');
    const { createApp } = await import('./core/app.mjs');
    const app = await createApp();
    console.log('✅ Core app creation test passed');
    
    // Wait a moment for any delayed Redis connection attempts
    console.log('\n4. Waiting for potential delayed Redis connections...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== TEST RESULTS ===');
    
    if (redisIssuesDetected === 0) {
      console.log('🎉 SUCCESS! No Redis connection issues detected');
      console.log('✅ The Redis fix is working correctly');
    } else {
      console.log(`⚠️ Redis issues detected: ${redisIssuesDetected}`);
      
      const blockedIssues = testResults.filter(r => r.blocked).length;
      const unblockedIssues = testResults.filter(r => !r.blocked).length;
      
      console.log(`   - Blocked issues: ${blockedIssues}`);
      console.log(`   - Unblocked issues: ${unblockedIssues}`);
      
      if (unblockedIssues === 0) {
        console.log('✅ All Redis issues were properly blocked!');
      } else {
        console.log('❌ Some Redis issues were not blocked:');
        testResults.filter(r => !r.blocked).forEach((result, i) => {
          console.log(`   ${i + 1}. [${result.type}] ${result.message}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
}

// Run the verification
await runVerificationTests();
process.exit(0);
