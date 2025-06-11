// Diagnose Model Loading Discrepancy
// Addresses: 43 models vs 21 models loading discrepancy

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 DIAGNOSING MODEL LOADING DISCREPANCY');
console.log('=======================================');

const checkModelLoading = async () => {
  try {
    // Test 1: Load models the same way as diagnostics
    console.log('\n📋 TEST 1: Loading models (diagnostic way)...');
    const setupAssociations = await import('./backend/setupAssociations.mjs');
    const models1 = await setupAssociations.default();
    console.log(`Models loaded (diagnostic): ${Object.keys(models1 || {}).length}`);
    console.log('Model names:', Object.keys(models1 || {}).join(', '));
    
    // Test 2: Check what happens during server startup
    console.log('\n🚀 TEST 2: Checking server startup model loading...');
    
    // Import the core app creation
    const { createApp } = await import('./backend/core/app.mjs');
    console.log('✅ Core app module loaded');
    
    // Check the startup initialization
    const { initializeServer } = await import('./backend/core/startup.mjs');
    console.log('✅ Startup module loaded');
    
    // Test 3: Check if there are differences in import paths
    console.log('\n🔗 TEST 3: Checking model import consistency...');
    
    // Direct model imports (like server might do)
    try {
      const User = await import('./backend/models/User.mjs');
      const ShoppingCart = await import('./backend/models/ShoppingCart.mjs');
      const CartItem = await import('./backend/models/CartItem.mjs');
      const StorefrontItem = await import('./backend/models/StorefrontItem.mjs');
      
      console.log('✅ Core e-commerce models import successfully');
      console.log('  - User:', typeof User.default);
      console.log('  - ShoppingCart:', typeof ShoppingCart.default);
      console.log('  - CartItem:', typeof CartItem.default);
      console.log('  - StorefrontItem:', typeof StorefrontItem.default);
    } catch (importError) {
      console.log('❌ Error importing core models:', importError.message);
    }
    
    // Test 4: Check for circular dependency issues
    console.log('\n🔄 TEST 4: Checking for circular dependency issues...');
    
    try {
      // This is how associations.mjs loads models
      const associationsModule = await import('./backend/models/associations.mjs');
      const models2 = await associationsModule.default();
      console.log(`Models loaded (associations): ${Object.keys(models2 || {}).length}`);
      
      if (models1 && models2) {
        const diff = Object.keys(models1).filter(key => !Object.keys(models2).includes(key));
        if (diff.length > 0) {
          console.log('❌ Model loading difference detected:');
          console.log('Missing in server startup:', diff.join(', '));
        } else {
          console.log('✅ Model loading consistent between methods');
        }
      }
    } catch (error) {
      console.log('❌ Error in associations loading:', error.message);
    }
    
    // Test 5: Check specific model files that might be missing
    console.log('\n📁 TEST 5: Checking for missing model files...');
    
    const modelFiles = [
      'User.mjs', 'Session.mjs', 'ClientProgress.mjs', 'Gamification.mjs',
      'Achievement.mjs', 'ShoppingCart.mjs', 'CartItem.mjs', 'StorefrontItem.mjs',
      'Order.mjs', 'OrderItem.mjs', 'Notification.mjs'
    ];
    
    for (const file of modelFiles) {
      try {
        const model = await import(`./backend/models/${file}`);
        console.log(`✅ ${file}: ${typeof model.default}`);
      } catch (error) {
        console.log(`❌ ${file}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('====================');
    console.log('1. Check the model count differences above');
    console.log('2. Look for missing model files');
    console.log('3. Check for circular dependency errors');
    console.log('4. Verify server startup vs diagnostic loading paths');
    
  } catch (error) {
    console.error('💥 Diagnosis error:', error.message);
    console.error('Stack:', error.stack);
  }
};

checkModelLoading();
