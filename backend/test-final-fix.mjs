#!/usr/bin/env node

/**
 * Final Startup Test
 * Tests all fixes applied
 */

async function runTest() {
  console.log('🧪 Testing all fixes...');
  
  try {
    // Test 1: PIIManager
    console.log('\n1. Testing PIIManager...');
    const { piiManager } = await import('./services/privacy/PIIManager.mjs');
    
    // Test all problematic inputs
    await piiManager.scanForPII(null);
    await piiManager.scanForPII(undefined);
    await piiManager.scanForPII('');
    await piiManager.scanForPII(123);
    await piiManager.scanForPII([]);
    await piiManager.scanForPII({});
    await piiManager.scanForPII('test@example.com');
    
    await piiManager.sanitizeContent(null);
    await piiManager.sanitizeContent(undefined);
    await piiManager.sanitizeContent('', { context: undefined });
    await piiManager.sanitizeContent('test content');
    
    console.log('✅ PIIManager tests passed');
    
    // Test 2: piiSafeLogger
    console.log('\n2. Testing piiSafeLogger...');
    const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');
    
    await piiSafeLogger.info(null);
    await piiSafeLogger.info(undefined);
    await piiSafeLogger.info('Test message');
    await piiSafeLogger.error('Test error', { test: true });
    await piiSafeLogger.warn('Test warning', { data: null });
    await piiSafeLogger.debug('Test debug', undefined);
    
    console.log('✅ piiSafeLogger tests passed');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\nThe PII scanning issues should now be completely resolved.');
    console.log('\nYou can now run:');
    console.log('npm run clear-cache-restart');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest();
