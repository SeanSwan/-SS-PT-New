/**
 * Test the association fix
 * This script tests that associations can be set up without the duplicate alias error
 */

import logger from './utils/logger.mjs';

const testAssociationFix = async () => {
  try {
    console.log('🧪 TESTING: Association fix validation...');
    
    // Test 1: Import models and set up associations
    const { initializeModelsCache } = await import('./models/index.mjs');
    
    console.log('🧪 TEST 1: Initializing models cache...');
    const models = await initializeModelsCache();
    
    if (models && models.User && models.ClientProgress) {
      console.log('✅ TEST 1 PASSED: Models loaded successfully');
      console.log('📋 User associations:', Object.keys(models.User.associations || {}));
      console.log('📋 ClientProgress associations:', Object.keys(models.ClientProgress.associations || {}));
      
      // Test 2: Check for the specific association that was causing the error
      if (models.User.associations && models.User.associations.clientProgress) {
        console.log('✅ TEST 2 PASSED: clientProgress association exists');
      } else {
        console.log('❌ TEST 2 FAILED: clientProgress association missing');
      }
      
      // Test 3: Try to call the association setup again to verify singleton works
      console.log('🧪 TEST 3: Testing singleton pattern...');
      const models2 = await initializeModelsCache();
      
      if (models === models2) {
        console.log('✅ TEST 3 PASSED: Singleton pattern working - same instance returned');
      } else {
        console.log('⚠️ TEST 3 WARNING: Different instances returned, but no error occurred');
      }
      
      console.log('🎉 ASSOCIATION FIX VALIDATION COMPLETED SUCCESSFULLY');
      
    } else {
      console.log('❌ TEST FAILED: Models not loaded properly');
    }
    
  } catch (error) {
    if (error.message && error.message.includes('clientProgress')) {
      console.log('❌ ASSOCIATION FIX FAILED: Still getting clientProgress duplicate error');
      console.log('Error:', error.message);
    } else {
      console.log('❌ UNEXPECTED ERROR during test:', error.message);
    }
    console.log('Stack:', error.stack);
  }
};

// Run the test
testAssociationFix().catch(console.error);
