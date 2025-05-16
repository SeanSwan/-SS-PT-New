import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { seedStorefrontItems } from './backend/seeders/20250516-storefront-items.mjs';
import axios from 'axios';

// ANSI color codes for better console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testStorefrontComplete() {
  colorLog('blue', '='.repeat(60));
  colorLog('blue', 'COMPLETE STOREFRONT SYSTEM TEST');
  colorLog('blue', '='.repeat(60));

  // Step 1: Check if backend is running
  colorLog('yellow', '\n1. Checking backend status...');
  try {
    const response = await axios.get('http://localhost:5000/health');
    colorLog('green', '✓ Backend is running');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   DB Connected: ${response.data.dbStatus?.connected}`);
  } catch (error) {
    colorLog('red', '✗ Backend is not running or not accessible');
    colorLog('yellow', 'Please start the backend first with: cd backend && npm start');
    return;
  }

  // Step 2: Clear and reseed storefront items
  colorLog('yellow', '\n2. Reseeding storefront items...');
  try {
    // Make sure we're importing the model properly first
    await import('./backend/models/index.mjs');
    await seedStorefrontItems();
    colorLog('green', '✓ Storefront items seeded successfully');
  } catch (error) {
    colorLog('red', `✗ Error seeding: ${error.message}`);
    return;
  }

  // Step 3: Test storefront API
  colorLog('yellow', '\n3. Testing storefront API...');
  try {
    const response = await axios.get('http://localhost:5000/api/storefront');
    const data = response.data;
    
    if (data.success && data.items) {
      colorLog('green', `✓ API working - Retrieved ${data.items.length} items`);
      
      // Analyze the data
      const fixed = data.items.filter(item => item.packageType === 'fixed');
      const monthly = data.items.filter(item => item.packageType === 'monthly');
      
      console.log(`   Fixed packages: ${fixed.length}`);
      console.log(`   Monthly packages: ${monthly.length}`);
      
      // Show sample item
      if (data.items.length > 0) {
        const sample = data.items[0];
        console.log(`   Sample item: ${sample.name} - $${sample.displayPrice}`);
      }
    } else {
      colorLog('red', '✗ API returned unexpected format');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    colorLog('red', `✗ API Error: ${error.message}`);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
    return;
  }

  // Step 4: Check frontend building
  colorLog('yellow', '\n4. Checking if frontend can be built...');
  try {
    // Just check if the component file exists and can be read
    const componentPath = './frontend/src/pages/shop/StoreFront.component.tsx';
    if (existsSync(componentPath)) {
      colorLog('green', '✓ StoreFront component exists');
    } else {
      colorLog('red', '✗ StoreFront component not found');
    }
  } catch (error) {
    colorLog('red', `✗ Error checking frontend: ${error.message}`);
  }

  // Step 5: Summary and next steps
  colorLog('blue', '\n' + '='.repeat(60));
  colorLog('blue', 'TEST COMPLETE - SUMMARY');
  colorLog('blue', '='.repeat(60));
  colorLog('green', '\nNext steps to verify the fix:');
  console.log('1. Start the frontend: cd frontend && npm run dev');
  console.log('2. Open the browser to http://localhost:5173/store');
  console.log('3. Check the debug panel in the top-left corner');
  console.log('4. Verify that packages are visible on the page');
  
  colorLog('yellow', '\nIf packages still don\'t show:');
  console.log('1. Open browser developer console (F12)');
  console.log('2. Check for JavaScript errors');
  console.log('3. Check Network tab for failed API requests');
  console.log('4. Look at the debug panel for exact item counts');
}

// Run the test
testStorefrontComplete().catch(error => {
  colorLog('red', `\nTest failed with error: ${error.message}`);
  process.exit(1);
});
