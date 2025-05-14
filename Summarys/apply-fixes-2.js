/**
 * Cart and Client Progress Fix Script
 * 
 * This script will update your application to fix:
 * 1. Cart functionality - 401 Unauthorized errors
 * 2. Checkout process with Stripe
 * 3. Client Progress display with fallback data
 * 
 * Run this script with: node apply-fixes-2.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Banner
console.log('\n=============================================');
console.log('🛒 CART & CLIENT PROGRESS FIX INSTALLER 🏋️');
console.log('=============================================\n');

// Files to update
const filesToUpdate = [
  {
    source: 'frontend/src/components/ShoppingCart/ShoppingCart.tsx.fix',
    target: 'frontend/src/components/ShoppingCart/ShoppingCart.tsx'
  },
  {
    source: 'frontend/src/services/exercise-service.ts.fix',
    target: 'frontend/src/services/exercise-service.ts'
  }
];

// Files to create if they don't exist
const filesToCreate = [
  {
    source: 'frontend/src/services/mock-exercise-service.ts',
    target: 'frontend/src/services/mock-exercise-service.ts'
  }
];

// Function to copy a file with backup
function updateFile(source, target) {
  try {
    const sourcePath = path.resolve(__dirname, source);
    const targetPath = path.resolve(__dirname, target);
    const backupPath = `${targetPath}.backup`;
    
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      return false;
    }
    
    // Check if target exists and make backup
    if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
      console.log(`📦 Creating backup of ${target}`);
      fs.copyFileSync(targetPath, backupPath);
    }
    
    // Update the file
    console.log(`📝 Updating ${target}`);
    fs.copyFileSync(sourcePath, targetPath);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${target}: ${error.message}`);
    return false;
  }
}

// Function to create a file if it doesn't exist
function createFileIfMissing(source, target) {
  try {
    const sourcePath = path.resolve(__dirname, source);
    const targetPath = path.resolve(__dirname, target);
    
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      return false;
    }
    
    // Check if target already exists
    if (fs.existsSync(targetPath)) {
      console.log(`ℹ️ File already exists: ${target}`);
      return true;
    }
    
    // Create the file
    console.log(`✨ Creating new file: ${target}`);
    fs.copyFileSync(sourcePath, targetPath);
    return true;
  } catch (error) {
    console.error(`❌ Error creating ${target}: ${error.message}`);
    return false;
  }
}

// Apply updates
let updatedCount = 0;
let createdCount = 0;
let errorCount = 0;

console.log('📊 UPDATING COMPONENTS:');
filesToUpdate.forEach(file => {
  if (updateFile(file.source, file.target)) {
    updatedCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📊 CREATING FALLBACK SERVICES:');
filesToCreate.forEach(file => {
  if (createFileIfMissing(file.source, file.target)) {
    createdCount++;
  } else {
    errorCount++;
  }
});

// Run the backend fix script
console.log('\n📊 CHECKING STRIPE CONFIGURATION:');
try {
  // Execute the cart checkout fix script
  console.log('🔍 Running backend fixes...');
  execSync('node backend/fix-cart-checkout.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error(`❌ Error running backend fix script: ${error.message}`);
  errorCount++;
}

// Summary
console.log('\n=============================================');
console.log('🎉 INSTALLATION SUMMARY 🎉');
console.log('=============================================');
console.log(`✅ ${updatedCount} files updated`);
console.log(`✅ ${createdCount} files created`);
if (errorCount > 0) {
  console.log(`❌ ${errorCount} errors encountered`);
}

// Next steps
console.log('\n📋 NEXT STEPS:');
console.log('1. Restart your application: npm start');
console.log('2. Test the cart functionality by adding items and checking out');
console.log('3. Visit the client progress page to see the fallback data');
console.log('4. Set up your Stripe account and update the .env if needed');
console.log('\n⚠️ If you encounter any issues, you can restore the backup files (.backup extension)');
console.log('=============================================');
