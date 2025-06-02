#!/usr/bin/env node
/**
 * TEST ASSOCIATION FIX
 * ===================
 * Quick test to verify the duplicate association alias fix works.
 * This script tests that the server can start without association conflicts.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendPath = join(__dirname, 'backend');

// Change to backend directory
process.chdir(backendPath);

async function testAssociationsFix() {
  console.log('🧪 Testing Association Fix...');
  console.log('=====================================');
  
  try {
    // Test database connection and model loading
    console.log('📊 Testing database models and associations...');
    
    // Import the associations module
    const getModels = (await import('./models/associations.mjs')).default;
    
    console.log('✅ Models import successful');
    
    // Try to get the models (this will trigger association setup)
    const models = await getModels();
    
    console.log('✅ Association setup completed without errors');
    console.log(`📋 Loaded ${Object.keys(models).length} models successfully`);
    
    // Verify User model has expected associations
    if (models.User && models.User.associations) {
      const userAssociations = Object.keys(models.User.associations);
      console.log('👤 User model associations:', userAssociations);
      
      // Check for both shopping cart aliases
      const hasShoppingCarts = userAssociations.includes('shoppingCarts');
      const hasSocialShoppingCarts = userAssociations.includes('socialShoppingCarts');
      
      console.log(`🛒 Regular shopping carts alias: ${hasShoppingCarts ? '✅' : '❌'}`);
      console.log(`🛍️  Social shopping carts alias: ${hasSocialShoppingCarts ? '✅' : '❌'}`);
      
      if (hasShoppingCarts && !hasSocialShoppingCarts) {
        console.log('⚠️  Note: Social shopping carts not found - this is expected if enhanced social models aren\'t fully integrated yet');
      }
    }
    
    console.log('=====================================');
    console.log('🎉 Association fix test PASSED!');
    console.log('✅ Server should now start without duplicate alias errors');
    
  } catch (error) {
    console.error('=====================================');
    console.error('❌ Association fix test FAILED!');
    console.error('Error:', error.message);
    
    if (error.message.includes('alias') && error.message.includes('separate associations')) {
      console.error('🚨 This indicates there are still duplicate association aliases!');
      console.error('📝 Check for other conflicting aliases in the enhanced social models');
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testAssociationsFix();