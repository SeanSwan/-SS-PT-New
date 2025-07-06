/**
 * OPERATION "GET PAID" - Payment Service Activation Test
 * ====================================================
 * Tests the PaymentService after adding PAYMENT_STRATEGY environment variable
 * Master Prompt v33 - Production Testing Protocol
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('\n🧪 OPERATION "GET PAID" - PAYMENT SERVICE ACTIVATION TEST');
console.log('========================================================');
console.log('Testing PaymentService after adding PAYMENT_STRATEGY environment variable');
console.log('========================================================\n');

// Test environment variable
console.log('📋 ENVIRONMENT VARIABLE TEST:');
console.log(`   PAYMENT_STRATEGY: "${process.env.PAYMENT_STRATEGY}"`);
console.log(`   NODE_ENV: "${process.env.NODE_ENV}"`);
console.log(`   STRIPE_SECRET_KEY exists: ${!!process.env.STRIPE_SECRET_KEY}`);
console.log(`   VITE_STRIPE_PUBLISHABLE_KEY exists: ${!!process.env.VITE_STRIPE_PUBLISHABLE_KEY}`);

if (process.env.PAYMENT_STRATEGY) {
  console.log('✅ PAYMENT_STRATEGY is set!');
} else {
  console.log('❌ PAYMENT_STRATEGY is missing!');
  process.exit(1);
}

// Test PaymentService import and initialization
console.log('\n🔧 PAYMENT SERVICE IMPORT TEST:');
try {
  const { default: paymentService } = await import('./services/payment/PaymentService.mjs');
  console.log('✅ PaymentService imported successfully');
  
  // Get service status
  const serviceStatus = paymentService.getServiceStatus();
  
  console.log('\n📊 PAYMENT SERVICE STATUS:');
  console.log(`   Service Name: ${serviceStatus.serviceName}`);
  console.log(`   Version: ${serviceStatus.version}`);
  console.log(`   Active Strategy: ${serviceStatus.activeStrategy.name}`);
  console.log(`   Strategy Display Name: ${serviceStatus.activeStrategy.displayName}`);
  console.log(`   Strategy Description: ${serviceStatus.activeStrategy.description}`);
  console.log(`   Available Strategies: [${serviceStatus.availableStrategies.join(', ')}]`);
  console.log(`   Stripe Configured: ${serviceStatus.stripeConfiguration.enabled}`);
  
  if (serviceStatus.stripeConfiguration.error) {
    console.log(`   Stripe Error: ${serviceStatus.stripeConfiguration.error}`);
  }
  
  // Test health check
  console.log('\n🏥 HEALTH CHECK TEST:');
  const healthCheck = await paymentService.performHealthCheck();
  console.log(`   Health Status: ${healthCheck.status}`);
  console.log(`   Service Initialized: ${healthCheck.checks.serviceInitialized}`);
  console.log(`   Stripe Available: ${healthCheck.checks.stripeAvailable}`);
  console.log(`   Strategies Loaded: ${healthCheck.checks.strategiesLoaded}`);
  
  if (healthCheck.checks.activeStrategyValid !== undefined) {
    console.log(`   Active Strategy Valid: ${healthCheck.checks.activeStrategyValid}`);
  }
  
  if (healthCheck.error) {
    console.log(`   Health Check Error: ${healthCheck.error}`);
  }
  
  // Test strategy information
  console.log('\n🎯 STRATEGY DETAILS:');
  const availableStrategies = paymentService.getAvailableStrategies();
  
  availableStrategies.forEach(strategy => {
    console.log(`\n   📦 ${strategy.displayName} (${strategy.name}):`);
    console.log(`      Active: ${strategy.isActive ? '✅' : '❌'}`);
    console.log(`      Description: ${strategy.description}`);
    console.log(`      Availability: ${strategy.availability}`);
    console.log(`      Processing Time: ${strategy.processingTime}`);
    console.log(`      Fees: ${strategy.fees}`);
    
    if (strategy.advantages && strategy.advantages.length > 0) {
      console.log(`      Advantages:`);
      strategy.advantages.slice(0, 3).forEach(advantage => {
        console.log(`        • ${advantage}`);
      });
    }
  });
  
  console.log('\n🎉 PAYMENT SERVICE ACTIVATION TEST RESULTS:');
  console.log('==========================================');
  
  if (healthCheck.status === 'healthy') {
    console.log('✅ SUCCESS: PaymentService is FULLY OPERATIONAL!');
    console.log(`✅ Active Strategy: ${serviceStatus.activeStrategy.displayName}`);
    console.log('✅ Your payment system is ready to process payments!');
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Start your backend server');
    console.log('   2. Test payment creation via: POST /api/payments/create-payment-intent');
    console.log('   3. Test with a real cart and user');
    console.log('\n💡 OPERATION "GET PAID" STATUS: MISSION ACCOMPLISHED! 🎯');
  } else {
    console.log(`⚠️ WARNING: PaymentService status is "${healthCheck.status}"`);
    console.log('⚠️ Review the errors above and fix configuration issues');
    
    if (serviceStatus.activeStrategy.name === 'manual') {
      console.log('\n🔄 FALLBACK ACTIVE:');
      console.log('   Your system fell back to manual payments');
      console.log('   This means customers will get payment instructions instead of Stripe checkout');
      console.log('   This is better than broken payments, but fix Stripe for full automation');
    }
  }
  
} catch (error) {
  console.log('❌ PaymentService import failed:', error.message);
  console.log('❌ This indicates a deeper configuration issue');
  console.log('\nError Details:');
  console.log(error.stack);
}

console.log('\n========================================================');
console.log('🧪 TEST COMPLETE');
console.log('========================================================\n');
