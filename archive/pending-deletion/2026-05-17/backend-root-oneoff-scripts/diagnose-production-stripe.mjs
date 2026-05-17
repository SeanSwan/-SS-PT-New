#!/usr/bin/env node

/**
 * Production Stripe Key Diagnostic
 * ==============================
 * Diagnoses Stripe key validity issues in production
 * Following Master Prompt v33 Secrets Management Protocol
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('🔍 PRODUCTION STRIPE DIAGNOSTIC');
console.log('==============================');
console.log('Checking for Stripe account/key validity issues');

async function testStripeKeys() {
  try {
    const Stripe = await import('stripe');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    console.log('\n📊 STRIPE KEY ANALYSIS:');
    console.log('=======================');
    
    if (!secretKey) {
      console.log('❌ STRIPE_SECRET_KEY missing');
      return;
    }
    
    if (!publishableKey) {
      console.log('❌ VITE_STRIPE_PUBLISHABLE_KEY missing');
      return;
    }
    
    // Extract account IDs safely
    const secretMatch = secretKey.match(/sk_(live|test)_([A-Za-z0-9]+)/);
    const publishableMatch = publishableKey.match(/pk_(live|test)_([A-Za-z0-9]+)/);
    
    if (secretMatch && publishableMatch) {
      const secretAccount = secretMatch[2];
      const publishableAccount = publishableMatch[2];
      const secretEnv = secretMatch[1];
      const publishableEnv = publishableMatch[1];
      
      console.log(`🔑 Secret Key Environment: ${secretEnv.toUpperCase()}`);
      console.log(`🔑 Publishable Key Environment: ${publishableEnv.toUpperCase()}`);
      console.log(`🔗 Account Match: ${secretAccount === publishableAccount ? '✅ YES' : '❌ NO'}`);
      console.log(`🌍 Environment Match: ${secretEnv === publishableEnv ? '✅ YES' : '❌ NO'}`);
      
      if (secretAccount !== publishableAccount) {
        console.log('\n🚨 CRITICAL: Keys are from different Stripe accounts!');
        console.log('This is the likely cause of your 401 error.');
        return;
      }
      
      if (secretEnv !== publishableEnv) {
        console.log('\n🚨 CRITICAL: Keys are from different environments!');
        console.log('This is the likely cause of your 401 error.');
        return;
      }
    }
    
    console.log('\n🧪 TESTING STRIPE API ACCESS:');
    console.log('=============================');
    
    // Test secret key with Stripe API
    const stripe = new Stripe.default(secretKey, {
      apiVersion: '2023-10-16'
    });
    
    console.log('🔧 Testing secret key...');
    try {
      const account = await stripe.accounts.retrieve();
      console.log('✅ Secret key is valid and working');
      console.log(`📊 Account ID: ${account.id}`);
      console.log(`🏢 Business Type: ${account.type}`);
      console.log(`🌍 Country: ${account.country}`);
      console.log(`📧 Email: ${account.email || 'Not set'}`);
      console.log(`💰 Charges Enabled: ${account.charges_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`💳 Payouts Enabled: ${account.payouts_enabled ? '✅ YES' : '❌ NO'}`);
      
      if (!account.charges_enabled) {
        console.log('\n🚨 CRITICAL: Charges are DISABLED on your Stripe account!');
        console.log('This will cause 401 errors when trying to process payments.');
        console.log('Check your Stripe Dashboard for account restrictions.');
      }
      
      if (!account.payouts_enabled) {
        console.log('\n⚠️ WARNING: Payouts are disabled on your Stripe account.');
        console.log('This may affect payment processing.');
      }
      
      // Test creating a minimal payment intent
      console.log('\n🧪 Testing payment intent creation...');
      const testPaymentIntent = await stripe.paymentIntents.create({
        amount: 100, // $1.00
        currency: 'usd',
        description: 'Test payment intent for key validation'
      });
      
      console.log('✅ Payment intent creation successful');
      console.log(`🎯 Payment Intent ID: ${testPaymentIntent.id}`);
      
      // Now test publishable key validation
      console.log('\n🧪 Testing publishable key format...');
      if (publishableKey.startsWith('pk_live_') && secretKey.startsWith('sk_live_')) {
        console.log('✅ Both keys are LIVE environment keys');
      } else if (publishableKey.startsWith('pk_test_') && secretKey.startsWith('sk_test_')) {
        console.log('✅ Both keys are TEST environment keys');
      } else {
        console.log('❌ Key environment mismatch detected');
      }
      
    } catch (stripeError) {
      console.log(`❌ Stripe API Error: ${stripeError.message}`);
      console.log(`🔍 Error Type: ${stripeError.type}`);
      console.log(`🔍 Error Code: ${stripeError.code}`);
      
      if (stripeError.type === 'StripeAuthenticationError') {
        console.log('\n🚨 AUTHENTICATION ERROR: Your secret key is invalid or revoked!');
        console.log('Solutions:');
        console.log('1. Check your Stripe Dashboard for new keys');
        console.log('2. Verify your account is in good standing');
        console.log('3. Ensure you copied the keys correctly');
      }
      
      return;
    }
    
    // Final recommendation
    console.log('\n🎯 DIAGNOSTIC CONCLUSION:');
    console.log('========================');
    console.log('✅ Backend Stripe configuration appears to be working correctly');
    console.log('❌ The 401 error is likely caused by one of these frontend issues:');
    console.log('   1. Frontend build not picking up environment variables correctly');
    console.log('   2. Render frontend environment variables different from backend');
    console.log('   3. Browser caching old publishable key');
    console.log('   4. CDN caching issues with the built frontend');
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('=====================');
    console.log('1. Check Render frontend environment variables');
    console.log('2. Trigger a fresh Render frontend rebuild');
    console.log('3. Clear browser cache completely');
    console.log('4. Verify the published frontend actually has the correct key');
    
  } catch (error) {
    console.error('\n💥 DIAGNOSTIC ERROR:', error.message);
  }
}

testStripeKeys();
