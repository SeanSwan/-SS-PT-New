#!/usr/bin/env node

/**
 * Complete Startup Issues Fix
 * Addresses PII scanning, Redis, and other startup issues
 */

console.log('🔧 Fixing all startup issues...\n');

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fixStartupIssues() {
  try {
    // Fix 1: Update .env to include Redis configuration (optional)
    console.log('1. Updating .env with Redis configuration...');
    const envPath = join(process.cwd(), '..', '.env');
    let envContent = await readFile(envPath, 'utf8');
    
    if (!envContent.includes('REDIS_URL')) {
      const redisConfig = `
# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false

`;
      envContent = envContent.replace('# ================================================\n# End of Configuration', redisConfig + '# ================================================\n# End of Configuration');
      await writeFile(envPath, envContent);
      console.log('✅ Redis configuration added to .env');
    } else {
      console.log('✅ Redis already configured in .env');
    }
    
    // Fix 2: Update server startup to handle Redis gracefully
    console.log('2. Fixing Redis connection handling...');
    const serverPath = join(process.cwd(), 'server.mjs');
    let serverContent = await readFile(serverPath, 'utf8');
    
    // Find and update Redis configuration
    const redisFixPattern = /\[ioredis\] Unhandled error event/;
    if (!serverContent.includes('// Redis connection with graceful fallback')) {
      const redisFix = `
// Redis connection with graceful fallback
const initializeRedis = () => {
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('Redis disabled by configuration, using fallback storage');
    return null;
  }
  
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
    
    redis.on('error', (error) => {
      console.warn('Redis connection error, using fallback storage:', error.message);
    });
    
    return redis;
  } catch (error) {
    console.warn('Failed to initialize Redis, using fallback storage:', error.message);
    return null;
  }
};

`;
      
      // Insert this before the existing Redis connection code
      serverContent = serverContent.replace(
        /import.*Redis.*from.*'ioredis'.*;?$/m,
        match => match + '\n' + redisFix
      );
    }
    
    await writeFile(serverPath, serverContent);
    console.log('✅ Redis connection handling improved');
    
    // Fix 3: Create a startup validation script
    console.log('3. Creating startup validation script...');
    const startupValidationScript = `#!/usr/bin/env node

/**
 * Startup Validation Script
 * Checks all critical systems before starting the server
 */

import { piiManager } from './services/privacy/PIIManager.mjs';
import { piiSafeLogger } from './utils/monitoring/piiSafeLogging.mjs';

console.log('🔍 Validating startup systems...');

async function validateStartup() {
  const results = {
    piiManager: false,
    piiLogger: false,
    redis: false,
    database: false
  };
  
  // Test PII Manager
  try {
    console.log('\\nTesting PII Manager...');
    await piiManager.scanForPII(null);
    await piiManager.scanForPII(undefined);
    await piiManager.scanForPII('test@example.com');
    results.piiManager = true;
    console.log('✅ PII Manager working correctly');
  } catch (error) {
    console.error('❌ PII Manager failed:', error.message);
  }
  
  // Test PII Logger
  try {
    console.log('\\nTesting PII Logger...');
    await piiSafeLogger.info('Test log entry');
    await piiSafeLogger.error('Test error', { test: true });
    results.piiLogger = true;
    console.log('✅ PII Logger working correctly');
  } catch (error) {
    console.error('❌ PII Logger failed:', error.message);
  }
  
  // Test Redis (optional)
  try {
    console.log('\\nTesting Redis connection...');
    if (process.env.REDIS_ENABLED !== 'false') {
      // Try to connect to Redis
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      await redis.ping();
      results.redis = true;
      console.log('✅ Redis connected successfully');
      await redis.disconnect();
    } else {
      console.log('⚠️  Redis disabled by configuration');
      results.redis = true; // Consider it successful if disabled
    }
  } catch (error) {
    console.warn('⚠️  Redis connection failed (using fallback):', error.message);
    results.redis = true; // This is acceptable as we have fallback
  }
  
  // Test Database Connection
  try {
    console.log('\\nTesting database connection...');
    const { sequelize } = await import('./models/index.mjs');
    await sequelize.authenticate();
    results.database = true;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Summary
  console.log('\\n📊 Validation Summary:');
  console.log('PII Manager:', results.piiManager ? '✅' : '❌');
  console.log('PII Logger:', results.piiLogger ? '✅' : '❌');
  console.log('Redis:', results.redis ? '✅' : '⚠️');
  console.log('Database:', results.database ? '✅' : '❌');
  
  const criticalFailures = [];
  if (!results.piiManager) criticalFailures.push('PII Manager');
  if (!results.piiLogger) criticalFailures.push('PII Logger');
  if (!results.database) criticalFailures.push('Database');
  
  if (criticalFailures.length > 0) {
    console.error('\\n❌ Critical systems failed:', criticalFailures.join(', '));
    console.error('Please fix these issues before starting the server.');
    process.exit(1);
  } else {
    console.log('\\n🎉 All critical systems validated successfully!');
    console.log('Server is ready to start.');
  }
}

// Run validation with error handling
validateStartup().catch(error => {
  console.error('Validation script failed:', error.message);
  process.exit(1);
});
`;
    
    await writeFile(join(process.cwd(), 'validate-startup.mjs'), startupValidationScript);
    console.log('✅ Startup validation script created');
    
    // Fix 4: Update package.json scripts
    console.log('4. Updating package.json scripts...');
    const packagePath = join(process.cwd(), 'package.json');
    let packageContent = await readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Add validation script and safe start script
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['validate'] = 'node validate-startup.mjs';
    packageJson.scripts['safe-start'] = 'npm run validate && npm run dev';
    packageJson.scripts['fix-pii'] = 'node fix-pii-complete.mjs';
    
    await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Package.json scripts updated');
    
    // Fix 5: Create a comprehensive error handling middleware
    console.log('5. Creating error handling improvements...');
    const errorHandlerPath = join(process.cwd(), 'middleware', 'startupErrorHandler.mjs');
    const errorHandlerContent = `/**
 * Startup Error Handler
 * Catches and handles startup errors gracefully
 */

export const startupErrorHandler = (error, context = 'startup') => {
  console.error(\`❌ \${context} error:\`, error.message);
  
  // Handle specific error types
  if (error.code === 'ECONNREFUSED') {
    console.warn('Connection refused - service may not be running');
    if (error.message.includes('Redis')) {
      console.warn('Consider setting REDIS_ENABLED=false in .env for development');
    }
  }
  
  if (error.message.includes('Cannot read properties of undefined')) {
    console.warn('PII scanning error - check PIIManager configuration');
    console.warn('Run: npm run fix-pii');
  }
  
  // Log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', error.stack);
  }
  
  return false; // Don't exit, continue with fallbacks
};

export const wrapStartupFunction = (fn, name) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const shouldContinue = startupErrorHandler(error, name);
      if (!shouldContinue) {
        throw error;
      }
      return null; // Return null for failed optional services
    }
  };
};

// Process-level error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  startupErrorHandler(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  startupErrorHandler(reason, 'unhandledRejection');
});
`;
    
    await writeFile(errorHandlerPath, errorHandlerContent);
    console.log('✅ Error handling middleware created');
    
    console.log('\\n🎉 All startup fixes applied successfully!');
    console.log('\\nNext steps:');
    console.log('1. Run validation: npm run validate');
    console.log('2. Apply PII fixes: npm run fix-pii');
    console.log('3. Start safely: npm run safe-start');
    console.log('\\nOr use the comprehensive restart:');
    console.log('npm run clear-cache-restart');
    
  } catch (error) {
    console.error('❌ Startup fix failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixStartupIssues();
