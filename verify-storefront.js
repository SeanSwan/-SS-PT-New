const axios = require('axios');

const verifyStorefront = async () => {
  console.log('🔍 Verifying StoreFront Database Integration...\n');
  
  try {
    // Test backend API
    console.log('Testing backend API...');
    const response = await axios.get('http://localhost:5000/api/storefront?sortBy=displayOrder&sortOrder=ASC');
    
    if (response.data && response.data.success) {
      const itemCount = response.data.items?.length || 0;
      console.log(`✅ SUCCESS: API returned ${itemCount} items`);
      
      if (itemCount > 0) {
        console.log('Sample item:', {
          name: response.data.items[0].name,
          price: response.data.items[0].displayPrice,
          type: response.data.items[0].itemType || response.data.items[0].packageType
        });
      }
      
      console.log('\n✅ Database integration is working correctly!');
      console.log('The StoreFront should now display database-driven packages.');
    } else {
      console.log('❌ API response format error');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Backend API test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running or not accessible.');
      console.log('Make sure to start the backend server with: npm start');
    } else if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    
    console.log('\n🔄 The frontend will use mock data instead.');
  }
  
  console.log('\n----------------------------------------');
  console.log('To fully verify:');
  console.log('1. Navigate to http://localhost:5173/store');  
  console.log('2. Check browser console for any errors');
  console.log('3. Verify 7 packages are displayed');
  console.log('4. Try adding items to cart (requires login)');
  console.log('----------------------------------------');
};

verifyStorefront();