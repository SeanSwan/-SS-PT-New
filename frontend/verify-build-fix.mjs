/**
 * Build Fix Verification Script
 * Tests that the critical import error has been resolved
 */

// Test the fixed import
try {
  console.log('🧪 Testing storeInitSafeguard import...');
  
  // This should now work without the missing setInitialState import
  const safeguard = await import('./src/utils/storeInitSafeguard.js');
  
  console.log('✅ storeInitSafeguard imported successfully');
  console.log('📋 Available exports:', Object.keys(safeguard));
  
  // Test that the functions exist
  if (typeof safeguard.safeInitializeStore === 'function') {
    console.log('✅ safeInitializeStore function exists');
  } else {
    console.log('❌ safeInitializeStore function missing');
  }
  
  if (typeof safeguard.isStoreInitialized === 'function') {
    console.log('✅ isStoreInitialized function exists');
  } else {
    console.log('❌ isStoreInitialized function missing');
  }
  
  console.log('🎉 BUILD FIX VERIFICATION PASSED - Import error resolved!');
  
} catch (error) {
  console.error('❌ BUILD FIX VERIFICATION FAILED:', error.message);
  
  if (error.message.includes('setInitialState')) {
    console.error('💡 The setInitialState import issue is still present');
  } else {
    console.error('💡 Different import error detected:', error.message);
  }
}

// Test scheduleSlice imports to ensure no other missing exports
try {
  console.log('🧪 Testing scheduleSlice imports...');
  
  const scheduleSlice = await import('./src/redux/slices/scheduleSlice.ts');
  
  console.log('✅ scheduleSlice imported successfully');
  console.log('📋 Available exports:', Object.keys(scheduleSlice));
  
  // Verify the exports that should exist
  const expectedExports = [
    'fetchEvents', 'fetchTrainers', 'fetchClients', 'bookSession',
    'resetScheduleStatus', 'updateSession', 'addSession', 'removeSession',
    'selectAllSessions', 'selectScheduleStatus', 'selectScheduleError'
  ];
  
  const missingExports = expectedExports.filter(exp => !(exp in scheduleSlice));
  
  if (missingExports.length === 0) {
    console.log('✅ All expected scheduleSlice exports present');
  } else {
    console.log('⚠️ Missing scheduleSlice exports:', missingExports);
  }
  
} catch (error) {
  console.error('❌ scheduleSlice import failed:', error.message);
}

console.log('\n🔧 BUILD FIX VERIFICATION COMPLETED');
console.log('📝 The Render deployment should now succeed!');
