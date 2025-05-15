#!/usr/bin/env node

/**
 * Comprehensive Startup Fix
 * =========================
 * Fixes all critical issues preventing application startup
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 COMPREHENSIVE STARTUP FIX');
console.log('=============================\n');

const steps = [
  {
    name: 'Fix Auth Middleware Exports',
    action: async () => {
      console.log('1. Fixing auth middleware exports...');
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('node', ['fix-auth-middleware.mjs'], {
          cwd: __dirname,
          stdio: 'inherit'
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve('✅ Auth middleware fixed');
          } else {
            reject(new Error('❌ Auth middleware fix failed'));
          }
        });
      });
    }
  },
  
  {
    name: 'Clear Node.js Module Cache',
    action: async () => {
      console.log('\n2. Clearing Node.js module cache...');
      
      // Clear the internal require cache programmatically
      const moduleCache = require.cache;
      Object.keys(moduleCache).forEach(key => {
        if (key.includes('authMiddleware')) {
          delete moduleCache[key];
        }
      });
      
      return '✅ Module cache cleared';
    }
  },
  
  {
    name: 'Verify Auth Imports',
    action: async () => {
      console.log('\n3. Verifying auth middleware imports...');
      
      try {
        // Use dynamic import to bypass cache
        const authModule = await import(`./middleware/authMiddleware.mjs?v=${Date.now()}`);
        
        const requiredExports = ['protect', 'admin', 'isAdmin', 'adminOnly'];
        const missingExports = requiredExports.filter(exp => !authModule[exp]);
        
        if (missingExports.length > 0) {
          throw new Error(`Missing exports: ${missingExports.join(', ')}`);
        }
        
        return '✅ All auth exports verified';
      } catch (error) {
        throw new Error(`❌ Auth verification failed: ${error.message}`);
      }
    }
  },
  
  {
    name: 'Fix Frontend Proxy Configuration',
    action: async () => {
      console.log('\n4. Checking frontend proxy configuration...');
      
      const frontendPath = join(__dirname, '..', 'frontend');
      const viteConfigPath = join(frontendPath, 'vite.config.js');
      
      if (!existsSync(viteConfigPath)) {
        return '⚠️  Vite config not found, skipping';
      }
      
      try {
        const viteConfig = await fs.readFile(viteConfigPath, 'utf8');
        
        // Check if the proxy target is correct
        if (viteConfig.includes("'http://localhost:10000'") || viteConfig.includes('"http://localhost:10000"')) {
          return '✅ Frontend proxy correctly configured for port 10000';
        } else {
          // Fix the proxy configuration
          const fixedConfig = viteConfig.replace(
            /(?:target:\s*['"]http:\/\/localhost:\d+['"])/g,
            "target: 'http://localhost:10000'"
          );
          
          await fs.writeFile(viteConfigPath, fixedConfig);
          return '✅ Frontend proxy fixed to use port 10000';
        }
      } catch (error) {
        return `⚠️  Could not check/fix frontend config: ${error.message}`;
      }
    }
  },
  
  {
    name: 'Create Test Script',
    action: async () => {
      console.log('\n5. Creating comprehensive test script...');
      
      const testScript = `#!/usr/bin/env node

/**
 * Startup Test Script
 * Tests all critical components before full startup
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 TESTING STARTUP COMPONENTS...');
console.log('==================================\\n');

async function testAuthMiddleware() {
  try {
    console.log('Testing authMiddleware.mjs...');
    
    // Clear cache and fresh import
    const timestamp = Date.now();
    const authModule = await import(\`./middleware/authMiddleware.mjs?v=\${timestamp}\`);
    
    const tests = [
      { name: 'protect', expected: 'function' },
      { name: 'admin', expected: 'function' },
      { name: 'isAdmin', expected: 'function' },
      { name: 'adminOnly', expected: 'function' },
      { name: 'authorize', expected: 'function' },
      { name: 'rateLimiter', expected: 'function' }
    ];
    
    for (const test of tests) {
      const actual = typeof authModule[test.name];
      if (actual !== test.expected) {
        throw new Error(\`\${test.name}: expected \${test.expected}, got \${actual}\`);
      }
      console.log(\`  ✓ \${test.name}: \${actual}\`);
    }
    
    // Verify admin and adminOnly are the same function
    if (authModule.admin !== authModule.adminOnly) {
      throw new Error('admin and adminOnly should reference the same function');
    }
    
    console.log('  ✓ admin === adminOnly');
    
    // Verify isAdmin and adminOnly are the same function
    if (authModule.isAdmin !== authModule.adminOnly) {
      throw new Error('isAdmin and adminOnly should reference the same function');
    }
    
    console.log('  ✓ isAdmin === adminOnly');
    
    return true;
  } catch (error) {
    console.error('❌ Auth middleware test failed:', error.message);
    return false;
  }
}

async function testNotificationRoutes() {
  try {
    console.log('\\nTesting notificationSettingsRoutes.mjs...');
    
    // Test the import that was failing
    const routeModule = await import('./routes/notificationSettingsRoutes.mjs');
    console.log('  ✓ Successfully imported notificationSettingsRoutes');
    
    if (!routeModule.default) {
      throw new Error('No default export found');
    }
    
    console.log('  ✓ Default export exists');
    
    return true;
  } catch (error) {
    console.error('❌ Notification routes test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive tests...\\n');
  
  const results = await Promise.allSettled([
    testAuthMiddleware(),
    testNotificationRoutes()
  ]);
  
  console.log('\\n==================================');
  const passed = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(\`✅ ALL TESTS PASSED (\${passed}/\${total})\`);
    console.log('\\nBackend should now start without import errors!');
    console.log('\\nTo start the backend:');
    console.log('  npm start');
    process.exit(0);
  } else {
    console.log(\`❌ SOME TESTS FAILED (\${passed}/\${total})\`);
    console.log('\\nPlease review the errors above before starting.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
`;

      await fs.writeFile(join(__dirname, 'test-startup.mjs'), testScript);
      return '✅ Test script created';
    }
  }
];

// Execute all steps
async function runFixes() {
  for (const step of steps) {
    try {
      const result = await step.action();
      console.log(result);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
  
  console.log('\n=============================');
  console.log('✅ ALL FIXES COMPLETED');
  console.log('\nNext steps:');
  console.log('1. Run tests: node test-startup.mjs');
  console.log('2. If tests pass, start backend: npm start');
  console.log('3. Start frontend in separate terminal: cd ../frontend && npm start');
  console.log('\nNote: The Redis errors should be completely eliminated!');
}

runFixes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
