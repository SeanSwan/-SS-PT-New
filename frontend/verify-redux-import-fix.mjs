/**
 * 🧪 VERIFICATION: Redux Import Fix Test
 * =====================================
 * Tests that the scheduleSlice import fix resolves the Render build error
 */

console.log('🧪 TESTING: Redux Import Fix Verification...');
console.log('===========================================');

async function testReduxImportFix() {
  try {
    console.log('📦 Step 1: Testing scheduleSlice imports...');
    
    // Test that scheduleSlice.ts exports work properly
    const scheduleModule = await import('../redux/slices/scheduleSlice.ts');
    console.log('✅ scheduleSlice.ts imported successfully');
    
    // Check available exports
    const availableExports = Object.keys(scheduleModule);
    console.log('📋 Available exports from scheduleSlice:', availableExports);
    
    // Verify setInitialState is NOT exported (this was the problem)
    if ('setInitialState' in scheduleModule) {
      console.log('❌ ERROR: setInitialState is still exported - this will cause the build error');
      return false;
    } else {
      console.log('✅ CORRECT: setInitialState is not exported (as expected)');
    }
    
    console.log('📦 Step 2: Testing storeInitSafeguard imports...');
    
    // Test that storeInitSafeguard.js imports work properly
    const safeguardModule = await import('../utils/storeInitSafeguard.js');
    console.log('✅ storeInitSafeguard.js imported successfully');
    
    // Check that safeguard functions are available
    if (typeof safeguardModule.safeInitializeStore === 'function') {
      console.log('✅ safeInitializeStore function is available');
    } else {
      console.log('❌ ERROR: safeInitializeStore function is missing');
      return false;
    }
    
    if (typeof safeguardModule.isStoreInitialized === 'function') {
      console.log('✅ isStoreInitialized function is available');
    } else {
      console.log('❌ ERROR: isStoreInitialized function is missing');
      return false;
    }
    
    console.log('📦 Step 3: Testing store initialization...');
    
    // Test that store initialization works
    try {
      const isInitialized = safeguardModule.isStoreInitialized();
      console.log('✅ Store initialization check works, initialized:', isInitialized);
    } catch (error) {
      console.log('❌ ERROR: Store initialization check failed:', error.message);
      return false;
    }
    
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ The Redux import fix should resolve the Render build error');
    console.log('🚀 Safe to deploy this fix');
    
    return true;
    
  } catch (error) {
    console.log('❌ VERIFICATION FAILED:', error.message);
    console.log('📋 Error details:', error);
    
    if (error.message.includes('setInitialState')) {
      console.log('💡 DIAGNOSIS: The setInitialState import error still exists');
      console.log('🔧 SOLUTION: Ensure storeInitSafeguard.js does not import setInitialState');
    }
    
    return false;
  }
}

// Run the verification
testReduxImportFix()
  .then((success) => {
    if (success) {
      console.log('\n🏆 VERIFICATION COMPLETE: Fix is ready for deployment');
    } else {
      console.log('\n⚠️ VERIFICATION FAILED: Fix needs more work before deployment');
    }
  })
  .catch((error) => {
    console.log('\n💥 VERIFICATION ERROR:', error);
  });
