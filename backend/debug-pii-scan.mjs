#!/usr/bin/env node

/**
 * Debug PII Scanning Issues
 * This script specifically tests the scenarios causing errors in the logs
 */

console.log('🔍 Debug PII Scanning Issues...\n');

// Test with actual problematic inputs that might occur during startup
async function runDebugTests() {
  try {
    const { piiManager } = await import('./services/privacy/PIIManager.mjs');
    
    console.log('1. Testing with null/undefined inputs...');
    try {
      await piiManager.scanForPII(null);
      await piiManager.scanForPII(undefined);
      await piiManager.scanForPII('');
      
      await piiManager.sanitizeContent(null);
      await piiManager.sanitizeContent(undefined);
      await piiManager.sanitizeContent('', { context: undefined });
      await piiManager.sanitizeContent('', {}); // No context
      
      console.log('✅ Null/undefined tests passed');
    } catch (error) {
      console.log('❌ Null/undefined test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n2. Testing with problematic content types...');
    try {
      await piiManager.scanForPII(123);
      await piiManager.scanForPII([]);
      await piiManager.scanForPII({});
      await piiManager.scanForPII(true);
      
      await piiManager.sanitizeContent(123);
      await piiManager.sanitizeContent([]);
      await piiManager.sanitizeContent({});
      
      console.log('✅ Type conversion tests passed');
    } catch (error) {
      console.log('❌ Type conversion test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n3. Testing regex patterns with edge cases...');
    try {
      // Test each pattern individually with problematic inputs
      const patterns = [
        '',
        ' ',
        'test@',
        '@test.com',
        '123-',
        '-456',
        '555-',
        '-1234'
      ];
      
      for (const testContent of patterns) {
        await piiManager.scanForPII(testContent);
        await piiManager.sanitizeContent(testContent);
      }
      
      console.log('✅ Regex pattern edge case tests passed');
    } catch (error) {
      console.log('❌ Regex pattern test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n4. Testing during import/export scenarios...');
    try {
      // Test scenario that might happen during module import
      const testModule = {
        scanForPII: piiManager.scanForPII.bind(piiManager),
        sanitizeContent: piiManager.sanitizeContent.bind(piiManager)
      };
      
      await testModule.scanForPII(null);
      await testModule.sanitizeContent(undefined, { context: 'logging' });
      
      console.log('✅ Module binding tests passed');
    } catch (error) {
      console.log('❌ Module binding test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n5. Testing circular dependency scenarios...');
    try {
      // Import both modules to check for circular dependency issues
      const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');
      
      // Test logging with PII content that triggers scanning
      await piiSafeLogger.info('Test with email: user@example.com');
      await piiSafeLogger.error('Error with phone: 555-1234', {
        context: 'logging'
      });
      
      console.log('✅ Circular dependency tests passed');
    } catch (error) {
      console.log('❌ Circular dependency test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n6. Testing with actual log-like content...');
    try {
      // Test with content that might appear in logs during startup
      const logLikeContent = [
        'Starting test account seeding...',
        'Connecting to MongoDB at mongodb://localhost:27017/',
        'warn: SendGrid client NOT configured due to missing/invalid API key',
        'PII scan failed: Cannot read properties of undefined (reading \\'length\\')'
      ];
      
      for (const content of logLikeContent) {
        await piiManager.scanForPII(content);
        await piiManager.sanitizeContent(content);
      }
      
      console.log('✅ Log-like content tests passed');
    } catch (error) {
      console.log('❌ Log-like content test failed:', error.message);
      console.log('Stack:', error.stack);
      return;
    }
    
    console.log('\\n🎉 All debug tests passed! PII scanning should be stable.');
    
  } catch (moduleError) {
    console.log('❌ Module import failed:', moduleError.message);
    console.log('Stack:', moduleError.stack);
  }
}

runDebugTests();
