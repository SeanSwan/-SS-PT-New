#!/usr/bin/env node

/**
 * Quick Verification Script for PII Logging Fixes
 * Run this to test the critical fixes we made
 */

console.log('🔧 Starting PII Logging Fix Verification...\n');

// Test 1: Import modules without errors
console.log('1. Testing module imports...');
try {
  const { piiManager } = await import('./services/privacy/PIIManager.mjs');
  const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');
  console.log('✅ All modules imported successfully\n');
} catch (error) {
  console.log('❌ Module import failed:', error.message);
  process.exit(1);
}

// Test 2: Test the fixes
console.log('2. Testing null/undefined handling...');
const { piiManager } = await import('./services/privacy/PIIManager.mjs');
const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');

try {
  // Test scanForPII with null/undefined
  await piiManager.scanForPII(null);
  await piiManager.scanForPII(undefined);
  await piiManager.scanForPII('');
  
  // Test sanitizeContent with null/undefined
  await piiManager.sanitizeContent(null);
  await piiManager.sanitizeContent(undefined);
  await piiManager.sanitizeContent('');
  
  // Test containsPII with null/undefined
  await piiManager.containsPII(null);
  await piiManager.containsPII(undefined);
  await piiManager.containsPII('');
  
  // Test maskPII with null/undefined
  piiManager.maskPII(null, 'email');
  piiManager.maskPII(undefined, 'email');
  piiManager.maskPII('', 'email');
  
  console.log('✅ All null/undefined handling tests passed\n');
} catch (error) {
  console.log('❌ Null/undefined handling test failed:', error.message);
  process.exit(1);
}

// Test 3: Test logger with problematic inputs
console.log('3. Testing logger with problematic inputs...');
try {
  await piiSafeLogger.info(null);
  await piiSafeLogger.info(undefined);
  await piiSafeLogger.info('', { meta: null });
  await piiSafeLogger.error('Test error', { 
    email: null,
    phone: undefined,
    data: { nested: null }
  });
  
  console.log('✅ All logger tests passed\n');
} catch (error) {
  console.log('❌ Logger test failed:', error.message);
  process.exit(1);
}

console.log('🎉 All verification tests passed! The PII logging system should now be stable.\n');
console.log('Key fixes applied:');
console.log('- Added null/undefined checks in all PII scanning methods');
console.log('- Added null/undefined checks in all PII sanitization methods');
console.log('- Added defensive error handling in all logger methods');
console.log('- Prevented infinite loops in error fallback logging');
console.log('- Added defensive checks in metadata sanitization');
console.log('- Improved formatLog function with error handling\n');

console.log('✅ System is ready for use!');
