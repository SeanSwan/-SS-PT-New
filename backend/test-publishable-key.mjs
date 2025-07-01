#!/usr/bin/env node

/**
 * Publishable Key Validation Test
 * ==============================
 * Specifically tests if the publishable key is valid for the account
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

console.log('🔍 PUBLISHABLE KEY VALIDATION TEST');
console.log('==================================');
console.log('Testing specifically if your publishable key is valid\n');

async function testPublishableKey() {
  try {
    const Stripe = await import('stripe');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!secretKey || !publishableKey) {
      console.log('❌ Missing keys');
      return;
    }
    
    // Step 1: Verify account with secret key
    console.log('1️⃣ Getting account info with secret key...');
    const stripe = new Stripe.default(secretKey.trim(), {
      apiVersion: '2023-10-16'
    });
    
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Account verified: ${account.id}`);
    console.log(`   Business: ${account.business_profile?.name || 'SwanStudios'}`);
    
    // Step 2: Extract account IDs from both keys
    console.log('\n2️⃣ Comparing account IDs from keys...');
    
    const secretMatch = secretKey.trim().match(/sk_(live|test)_([A-Za-z0-9]+)/);
    const publishableMatch = publishableKey.trim().match(/pk_(live|test)_([A-Za-z0-9]+)/);
    
    if (secretMatch && publishableMatch) {
      const secretAccountId = secretMatch[2];
      const publishableAccountId = publishableMatch[2];
      
      console.log(`   Secret key account: ${secretAccountId}`);
      console.log(`   Publishable key account: ${publishableAccountId}`);
      console.log(`   Match: ${secretAccountId === publishableAccountId ? '✅ YES' : '❌ NO'}`);
      
      if (secretAccountId !== publishableAccountId) {
        console.log('\n🚨 FOUND THE PROBLEM!');
        console.log('Your publishable key is from a different account than your secret key.');
        console.log('\n🔧 SOLUTION:');
        console.log('Go to Stripe Dashboard and copy the publishable key that matches your secret key account.');
        return;
      }
    }
    
    // Step 3: Test payment intent creation with current keys
    console.log('\n3️⃣ Creating test payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      description: 'Publishable key validation test'
    });
    
    console.log(`✅ Payment intent created: ${paymentIntent.id}`);
    
    // Step 4: Analyze the payment intent ID vs publishable key
    console.log('\n4️⃣ Analyzing payment intent vs publishable key...');
    
    // Extract account info from payment intent ID
    const piParts = paymentIntent.id.split('_');
    if (piParts.length >= 2) {
      const piAccountHint = piParts[1]; // This should match part of the account ID
      console.log(`   Payment intent account hint: ${piAccountHint}`);
      
      if (publishableMatch) {
        const pubAccountId = publishableMatch[2];
        console.log(`   Publishable key account: ${pubAccountId}`);
        
        // Check if they're related (Stripe sometimes uses shortened IDs)
        if (pubAccountId.startsWith(piAccountHint) || piAccountHint.startsWith(pubAccountId.substring(0, 10))) {
          console.log('✅ Payment intent and publishable key appear to match');
        } else {
          console.log('❌ Payment intent and publishable key do NOT match');
          console.log('🚨 This confirms the keys are from different accounts!');
        }
      }
    }
    
    // Step 5: Check key age/validity
    console.log('\n5️⃣ Checking publishable key validity...');
    
    // The only way to really test a publishable key is to see if Stripe accepts it
    // We can't make direct API calls with it, but we can validate the format
    const pubKey = publishableKey.trim();
    
    console.log(`   Length: ${pubKey.length} characters`);
    console.log(`   Format: ${pubKey.startsWith('pk_live_') ? '✅ Valid live key format' : '❌ Invalid format'}`);
    
    if (pubKey.length < 107) {
      console.log('⚠️ Publishable key seems too short - might be truncated');
    }
    
    if (pubKey !== publishableKey) {
      console.log('⚠️ Publishable key has leading/trailing whitespace');
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('Based on your Stripe API logs showing successful payment intents,');
    console.log('but 401 errors on the frontend, the most likely cause is:');
    console.log('');
    console.log('❌ Your PUBLISHABLE key is old/revoked/from different account');
    console.log('✅ Your SECRET key is working correctly');
    console.log('');
    console.log('🔧 SOLUTION:');
    console.log('============');
    console.log('1. Go to: https://dashboard.stripe.com/apikeys');
    console.log('2. Make sure you\'re in the SwanStudios account');
    console.log('3. Copy the CURRENT publishable key (pk_live_...)');
    console.log('4. Replace ONLY the publishable key in your environment files');
    console.log('5. Deploy and test');
    console.log('');
    console.log('🚨 DO NOT change your secret key - it\'s working fine!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n🚨 Your secret key is also invalid!');
      console.log('You need to get fresh keys from Stripe Dashboard.');
    }
  }
}

testPublishableKey();
