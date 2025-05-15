#!/usr/bin/env node

/**
 * Simple Auth Test
 * ================
 * Basic verification that auth middleware exports work
 */

console.log('Testing auth middleware exports...');

async function testAuth() {
  try {
    // Simple import without cache busting
    const authModule = await import('./middleware/authMiddleware.mjs');
    
    console.log('\nAvailable exports:');
    Object.keys(authModule).forEach(key => {
      console.log(`- ${key}: ${typeof authModule[key]}`);
    });
    
    // Test required exports
    const required = ['protect', 'admin', 'isAdmin', 'adminOnly'];
    console.log('\nChecking required exports:');
    
    for (const name of required) {
      const exists = authModule[name] !== undefined;
      const type = typeof authModule[name];
      console.log(`${exists ? '✅' : '❌'} ${name}: ${type}`);
    }
    
    // Verify aliases
    console.log('\nVerifying aliases:');
    console.log(`admin === adminOnly: ${authModule.admin === authModule.adminOnly}`);
    console.log(`isAdmin === adminOnly: ${authModule.isAdmin === authModule.adminOnly}`);
    
    console.log('\n✅ Auth middleware test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing auth middleware:', error.message);
    process.exit(1);
  }
}

testAuth();
