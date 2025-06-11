/**
 * API DEBUG TRACER
 * ================
 * Let's find out what's ACTUALLY happening with the API calls
 */

console.log('🔍 DEBUGGING SWANSTUDIOS STORE API ISSUES');
console.log('=========================================');

try {
  // Step 1: Check if backend server is running
  console.log('🌐 Step 1: Testing backend server connection...');
  
  const fetch = (await import('node-fetch')).default;
  
  // Test basic server connection
  try {
    const serverTest = await fetch('http://localhost:5000/api/health', {
      method: 'GET',
      timeout: 5000
    });
    console.log(`✅ Backend server responding: ${serverTest.status}`);
  } catch (serverError) {
    console.log('❌ Backend server NOT responding!');
    console.log('   Error:', serverError.message);
    console.log('   🎯 SOLUTION: Start your backend server first!');
    console.log('   Run: npm run server OR node backend/server.mjs');
    process.exit(1);
  }
  
  // Step 2: Test storefront API endpoint directly
  console.log('\n🛒 Step 2: Testing /api/storefront endpoint...');
  
  try {
    const apiResponse = await fetch('http://localhost:5000/api/storefront', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No auth headers for now
      },
      timeout: 10000
    });
    
    const responseText = await apiResponse.text();
    console.log(`📊 API Response Status: ${apiResponse.status}`);
    console.log(`📝 API Response Body:`, responseText.substring(0, 500));
    
    if (apiResponse.status === 200) {
      try {
        const data = JSON.parse(responseText);
        if (data.items && data.items.length > 0) {
          console.log(`✅ API returned ${data.items.length} packages:`);
          data.items.forEach((item, i) => {
            console.log(`   ${i+1}. ${item.name}: $${item.price || item.displayPrice || item.totalCost || 0}`);
          });
        } else {
          console.log('⚠️ API returned empty items array');
        }
      } catch (parseError) {
        console.log('❌ API returned invalid JSON');
      }
    } else {
      console.log('❌ API returned error status');
    }
    
  } catch (apiError) {
    console.log('❌ Storefront API failed!');
    console.log('   Error:', apiError.message);
  }
  
  // Step 3: Check database directly
  console.log('\n🗄️ Step 3: Checking database directly...');
  
  const { default: sequelize } = await import('./backend/database.mjs');
  const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
  
  const dbPackages = await StorefrontItem.findAll({
    limit: 3,
    order: [['id', 'ASC']]
  });
  
  console.log(`📦 Database contains ${dbPackages.length} packages (showing first 3):`);
  dbPackages.forEach((pkg, i) => {
    console.log(`   ${i+1}. ${pkg.name}: $${pkg.price || pkg.displayPrice || pkg.totalCost || 0}`);
    console.log(`      ID: ${pkg.id}, Active: ${pkg.isActive}, Type: ${pkg.packageType}`);
  });
  
  // Step 4: Check which component is actually being used
  console.log('\n🎯 Step 4: COMPONENT ANALYSIS');
  console.log('=============================');
  console.log('Based on routes, /shop should load: GalaxyStoreFrontFixed.component.tsx');
  console.log('This component SHOULD fetch from API, not use hardcoded data');
  console.log('');
  console.log('🔍 DEBUGGING CHECKLIST:');
  console.log('1. Open browser Dev Tools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Visit /shop page');
  console.log('4. Look for /api/storefront request');
  console.log('5. Check if request succeeds and what data it returns');
  console.log('');
  
  // Step 5: Environment check
  console.log('⚙️ Step 5: Environment check...');
  console.log('Backend URL in frontend should be: http://localhost:5000');
  console.log('Frontend should be on: http://localhost:3000');
  console.log('');
  
  console.log('🎯 MOST LIKELY ISSUES:');
  console.log('======================');
  console.log('1. Backend server not running (check Step 1 above)');
  console.log('2. API endpoint not working (check Step 2 above)');
  console.log('3. Frontend not making API call (check browser Network tab)');
  console.log('4. Authentication required but failing');
  console.log('5. CORS issues between frontend and backend');
  console.log('');
  
  process.exit(0);
  
} catch (error) {
  console.error('💥 Debug tracer failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
