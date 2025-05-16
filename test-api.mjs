import axios from 'axios';

async function testStorefrontAPI() {
  try {
    console.log('Testing storefront API...');
    
    const response = await axios.get('http://localhost:5000/api/storefront');
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.items) {
      console.log('✅ Total items:', response.data.items.length);
      
      // Check package types
      const fixed = response.data.items.filter(item => item.packageType === 'fixed');
      const monthly = response.data.items.filter(item => item.packageType === 'monthly');
      
      console.log('✅ Fixed packages:', fixed.length);
      console.log('✅ Monthly packages:', monthly.length);
      
      // Log each item
      response.data.items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          packageType: item.packageType,
          displayPrice: item.displayPrice || item.price,
          displayOrder: item.displayOrder
        });
      });
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
      console.error('❌ Response status:', error.response.status);
    }
  }
}

testStorefrontAPI();