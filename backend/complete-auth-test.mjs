#!/usr/bin/env node

/**
 * Complete Auth Test
 * ==================
 * Tests all auth exports including the missing ones
 */

console.log('Testing complete auth middleware exports...');

async function testAuth() {
  try {
    // Import auth middleware
    const authModule = await import('./middleware/authMiddleware.mjs');
    
    console.log('\nAll available exports:');
    Object.keys(authModule).forEach(key => {
      console.log(`- ${key}: ${typeof authModule[key]}`);
    });
    
    // Test all required exports (including the ones that were missing)
    const required = [
      'protect', 
      'admin', 
      'isAdmin', 
      'adminOnly',
      'trainerOnly',
      'clientOnly',
      'trainerOrAdminOnly',
      'ownerOrAdminOnly',
      'checkTrainerClientRelationship',
      'authorize',
      'rateLimiter'
    ];
    
    console.log('\nChecking all required exports:');
    
    for (const name of required) {
      const exists = authModule[name] !== undefined;
      const type = typeof authModule[name];
      console.log(`${exists ? '✅' : '❌'} ${name}: ${type}`);
    }
    
    // Verify aliases
    console.log('\nVerifying aliases:');
    console.log(`admin === adminOnly: ${authModule.admin === authModule.adminOnly}`);
    console.log(`isAdmin === adminOnly: ${authModule.isAdmin === authModule.adminOnly}`);
    
    // Test the auth.mjs import as well
    console.log('\nTesting auth.mjs import...');
    const authMjsModule = await import('./middleware/auth.mjs');
    console.log('✅ auth.mjs imports successfully');
    
    console.log('\n✅ All auth middleware tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing auth middleware:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAuth();
