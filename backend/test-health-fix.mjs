/**
 * Health Fix Verification Script
 * Tests the fix for the getHealthReport() undefined error
 */

import { getHealthReport } from './utils/stripeConfig.mjs';

console.log('\n🔧 TESTING HEALTH FIX');
console.log('====================');

try {
  console.log('Testing getHealthReport() function...');
  
  const healthReport = getHealthReport();
  
  console.log('✅ getHealthReport() executed successfully');
  console.log('Structure:', JSON.stringify(healthReport, null, 2));
  
  // Test the specific property access that was failing
  console.log('\nTesting specific property access:');
  console.log(`healthReport.stripe: ${JSON.stringify(healthReport.stripe)}`);
  console.log(`healthReport.stripe.configured: ${healthReport.stripe.configured}`);
  console.log(`healthReport.stripe.environment: ${healthReport.stripe.environment}`);
  
  // Test with optional chaining (defensive approach)
  console.log('\nTesting optional chaining:');
  console.log(`healthReport?.stripe?.configured: ${healthReport?.stripe?.configured}`);
  console.log(`healthReport?.stripe?.environment: ${healthReport?.stripe?.environment}`);
  
  console.log('\n✅ ALL TESTS PASSED - Health endpoint should work now!');
  
} catch (error) {
  console.error('\n❌ TEST FAILED:', error);
  console.error('Stack:', error.stack);
}

console.log('====================\n');
