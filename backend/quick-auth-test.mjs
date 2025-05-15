#!/usr/bin/env node

/**
 * Quick Auth Test
 * ===============
 * Simple verification that auth middleware exports correctly
 */

console.log('🔍 QUICK AUTH MIDDLEWARE TEST');
console.log('============================\n');

try {
  console.log('Importing auth middleware...');
  
  // Dynamic import with cache busting
  const timestamp = Date.now();
  const authModule = await import(`./middleware/authMiddleware.mjs?v=${timestamp}`);
  
  console.log('\nChecking exports...');
  
  const exports = Object.keys(authModule);
  console.log('Available exports:', exports);
  
  // Check specific exports
  const required = ['protect', 'admin', 'isAdmin', 'adminOnly'];
  
  for (const exportName of required) {
    const exists = authModule[exportName] !== undefined;
    const type = typeof authModule[exportName];
    console.log(`${exists ? '✅' : '❌'} ${exportName}: ${exists ? type : 'MISSING'}`);
  }
  
  // Verify aliases
  console.log('\nVerifying aliases...');
  console.log(`admin === adminOnly: ${authModule.admin === authModule.adminOnly ? '✅' : '❌'}`);
  console.log(`isAdmin === adminOnly: ${authModule.isAdmin === authModule.adminOnly ? '✅' : '❌'}`);
  
  console.log('\n============================');
  console.log('✅ AUTH MIDDLEWARE TEST COMPLETE');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
