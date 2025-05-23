/**
 * PII Logging Test Script
 * Tests the PII safe logging system to ensure no infinite loops
 */

import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';
import { piiManager } from '../services/privacy/PIIManager.mjs';

async function runTests() {
  console.log('🔄 Starting PII Logging Tests...\n');

  // Test 1: Basic logging with null/undefined values
  console.log('1. Testing null/undefined handling...');
  try {
    await piiSafeLogger.info(null);
    await piiSafeLogger.info(undefined);
    await piiSafeLogger.info('');
    await piiSafeLogger.error(null, { meta: null });
    console.log('✅ Null/undefined handling passed\n');
  } catch (error) {
    console.log('❌ Null/undefined handling failed:', error.message);
  }

  // Test 2: Basic PII scanning with problematic inputs
  console.log('2. Testing PII scanning with null inputs...');
  try {
    let result = await piiManager.scanForPII(null);
    console.log('   Null scan result:', result.piiDetected);
    
    result = await piiManager.scanForPII(undefined);
    console.log('   Undefined scan result:', result.piiDetected);
    
    result = await piiManager.scanForPII('');
    console.log('   Empty string scan result:', result.piiDetected);
    
    console.log('✅ PII scanning with null inputs passed\n');
  } catch (error) {
    console.log('❌ PII scanning failed:', error.message);
  }

  // Test 3: Content sanitization with problematic inputs
  console.log('3. Testing content sanitization...');
  try {
    let result = await piiManager.sanitizeContent(null);
    console.log('   Null sanitization result:', result.sanitizedContent);
    
    result = await piiManager.sanitizeContent(undefined);
    console.log('   Undefined sanitization result:', result.sanitizedContent);
    
    result = await piiManager.sanitizeContent('');
    console.log('   Empty string sanitization result:', result.sanitizedContent);
    
    console.log('✅ Content sanitization passed\n');
  } catch (error) {
    console.log('❌ Content sanitization failed:', error.message);
  }

  // Test 4: Mask PII with null values
  console.log('4. Testing mask PII with null values...');
  try {
    let result = piiManager.maskPII(null, 'email');
    console.log('   Null mask result:', result);
    
    result = piiManager.maskPII(undefined, 'email');
    console.log('   Undefined mask result:', result);
    
    result = piiManager.maskPII('', 'email');
    console.log('   Empty string mask result:', result);
    
    console.log('✅ Mask PII with null values passed\n');
  } catch (error) {
    console.log('❌ Mask PII failed:', error.message);
  }

  // Test 5: Logging with actual PII that might cause errors
  console.log('5. Testing error scenarios...');
  try {
    // Test with a message that might cause issues
    await piiSafeLogger.error('Test error message', { 
      email: null,
      phone: undefined,
      data: { nested: null }
    });
    console.log('✅ Error logging with null metadata passed\n');
  } catch (error) {
    console.log('❌ Error logging failed:', error.message);
  }

  // Test 6: Test recursion prevention
  console.log('6. Testing recursion prevention...');
  try {
    // Force an error in PII scrubbing
    const originalScrubText = piiSafeLogger.scrubText;
    piiSafeLogger.scrubText = async () => {
      throw new Error('Forced error for testing');
    };
    
    await piiSafeLogger.error('This should trigger fallback logging');
    
    // Restore original function
    piiSafeLogger.scrubText = originalScrubText;
    console.log('✅ Recursion prevention passed\n');
  } catch (error) {
    console.log('❌ Recursion prevention test failed:', error.message);
  }

  console.log('🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error);
