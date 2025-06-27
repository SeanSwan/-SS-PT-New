/**
 * Quick Server Start Test
 * ======================
 * Start the server briefly to see if Redis errors appear without suppression
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🚀 Quick Server Start Test (without Redis suppression)');
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);

// Set up error capturing
process.on('unhandledRejection', (reason, promise) => {
  console.log('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.log('🚨 Uncaught Exception:', error.message);
  console.log('Stack:', error.stack);
});

// Override console methods to capture Redis-related output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('[ioredis]') || message.includes('ECONNREFUSED') || message.includes('6379')) {
    originalError('🎯 REDIS ERROR DETECTED:', message);
  } else {
    originalError(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('ioredis') || message.includes('[ioredis]') || message.includes('ECONNREFUSED') || message.includes('6379')) {
    originalWarn('🎯 REDIS WARNING DETECTED:', message);
  } else {
    originalWarn(...args);
  }
};

try {
  console.log('\\n📦 Importing server...');
  
  // Import main server file (this should trigger the startup sequence)
  await import('./server.mjs');
  
} catch (error) {
  console.error('❌ Server import failed:', error.message);
  
  // Check if this is a Redis-related error
  if (error.message.includes('ioredis') || error.message.includes('ECONNREFUSED') || error.message.includes('6379')) {
    console.log('🎯 REDIS ERROR CONFIRMED: This error is Redis-related!');
    console.log('Error details:', error);
  }
}

// Give it a moment to process any startup errors
setTimeout(() => {
  console.log('\\n✅ Test completed - check output above for any Redis connection attempts');
  process.exit(0);
}, 3000);
